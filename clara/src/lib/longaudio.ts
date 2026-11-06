import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

// 16 kHz mono is what Whisper uses anyway. FLAC keeps a 10-minute part under Groq's 25 MB.

function run(args: string[]): Promise<{ code: number; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error("ffmpeg binary not found"));
    const p = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    p.stderr.on("data", (d) => {
      stderr = (stderr + d.toString()).slice(-20_000);
    });
    p.on("error", reject);
    p.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

export async function durationOf(input: string): Promise<number> {
  const { stderr } = await run(["-hide_banner", "-i", input]);
  const m = stderr.match(/Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/);
  if (!m) throw new Error("could not read duration");
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

export async function cutPart(input: string, start: number, seconds: number, output: string): Promise<void> {
  const { code, stderr } = await run([
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", start.toFixed(2), "-t", seconds.toFixed(2), "-i", input,
    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "flac", output,
  ]);
  if (code !== 0) throw new Error(`ffmpeg failed: ${stderr.slice(-300)}`);
}

// overlap so no word is lost at a cut
export function planParts(duration: number, partSeconds: number, overlap: number): { index: number; start: number; seconds: number; keepFrom: number }[] {
  const parts = [];
  for (let i = 0, keepFrom = 0; keepFrom < duration; i++, keepFrom += partSeconds) {
    const start = Math.max(0, keepFrom - (i === 0 ? 0 : overlap));
    const end = Math.min(duration, keepFrom + partSeconds);
    parts.push({ index: i, start, seconds: end - start, keepFrom });
  }
  return parts;
}
