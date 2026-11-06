import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { errorResponse, guard, json } from "@/lib/guard";
import { hasGroq } from "@/lib/groq";
import { ClaraError } from "@/lib/llm";
import { startJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = Number(process.env.CLARA_MAX_LONG_AUDIO_MB ?? 600) * 1024 * 1024;

// POST raw audio (x-file-name, x-lang) -> { id }
// Long recordings need a long-running server, serverless limits are too low.
// Streams to a temp folder, the job deletes it at the end.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  if (!hasGroq()) return errorResponse(new ClaraError("stt_not_configured"));
  if (!req.body) return json({ error: "bad_request" }, 400);

  const name = decodeURIComponent(req.headers.get("x-file-name") ?? "clase").replace(/[^\w.\- ]+/g, "_").slice(0, 80) || "clase";
  const lang = req.headers.get("x-lang") === "en" ? "en" : req.headers.get("x-lang") === "es" ? "es" : undefined;
  const dir = path.join(os.tmpdir(), "clara-jobs", crypto.randomUUID());
  await fsp.mkdir(dir, { recursive: true });
  const target = path.join(dir, `input${path.extname(name) || ".audio"}`);

  let written = 0;
  try {
    const out = fs.createWriteStream(target);
    const reader = req.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      written += value.byteLength;
      if (written > MAX_BYTES) {
        out.destroy();
        await fsp.rm(dir, { recursive: true, force: true });
        return json({ error: "file_too_big" }, 400);
      }
      if (!out.write(value)) await new Promise((r) => out.once("drain", r));
    }
    await new Promise<void>((resolve, reject) => out.end((err?: Error | null) => (err ? reject(err) : resolve())));
  } catch {
    await fsp.rm(dir, { recursive: true, force: true });
    return json({ error: "bad_request" }, 400);
  }
  if (written === 0) {
    await fsp.rm(dir, { recursive: true, force: true });
    return json({ error: "bad_request" }, 400);
  }

  const job = startJob(target, name, lang);
  return json({ id: job.id });
}
