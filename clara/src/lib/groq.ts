import { z } from "zod";

// Groq (OpenAI-compatible API, generous free tier). Plain fetch: no extra SDK.
// Text with strict JSON schema: openai/gpt-oss-120b. Images: qwen/qwen3.8-27b. Audio: Whisper.

const BASE = "https://api.groq.com/openai/v1";
export const GROQ_TEXT_MODEL = process.env.CLARA_GROQ_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_VISION_MODEL = process.env.CLARA_GROQ_VISION_MODEL ?? "qwen/qwen3.8-27b";
export const GROQ_STT_MODEL = process.env.CLARA_GROQ_STT_MODEL ?? "whisper-large-v3";

export const hasGroq = () => Boolean(process.env.GROQ_API_KEY);

/** Thrown for any Groq failure; `retryable` tells the router to try the next provider. */
export class ProviderError extends Error {
  provider: string;
  kind: "rate_limit" | "unavailable" | "bad_output" | "auth";
  retryAfter: number | null; // seconds, from the provider's retry-after header on a 429
  constructor(provider: string, kind: ProviderError["kind"], detail: string, retryAfter: number | null = null) {
    super(`${provider} ${kind}: ${detail}`);
    this.provider = provider;
    this.kind = kind;
    this.retryAfter = retryAfter;
  }
}

async function call(path: string, init: RequestInit): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(45_000),
    });
  } catch (e) {
    throw new ProviderError("groq", "unavailable", e instanceof Error ? e.message : String(e));
  }
  if (res.status === 429) {
    const after = Number(res.headers.get("retry-after"));
    throw new ProviderError("groq", "rate_limit", "429", Number.isFinite(after) && after > 0 ? after : null);
  }
  if (res.status === 401 || res.status === 403) throw new ProviderError("groq", "auth", String(res.status));
  if (!res.ok) throw new ProviderError("groq", "unavailable", `${res.status} ${(await res.text()).slice(0, 200)}`);
  return res;
}

/**
 * Zod -> JSON Schema in the shape Groq's strict mode accepts:
 * every object closed and fully required, nullable fields as type unions.
 */
export function strictJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema) as Record<string, unknown>;
  const fix = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(fix);
    if (!node || typeof node !== "object") return node;
    const n = { ...(node as Record<string, unknown>) };
    delete n.$schema;
    // anyOf [{type: X}, {type: "null"}] -> {type: [X, "null"]}
    if (Array.isArray(n.anyOf) && n.anyOf.length === 2) {
      const [a, b] = n.anyOf as Record<string, unknown>[];
      const other = a.type === "null" ? b : b.type === "null" ? a : null;
      if (other && typeof other.type === "string" && Object.keys(other).length === 1) {
        delete n.anyOf;
        n.type = [other.type, "null"];
      }
    }
    if (n.type === "object" && n.properties && typeof n.properties === "object") {
      n.additionalProperties = false;
      n.required = Object.keys(n.properties as object);
    }
    for (const k of Object.keys(n)) n[k] = fix(n[k]);
    return n;
  };
  return fix(raw) as Record<string, unknown>;
}

/** Chat completion constrained to `schema` (strict mode). Returns the validated object. */
export async function groqStructured<S extends z.ZodType>(schema: S, system: string, user: string, name: string, model = GROQ_TEXT_MODEL): Promise<z.infer<S>> {
  const res = await call("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_schema", json_schema: { name, strict: true, schema: strictJsonSchema(schema) } },
      reasoning_effort: "medium",
      max_completion_tokens: 8000,
    }),
  });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new ProviderError("groq", "bad_output", "invalid JSON");
  }
  const checked = schema.safeParse(parsed);
  if (!checked.success) throw new ProviderError("groq", "bad_output", checked.error.message.slice(0, 200));
  return checked.data;
}

/** Read the text in an image (OCR) with Groq's vision model. */
export async function groqTranscribeImage(system: string, mediaType: string, base64: string): Promise<string> {
  const res = await call("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: "Transcribe this document." },
            { type: "image_url", image_url: { url: `data:${mediaType};base64,${base64}` } },
          ],
        },
      ],
      temperature: 0,
      max_completion_tokens: 6000,
    }),
  });
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = (data.choices?.[0]?.message?.content ?? "").replace(/<think>[\s\S]*?<\/think>/g, "").trim();
  if (!text) throw new ProviderError("groq", "bad_output", "empty transcription");
  return text;
}

export type WhisperSegment = { start: number; end: number; text: string };

/** Speech to text with Whisper. Returns timed segments (Whisper does not separate speakers). */
export async function groqWhisper(file: File, language?: string, model = GROQ_STT_MODEL): Promise<{ segments: WhisperSegment[]; language: string | null }> {
  const form = new FormData();
  form.append("file", file, file.name || "clase.webm");
  form.append("model", model);
  form.append("response_format", "verbose_json");
  form.append("timestamp_granularities[]", "segment");
  form.append("temperature", "0");
  if (language) form.append("language", language);
  const res = await call("/audio/transcriptions", { method: "POST", body: form });
  const data = (await res.json()) as { language?: string; segments?: WhisperSegment[]; text?: string };
  const segments = (data.segments ?? []).map((s) => ({ start: s.start, end: s.end, text: s.text.trim() })).filter((s) => s.text);
  if (segments.length === 0 && data.text) segments.push({ start: 0, end: 0, text: data.text.trim() });
  return { segments, language: data.language ?? null };
}
