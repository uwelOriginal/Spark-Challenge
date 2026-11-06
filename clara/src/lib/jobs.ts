import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { CLASS_EXTRACT_SYSTEM } from "@/prompts";
import { GROQ_STT_MODEL, GROQ_TEXT_MODEL, groqStructured, groqWhisper, hasGroq, ProviderError } from "./groq";
import { fence } from "./guard";
import { ClaraError, routeStructured } from "./llm";
import { cutPart, durationOf, planParts } from "./longaudio";
import { mmss, type Segment } from "./transcript";
import { normalize, quoteFound } from "./verify";

// Long recordings: split with ffmpeg, transcribe parts in parallel, merge, extract coursework
// passages and check each one against its part. Jobs live in memory, so this needs a long-running
// server.

const PART_SECONDS = Number(process.env.CLARA_PART_SECONDS ?? 600);
const OVERLAP_SECONDS = 5;
const CONCURRENCY = Math.max(1, Number(process.env.CLARA_STT_CONCURRENCY ?? 3));
// separate rate limits per model, so we alternate
const WHISPER_MODELS = [...new Set([GROQ_STT_MODEL, "whisper-large-v3", "whisper-large-v3-turbo"])];
const MAX_WAIT_SECONDS = 20 * 60;
// same for extraction
const EXTRACT_MODELS = [...new Set([GROQ_TEXT_MODEL, "openai/gpt-oss-120b", "openai/gpt-oss-20b"])];

export type Passage = { time: string; seconds: number; quote: string; topic: string };
export type AudioJob = {
  id: string;
  fileName: string;
  createdAt: number;
  status: "splitting" | "transcribing" | "extracting" | "done" | "error";
  duration: number;
  parts: number;
  transcribed: number;
  extracted: number;
  waitingUntil: number | null; // epoch ms
  error: string | null;
  transcript: string | null;
  passages: Passage[] | null;
};

const store: Map<string, AudioJob> = ((globalThis as Record<string, unknown>).__claraJobs ??= new Map()) as Map<string, AudioJob>;

export function getJob(id: string): AudioJob | undefined {
  return store.get(id);
}

export function startJob(filePath: string, fileName: string, lang?: string): AudioJob {
  for (const [id, j] of store) if (Date.now() - j.createdAt > 3 * 3600_000) store.delete(id);
  const job: AudioJob = {
    id: crypto.randomUUID(),
    fileName,
    createdAt: Date.now(),
    status: "splitting",
    duration: 0,
    parts: 0,
    transcribed: 0,
    extracted: 0,
    waitingUntil: null,
    error: null,
    transcript: null,
    passages: null,
  };
  store.set(job.id, job);
  void run(job, filePath, lang);
  return job;
}

const ClassPassages = z.object({
  passages: z.array(
    z.object({ time: z.string(), quote: z.string(), topic: z.enum(["deadline", "deliverable", "format", "grading", "change", "exam", "other"]) }),
  ),
});

