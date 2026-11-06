import { ClaraError } from "./llm";

// Basic protection for a public URL.

// maxAudioBytes is Groq's free-tier limit
export const LIMITS = { minChars: 40, maxChars: 60_000, maxFileBytes: 8 * 1024 * 1024, maxAudioBytes: 25 * 1024 * 1024 };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 30;
const recentByIp = new Map<string, number[]>(); // resets on restart

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

// returns a Response to reject, null to continue
export function guard(req: Request, opts: { rateLimit?: boolean } = {}): Response | null {
  const code = process.env.CLARA_ACCESS_CODE;
  if (code && req.headers.get("x-clara-code") !== code) {
    return json({ error: "access_code_required" }, 401);
  }
  if (opts.rateLimit === false) return null; // e.g. polling

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();
  const recent = (recentByIp.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_REQUESTS) return json({ error: "busy" }, 429);
  recent.push(now);
  recentByIp.set(ip, recent);
  return null;
}

// stops document text from closing our tags
export function fence(text: string): string {
  return text.replace(/<\/?(document|before|after|source|assignment|interest|student_profile|conversation|decoded_summary)\b[^>]*>/gi, (m) => m.replace("<", "< "));
}

export function readSources(raw: unknown): { id: string; kind: SourceKindName; name: string; text: string; date?: string }[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 8) return null;
  const kinds = ["brief", "rubric", "class", "announcement", "other"] as const;
  const out = [];
  let total = 0;
  for (const s of raw) {
    if (!s || typeof s !== "object") return null;
    const { id, kind, name, text, date } = s as Record<string, unknown>;
    if (typeof id !== "string" || !/^S\d{1,2}$/.test(id)) return null;
    if (typeof text !== "string" || text.trim().length === 0) return null;
    const k = kinds.includes(kind as SourceKindName) ? (kind as SourceKindName) : "other";
    total += text.length;
    out.push({ id, kind: k, name: typeof name === "string" ? name.slice(0, 80) : id, text: text.trim(), ...(typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date) ? { date } : {}) });
  }
  if (total < LIMITS.minChars || total > LIMITS.maxChars) return null;
  return out;
}

type SourceKindName = "brief" | "rubric" | "class" | "announcement" | "other";

export function errorResponse(e: unknown): Response {
  const code = e instanceof ClaraError ? e.code : "unavailable";
  if (!(e instanceof ClaraError) || code === "unavailable" || code === "bad_output") {
    // never log the document
    console.error("[clara]", code, e instanceof Error ? e.message.slice(0, 200) : "");
  }
  const status = { not_configured: 503, stt_not_configured: 503, busy: 429, refused: 422, unavailable: 502, bad_output: 502 }[code];
  return json({ error: code }, status);
}
