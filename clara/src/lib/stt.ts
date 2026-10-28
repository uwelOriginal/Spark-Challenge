import { z } from "zod";
import { SPEAKERS_SYSTEM } from "@/prompts";
import { groqWhisper, hasGroq, ProviderError } from "./groq";
import { ClaraError, routeStructured } from "./llm";
import type { Segment } from "./transcript";

// Speech to text, cheapest first. The rest of the app only sees Segment[].
//  - groq:       Whisper large v3 (free tier). No speaker separation, so an LLM estimates which
//                segments are the professor from what is said ("estimated"); the student confirms.
//  - elevenlabs: Scribe v2 with acoustic speaker separation ("acoustic"). Optional, only with a key.
// CLARA_STT sets the order (default "groq,elevenlabs").

export type Diarization = "acoustic" | "estimated" | "none";

export async function transcribeAudio(file: File, lang?: string): Promise<{ segments: Segment[]; language: string | null; diarization: Diarization }> {
  const order = (process.env.CLARA_STT ?? "groq,elevenlabs")
    .split(",")
    .map((s) => s.trim())
    .filter((p) => (p === "groq" && hasGroq()) || (p === "elevenlabs" && Boolean(process.env.ELEVENLABS_API_KEY)));
  if (order.length === 0) throw new ClaraError("stt_not_configured");

  let rateLimited = false;
  for (const provider of order) {
    try {
      if (provider === "elevenlabs") return await elevenlabs(file);
      const { segments, language } = await groqWhisper(file, lang);
      console.info("[clara-route]", "stt", "groq", segments.length, "segments");
      return { ...(await estimateSpeakers(segments)), language };
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "rate_limit") rateLimited = true;
      console.error("[clara-route]", "stt", provider, e instanceof Error ? e.message.slice(0, 120) : "");
    }
  }
  throw new ClaraError(rateLimited ? "busy" : "unavailable", "stt");
}

const SpeakerLabels = z.object({ labels: z.array(z.object({ i: z.number(), role: z.enum(["instructor", "other"]) })) });

/** Label Whisper segments as the professor or other voices from their content (cheap model). */
async function estimateSpeakers(raw: { start: number; end: number; text: string }[]): Promise<{ segments: Segment[]; diarization: Diarization }> {
  if (raw.length === 0) return { segments: [], diarization: "none" };
  try {
    const { data } = await routeStructured({
      task: "speakers",
      schema: SpeakerLabels,
      system: SPEAKERS_SYSTEM,
      user: raw.map((s, i) => `${i}: ${s.text}`).join("\n"),
    });
    const role = new Map(data.labels.map((l) => [l.i, l.role]));
    return { segments: raw.map((s, i) => ({ ...s, speaker: role.get(i) ?? "instructor" })), diarization: "estimated" };
  } catch {
    return { segments: raw.map((s) => ({ ...s, speaker: "instructor" })), diarization: "none" };
  }
}

type ScribeWord = { text: string; start: number; end: number; type: string; speaker_id?: string };

async function elevenlabs(file: File): Promise<{ segments: Segment[]; language: string | null; diarization: Diarization }> {
  const form = new FormData();
  form.append("file", file, file.name || "clase.webm");
  form.append("model_id", process.env.CLARA_STT_MODEL ?? "scribe_v2");
  form.append("diarize", "true");
  form.append("timestamps_granularity", "word");
  form.append("tag_audio_events", "false");
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY ?? "" },
    body: form,
  });
  if (res.status === 429) throw new ProviderError("elevenlabs", "rate_limit", "429");
  if (!res.ok) throw new ProviderError("elevenlabs", "unavailable", String(res.status));
  const data = (await res.json()) as { language_code?: string; words?: ScribeWord[] };
  console.info("[clara-route]", "stt", "elevenlabs");
  return { segments: groupWords(data.words ?? []), language: data.language_code ?? null, diarization: "acoustic" };
}

/** Group words into segments: a new segment when the speaker changes or after a 2 s pause. */
function groupWords(words: ScribeWord[]): Segment[] {
  const out: Segment[] = [];
  for (const w of words) {
    if (w.type === "audio_event") continue;
    const speaker = w.speaker_id ?? "speaker_0";
    const last = out[out.length - 1];
    if (w.type === "spacing") {
      if (last) last.text += w.text;
      continue;
    }
    if (last && last.speaker === speaker && w.start - last.end < 2) {
      last.text += w.text;
      last.end = w.end;
    } else {
      out.push({ speaker, start: w.start, end: w.end, text: w.text });
    }
  }
  return out.map((s) => ({ ...s, text: s.text.replace(/\s+/g, " ").trim() })).filter((s) => s.text);
}