async function run(job: AudioJob, input: string, lang?: string) {
  const dir = path.dirname(input);
  try {
    job.duration = await durationOf(input);
    const plan = planParts(job.duration, PART_SECONDS, OVERLAP_SECONDS);
    job.parts = plan.length;
    job.status = "transcribing";

    // transcribe, then shift segments onto the class timeline
    const byPart: Segment[][] = new Array(plan.length);
    await pool(plan, CONCURRENCY, async (p) => {
      const out = path.join(dir, `part_${String(p.index).padStart(3, "0")}.flac`);
      await cutPart(input, p.start, p.seconds, out);
      const file = new File([await fs.readFile(out)], path.basename(out), { type: "audio/flac" });
      const { segments } = await whisperWithLimits(job, file, lang);
      byPart[p.index] = segments
        .map((s) => ({ speaker: "class", start: p.start + s.start, end: p.start + s.end, text: s.text }))
        .filter((s) => p.index === 0 || s.start >= p.keepFrom - 0.5); // drop overlap
      await fs.rm(out, { force: true });
      job.transcribed++;
    });
    const asText = (segs: Segment[]) => segs.map((s) => `[${mmss(s.start)}] ${s.text}`).join("\n");
    job.transcript = byPart.map(asText).filter(Boolean).join("\n");

    // extract passages per part
    job.status = "extracting";
    const found: Passage[] = [];
    await pool(byPart.map((segs, i) => ({ i, text: asText(segs) })), CONCURRENCY, async ({ text }) => {
      if (text.trim()) {
        const data = await extractWithLimits(job, `<transcript>\n${fence(text)}\n</transcript>`);
        for (const p of data.passages) {
          if (quoteFound(text, p.quote)) found.push({ ...p, time: p.time.replace(/[[\]]/g, ""), seconds: toSeconds(p.time) });
        }
      }
      job.extracted++;
    });
    const seen = new Set<string>();
    job.passages = found
      .sort((a, b) => a.seconds - b.seconds)
      .filter((p) => {
        const key = normalize(p.quote);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    job.status = "done";
  } catch (e) {
    job.status = "error";
    job.error = e instanceof ClaraError ? e.code : "unavailable";
    console.error("[clara-job]", job.id, e instanceof Error ? e.message.slice(0, 200) : e);
  } finally {
    job.waitingUntil = null;
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

async function whisperWithLimits(job: AudioJob, file: File, lang?: string) {
  let failures = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    const model = WHISPER_MODELS[attempt % WHISPER_MODELS.length];
    try {
      const r = await groqWhisper(file, lang, model);
      job.waitingUntil = null;
      return r;
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "rate_limit") {
        // try the other model, wait only if both are limited
        if ((attempt + 1) % WHISPER_MODELS.length !== 0) continue;
        await waitFor(job, e.retryAfter ?? 60);
        continue;
      }
      if (++failures > 2) throw e;
      await sleep(3000 * failures);
    }
  }
  throw new ClaraError("busy", "rate limit did not clear");
}

// Alternate Groq models, wait when both are limited. Without Groq, use the normal router.
async function extractWithLimits(job: AudioJob, user: string): Promise<z.infer<typeof ClassPassages>> {
  if (!hasGroq()) {
    for (let attempt = 0; attempt < 60; attempt++) {
      try {
        return (await routeStructured({ task: "class-extract", schema: ClassPassages, system: CLASS_EXTRACT_SYSTEM, user })).data;
      } catch (e) {
        if (e instanceof ClaraError && e.code === "busy") {
          await waitFor(job, e.retryAfter ?? 30);
          continue;
        }
        throw e;
      }
    }
    throw new ClaraError("busy", "rate limit did not clear");
  }
  let badOutputs = 0;
  for (let attempt = 0; attempt < 200; attempt++) {
    const model = EXTRACT_MODELS[attempt % EXTRACT_MODELS.length];
    try {
      const r = await groqStructured(ClassPassages, CLASS_EXTRACT_SYSTEM, user, "class_extract", model);
      job.waitingUntil = null;
      return r;
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "rate_limit") {
        if ((attempt + 1) % EXTRACT_MODELS.length !== 0) continue;
        await waitFor(job, e.retryAfter ?? 20);
        continue;
      }
      if (++badOutputs > 2) throw e;
    }
  }
  throw new ClaraError("busy", "rate limit did not clear");
}

async function waitFor(job: AudioJob, seconds: number) {
  const s = Math.min(Math.max(seconds, 2), MAX_WAIT_SECONDS);
  job.waitingUntil = Date.now() + s * 1000;
  await sleep(s * 1000);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pool<T>(items: T[], n: number, fn: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker));
}

function toSeconds(stamp: string): number {
  return stamp
    .replace(/[[\]]/g, "")
    .split(":")
    .map(Number)
    .reduce((acc, x) => acc * 60 + (Number.isFinite(x) ? x : 0), 0);
}
