import { ClaraError } from "./llm";

// Cheap protections for a public demo URL: optional access code, per-IP rate limit, size limits.

// maxAudioBytes matches Groq's free-tier file limit (25 MB); a 10-minute phone recording is far below it.
export const LIMITS = { minChars: 40, maxChars: 60_000, maxFileBytes: 8 * 1024 * 1024, maxAudioBytes: 25 * 1024 * 1024 };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const recentByIp = new Map<string, number[]>(); // best effort: resets when the server restarts

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

/** Returns a Response if the request must be rejected, otherwise null. */
export function guard(req: Request, opts: { rateLimit?: boolean } = {}): Response | null {
  const code = process.env.CLARA_ACCESS_CODE;
  if (code && req.headers.get("x-clara-code") !== code) {
    return json({ error: "access_code_required" }, 401);
  }
  if (opts.rateLimit === false) return null; // e.g. progress polling, which calls no AI

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return json({ error: "busy" }, 429);
  recent.push(now);
  recentByIp.set(ip, recent);
  return null;
}

/** Keep document text from closing our tags early. */
export function fence(text: string): string {
  return text.replace(/<\/?(document|before|after|source|assignment|interest|student_profile|conversation|decoded_summary)\b[^>]*>/gi, (m) => m.replace("<", "< "));
}

/** Validate a list of sources from a request body. Returns null if invalid. */
export function readSources(raw: unknown): { id: string; kind: SourceKindName; name: string; text: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 8) return null;
  const kinds = ["brief", "rubric", "class", "announcement", "other"] as const;
  const out = [];
  let total = 0;
  for (const s of raw) {
    if (!s || typeof s !== "object") return null;
    const { id, kind, name, text } = s as Record<string, unknown>;
    if (typeof id !== "string" || !/^S\d{1,2}$/.test(id)) return null;
    if (typeof text !== "string" || text.trim().length === 0) return null;
    const k = kinds.includes(kind as SourceKindName) ? (kind as SourceKindName) : "other";
    total += text.length;
    out.push({ id, kind: k, name: typeof name === "string" ? name.slice(0, 80) : id, text: text.trim() });
  }
  if (total < LIMITS.minChars || total > LIMITS.maxChars) return null;
  return out;
}

type SourceKindName = "brief" | "rubric" | "class" | "announcement" | "other";

export function errorResponse(e: unknown): Response {
  const code = e instanceof ClaraError ? e.code : "unavailable";
  if (!(e instanceof ClaraError) || code === "unavailable" || code === "bad_output") {
    // Log the failure kind only: never log the student's document.
    console.error("[clara]", code, e instanceof Error ? e.message.slice(0, 200) : "");
  }
  const status = { not_configured: 503, stt_not_configured: 503, busy: 429, refused: 422, unavailable: 502, bad_output: 502 }[code];
  return json({ error: code }, status);
}
