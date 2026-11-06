import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { TRANSCRIBE_SYSTEM } from "@/prompts";
import { groqStructured, groqTranscribeImage, GROQ_TEXT_MODEL, GROQ_VISION_MODEL, hasGroq, ProviderError } from "./groq";

// Model router. Groq free tier first, Anthropic on a rate limit, an error or a failed check.
// CLARA_ROUTE overrides: "groq", "anthropic" or "groq,anthropic" (default).

const MODEL = process.env.CLARA_MODEL ?? "claude-sonnet-5-5";
const EFFORT = (process.env.CLARA_EFFORT ?? "medium") as "low" | "medium" | "high";

// API retries on a fallback model after a refusal. Not available for Haiku.
const fallback = MODEL.startsWith("claude-haiku")
  ? {}
  : { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const };

export type ClaraErrorCode = "not_configured" | "stt_not_configured" | "busy" | "refused" | "unavailable" | "bad_output";

export class ClaraError extends Error {
  code: ClaraErrorCode;
  retryAfter: number | null; // seconds
  constructor(code: ClaraErrorCode, detail?: string, retryAfter: number | null = null) {
    super(detail ?? code);
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export type Provider = "groq" | "anthropic";
export type RouteMeta = { provider: Provider; model: string; escalated: boolean; tried: string[] };

const hasAnthropic = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

export function routeOrder(): Provider[] {
  const wanted = (process.env.CLARA_ROUTE ?? "groq,anthropic").split(",").map((s) => s.trim());
  return wanted.filter((p): p is Provider => (p === "groq" && hasGroq()) || (p === "anthropic" && hasAnthropic()));
}

// Anthropic

let client: Anthropic | null = null;
function getClient(): Anthropic {
  client ??= new Anthropic();
  return client;
}

function anthropicError(e: unknown): ProviderError | ClaraError {
  if (e instanceof ClaraError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new ProviderError("anthropic", "auth", "auth");
  if (e instanceof Anthropic.RateLimitError) return new ProviderError("anthropic", "rate_limit", "429");
  if (e instanceof Anthropic.APIError) return new ProviderError("anthropic", "unavailable", `status ${e.status}`);
  return new ProviderError("anthropic", "unavailable", e instanceof Error ? e.message : String(e));
}

async function anthropicStructured<S extends z.ZodType>(schema: S, system: string, userText: string): Promise<z.infer<S>> {
  try {
    const response = await getClient().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: userText }],
      output_config: { effort: EFFORT, format: betaZodOutputFormat(schema) },
      ...fallback,
    });
    if (response.stop_reason === "refusal") throw new ClaraError("refused");
    if (response.stop_reason === "max_tokens") throw new ProviderError("anthropic", "bad_output", "max_tokens");
    // validate again, the UI depends on this shape
    const checked = schema.safeParse(response.parsed_output);
    if (!checked.success) throw new ProviderError("anthropic", "bad_output", checked.error.message.slice(0, 200));
    return checked.data;
  } catch (e) {
    throw anthropicError(e);
  }
}

// Router

// `accept` returns null if the answer is fine, or a reason to escalate.
// If all fail the check, return the last answer that parsed.
export async function routeStructured<S extends z.ZodType>(opts: {
  task: string;
  schema: S;
  system: string;
  user: string;
  accept?: (data: z.infer<S>) => string | null;
  // defaults to CLARA_ROUTE
  order?: Provider[];
}): Promise<{ data: z.infer<S>; meta: RouteMeta }> {
  const order = opts.order ? routeOrder().filter((p) => opts.order!.includes(p)) : routeOrder();
  if (order.length === 0) throw new ClaraError("not_configured");
  const tried: string[] = [];
  let lastGood: { data: z.infer<S>; meta: RouteMeta } | null = null;
  let rateLimited = false;
  let retryAfter: number | null = null;

  for (const provider of order) {
    try {
      const data =
        provider === "groq"
          ? await groqStructured(opts.schema, opts.system, opts.user, opts.task)
          : await anthropicStructured(opts.schema, opts.system, opts.user);
      const meta: RouteMeta = { provider, model: provider === "groq" ? GROQ_TEXT_MODEL : MODEL, escalated: tried.length > 0, tried: [...tried] };
      const reason = opts.accept?.(data) ?? null;
      if (!reason) return log(opts.task, { data, meta });
      tried.push(`${provider}:${reason}`);
      lastGood = { data, meta };
    } catch (e) {
      if (e instanceof ClaraError) throw e; // refusals are final
      if (e instanceof ProviderError && e.kind === "rate_limit") {
        rateLimited = true;
        retryAfter = e.retryAfter;
      }
      tried.push(`${provider}:${e instanceof ProviderError ? e.kind : "error"}`);
    }
  }
  if (lastGood) return log(opts.task, { ...lastGood, meta: { ...lastGood.meta, tried } });
  throw new ClaraError(rateLimited ? "busy" : "unavailable", tried.join(", "), retryAfter);
}

function log<T extends { meta: RouteMeta }>(task: string, r: T): T {
  // provider only, never content
  console.info("[clara-route]", task, r.meta.provider, r.meta.model, r.meta.tried.join(" ") || "-");
  return r;
}

// Images and scanned PDFs

type ImageMediaType = "image/png" | "image/jpeg" | "image/gif" | "image/webp";
export const IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/gif", "image/webp"];

// Images try Groq first. PDFs go to Anthropic since Groq can't read them.
export async function transcribe(
  file: { kind: "image"; mediaType: ImageMediaType; base64: string } | { kind: "pdf"; base64: string },
): Promise<string> {
  const order = routeOrder();
  if (file.kind === "image" && order.includes("groq")) {
    try {
      const text = await groqTranscribeImage(TRANSCRIBE_SYSTEM, file.mediaType, file.base64);
      console.info("[clara-route]", "transcribe", "groq", GROQ_VISION_MODEL);
      return text;
    } catch {
      /* try Anthropic */
    }
  }
  if (!order.includes("anthropic")) throw new ClaraError(order.length ? "unavailable" : "not_configured");
  const block: Anthropic.Beta.BetaContentBlockParam =
    file.kind === "image"
      ? { type: "image", source: { type: "base64", media_type: file.mediaType, data: file.base64 } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: file.base64 } };
  try {
    const response = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: TRANSCRIBE_SYSTEM,
      messages: [{ role: "user", content: [block, { type: "text", text: "Transcribe this document." }] }],
      output_config: { effort: "low" },
      ...fallback,
    });
    if (response.stop_reason === "refusal") throw new ClaraError("refused");
    console.info("[clara-route]", "transcribe", "anthropic", MODEL);
    return response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("\n")
      .trim();
  } catch (e) {
    const err = anthropicError(e);
    if (err instanceof ClaraError) throw err;
    throw new ClaraError(err.kind === "rate_limit" ? "busy" : "unavailable", err.message);
  }
}
