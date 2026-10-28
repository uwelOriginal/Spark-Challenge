import { CHANGES_SYSTEM, LANGUAGE_NAME } from "@/prompts";
import { errorResponse, fence, guard, json, LIMITS } from "@/lib/guard";
import { routeStructured } from "@/lib/llm";
import { ChangesSchema, type Lang } from "@/lib/schemas";
import { checkChanges } from "@/lib/verify";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST { before, after, lang } -> what changed, what to do, what stays the same.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: { before?: unknown; after?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const before = typeof body.before === "string" ? body.before.trim() : "";
  const after = typeof body.after === "string" ? body.after.trim() : "";
  const lang: Lang = body.lang === "en" ? "en" : "es";
  for (const t of [before, after]) {
    if (t.length < LIMITS.minChars) return json({ error: "too_short" }, 400);
    if (t.length > LIMITS.maxChars) return json({ error: "too_long" }, 400);
  }

  try {
    const { data, meta } = await routeStructured({
      task: "changes",
      schema: ChangesSchema,
      system: CHANGES_SYSTEM,
      user: `Output language: ${LANGUAGE_NAME[lang]}.\n\n<before>\n${fence(before)}\n</before>\n\n<after>\n${fence(after)}\n</after>`,
      accept: (c) => {
        const checked = checkChanges(before, after, c).changes;
        if (checked.length === 0) return null;
        return checked.filter((x) => x.verified).length / checked.length >= 0.8 ? null : "unverified_quotes";
      },
    });
    return json({ ...checkChanges(before, after, data), _route: meta });
  } catch (e) {
    return errorResponse(e);
  }
}
