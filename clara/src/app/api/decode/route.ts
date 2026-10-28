import { DECODE_SYSTEM, LANGUAGE_NAME, sourcesBlock } from "@/prompts";
import { errorResponse, fence, guard, json, readSources } from "@/lib/guard";
import { routeStructured } from "@/lib/llm";
import { DecodeSchema, type Lang } from "@/lib/schemas";
import { checkDecode } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

// Minimum share of quotes found word for word before an answer is accepted from the free tier.
const MIN_VERIFIED = 0.85;

// POST { sources: [{id, kind, name, text}], lang, today } -> decoded assignment.
// Every quote is checked against the source it claims to come from; answers that fail the
// check are escalated to the next model. Nothing is stored.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { sources?: unknown; lang?: unknown; today?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const sources = readSources(body.sources);
  if (!sources) return json({ error: "bad_sources" }, 400);
  const lang: Lang = body.lang === "en" ? "en" : "es";
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);

  try {
    const { data, meta } = await routeStructured({
      task: "decode",
      schema: DecodeSchema,
      system: DECODE_SYSTEM,
      user: `Output language: ${LANGUAGE_NAME[lang]}. Today's date: ${today}.\n\n${sourcesBlock(sources, fence)}`,
      accept: (d) => {
        if (d.not_an_assignment) return null;
        const { verified, total } = checkDecode(sources, d).quote_check;
        if (total === 0) return "no_quotes";
        return verified / total >= MIN_VERIFIED ? null : `quotes_${verified}/${total}`;
      },
    });
    return json({ ...checkDecode(sources, data), _route: meta });
  } catch (e) {
    return errorResponse(e);
  }
}
