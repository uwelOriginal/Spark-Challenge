import { CHAT_SYSTEM, sourcesBlock } from "@/prompts";
import { outputLanguage } from "@/lib/dialects";
import { errorResponse, fence, guard, json, readSources } from "@/lib/guard";
import { routeStructured } from "@/lib/llm";
import { ChatSchema } from "@/lib/schemas";
import { checkChat } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

type Turn = { role: "user" | "assistant"; text: string };

// POST { sources, summary, history: [{role, text}], message, lang, dialect?, profile? } -> grounded answer with checked citations.
// `profile` (personal.ts profileFor) lets Clara explain through the student's interest and propose settings.
// An answer citing a sentence that is not in the sources is escalated to the next model.
// The chat history lives on the student's device; the server keeps nothing.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { sources?: unknown; summary?: unknown; history?: unknown; message?: unknown; lang?: unknown; dialect?: unknown; profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const sources = readSources(body.sources);
  if (!sources) return json({ error: "bad_sources" }, 400);
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 2000) : "";
  if (!message) return json({ error: "bad_request" }, 400);
  const summary = typeof body.summary === "string" ? body.summary.slice(0, 4000) : "";
  const history: Turn[] = Array.isArray(body.history)
    ? (body.history as Turn[])
        .filter((t) => (t?.role === "user" || t?.role === "assistant") && typeof t.text === "string")
        .slice(-10)
        .map((t) => ({ role: t.role, text: t.text.slice(0, 2000) }))
    : [];

  const profile = readProfile(body.profile);
  const conversation = history.map((t) => `${t.role === "user" ? "Student" : "Clara"}: ${t.text}`).join("\n");
  try {
    const { data, meta } = await routeStructured({
      task: "chat",
      schema: ChatSchema,
      system: CHAT_SYSTEM,
      user: `Output language: ${outputLanguage(body.lang, body.dialect)}.\n\n${sourcesBlock(sources, fence)}\n\n<decoded_summary>\n${fence(summary)}\n</decoded_summary>\n\n<student_profile>\n${fence(profile)}\n</student_profile>\n\n<conversation>\n${fence(conversation)}\n</conversation>\n\nStudent's new question: ${fence(message)}`,
      accept: (c) => (checkChat(sources, c).citations.every((x) => x.verified) ? null : "unverified_citation"),
    });
    return json({ ...checkChat(sources, data), _route: meta });
  } catch (e) {
    return errorResponse(e);
  }
}

const PROFILE_KEYS = ["theme", "accent", "font", "text_size", "control_size", "spacing", "layout", "motion", "pack"];

/** Only short known fields reach the prompt: the interest is free text, so it is capped and fenced. */
function readProfile(raw: unknown): string {
  const p = (raw && typeof raw === "object" ? raw : {}) as { interest?: unknown; depth?: unknown; current?: Record<string, unknown> };
  const interest = typeof p.interest === "string" ? p.interest.trim().slice(0, 80) : "";
  const depth = p.depth === "light" || p.depth === "full" ? p.depth : "off";
  const current = PROFILE_KEYS.map((k) => {
    const v = p.current?.[k];
    return typeof v === "string" && /^[a-z]{1,12}$/.test(v) ? `${k}: ${v}` : null;
  }).filter(Boolean);
  return [`Interest: ${interest || "(none)"}`, `Depth: ${interest ? depth : "off"}`, `Current settings: ${current.join(", ") || "(unknown)"}`].join("\n");
}
