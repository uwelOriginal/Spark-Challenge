import { DECODE_SYSTEM, sourcesBlock } from "@/prompts";
import { outputLanguage } from "@/lib/dialects";
import { errorResponse, fence, guard, json, readSources } from "@/lib/guard";
import { routeStructured } from "@/lib/llm";
import { DecodeSchema } from "@/lib/schemas";
import { checkDecode } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

// share of quotes that must be found verbatim
const MIN_VERIFIED = 0.85;

// POST { sources, lang, dialect?, today } -> decoded assignment.
// Too few verified quotes escalates to the next model.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { sources?: unknown; lang?: unknown; dialect?: unknown; today?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const sources = readSources(body.sources);
  if (!sources) return json({ error: "bad_sources" }, 400);
  const today = typeof body.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today) ? body.today : new Date().toISOString().slice(0, 10);

  try {
    const { data, meta } = await routeStructured({
      task: "decode",
      schema: DecodeSchema,
      system: DECODE_SYSTEM,
      user: `Output language: ${outputLanguage(body.lang, body.dialect)}. Today's date: ${today}.\n\n${sourcesBlock(sources, fence)}`,
      accept: (d) => {
        if (d.not_an_assignment) return null;
        const { verified, total } = checkDecode(sources, d, today).quote_check;
        if (total === 0) return "no_quotes";
        return verified / total >= MIN_VERIFIED ? null : `quotes_${verified}/${total}`;
      },
    });
    return json({ ...checkDecode(sources, data, today), _route: meta });
  } catch (e) {
    return errorResponse(e);
  }
}
