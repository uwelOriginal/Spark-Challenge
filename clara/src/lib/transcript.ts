// Used by client and server. Only the speakers the student keeps reach the model.

export type Segment = { speaker: string; start: number; end: number; text: string };

export function mmss(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${String(m).padStart(2, "0")}:${sec}`;
}

export function speakerStats(segments: Segment[]): { speaker: string; seconds: number; share: number }[] {
  const totals = new Map<string, number>();
  for (const s of segments) totals.set(s.speaker, (totals.get(s.speaker) ?? 0) + Math.max(0, s.end - s.start));
  const all = [...totals.values()].reduce((a, b) => a + b, 0) || 1;
  return [...totals.entries()]
    .map(([speaker, seconds]) => ({ speaker, seconds, share: seconds / all }))
    .sort((a, b) => b.seconds - a.seconds);
}

export function transcriptText(segments: Segment[], keep: Set<string>): string {
  return segments
    .filter((s) => keep.has(s.speaker))
    .map((s) => `[${mmss(s.start)}] ${s.text.trim()}`)
    .join("\n");
}

function toSeconds(stamp: string): number {
  const parts = stamp.trim().replace(",", ".").split(":").map(Number);
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

// WebVTT (Teams, Zoom) or SRT. Plain text becomes one segment.
export function parseTranscriptFile(raw: string): Segment[] {
  const text = raw.replace(/\r/g, "").replace(/^\uFEFF/, "");
  const blocks = text.split(/\n{2,}/);
  const out: Segment[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    const timeIdx = lines.findIndex((l) => l.includes("-->"));
    if (timeIdx < 0) continue;
    const [a, b] = lines[timeIdx].split("-->");
    let body = lines.slice(timeIdx + 1).join(" ");
    let speaker = "Voz";
    const v = body.match(/<v\s+([^>]+)>/i);
    if (v) speaker = v[1].trim();
    else {
      const named = body.match(/^([^:]{2,40}):\s+/);
      if (named) {
        speaker = named[1].trim();
        body = body.slice(named[0].length);
      }
    }
    body = body.replace(/<[^>]+>/g, "").trim();
    if (!body) continue;
    const start = toSeconds(a.trim().split(" ")[0]);
    const end = toSeconds(b.trim().split(" ")[0]);
    const last = out[out.length - 1];
    if (last && last.speaker === speaker && start - last.end < 2) {
      last.text += " " + body;
      last.end = end;
    } else out.push({ speaker, start, end, text: body });
  }
  if (out.length === 0 && text.trim()) return [{ speaker: "Voz", start: 0, end: 0, text: text.trim() }];
  return out;
}
