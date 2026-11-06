import { THEME_SYSTEM } from "@/prompts";
import { outputLanguage } from "@/lib/dialects";
import { errorResponse, fence, guard, json } from "@/lib/guard";
import { routeStructured } from "@/lib/llm";
import { PACK_IDS, sanitizeTheme, themeProblems, type Depth } from "@/lib/personal";
import { ThemeSchema } from "@/lib/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  assignment?: {
    title?: unknown;
    summary?: unknown;
    steps?: unknown;
    deadlines?: unknown;
    deliverables?: unknown;
    grading?: unknown;
    vague?: unknown;
  };
  interest?: unknown;
  pack?: unknown;
  depth?: unknown;
  lang?: unknown;
  dialect?: unknown;
};

const strings = (x: unknown, max: number, len = 300): string[] =>
  Array.isArray(x) ? x.filter((s): s is string => typeof s === "string").slice(0, max).map((s) => s.slice(0, len)) : [];

// POST { assignment, interest, pack, depth, lang, dialect? } -> themed layer.
// Uses the checked decode, not the raw sources. Themes that lose steps or invent dates get rejected.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const a = body.assignment ?? {};
  const interest = typeof body.interest === "string" ? body.interest.trim().slice(0, 80) : "";
  const depth: Depth | null = body.depth === "light" || body.depth === "full" ? body.depth : null;
  const steps = Array.isArray(a.steps)
    ? a.steps.slice(0, 8).flatMap((s) => (s && typeof s.action === "string" ? [{ action: s.action.slice(0, 300), minutes: Number(s.minutes) || null, done_when: String(s.done_when ?? "").slice(0, 300) }] : []))
    : [];
  const deadlines = Array.isArray(a.deadlines)
    ? a.deadlines.slice(0, 12).flatMap((d) => (d && typeof d.item === "string" ? [{ item: d.item.slice(0, 200), when: String(d.when ?? "").slice(0, 120) }] : []))
    : [];
  if (!interest || !depth || steps.length === 0 || typeof a.title !== "string") return json({ error: "bad_request" }, 400);
  const pack = (PACK_IDS as readonly string[]).includes(body.pack as string) ? (body.pack as string) : "auto";

  const assignment = {
    title: a.title.slice(0, 200),
    summary: strings(a.summary, 4),
    steps: steps.map((s, i) => ({ index: i, ...s })),
    deadlines: deadlines.map((d, i) => ({ index: i, ...d })),
    deliverables: strings(a.deliverables, 8),
    grading_criteria: strings(a.grading, 8),
    vague_terms: strings(a.vague, 6),
  };
  const facts = JSON.stringify(assignment);

  try {
    const { data, meta } = await routeStructured({
      task: "theme",
      schema: ThemeSchema,
      system: THEME_SYSTEM,
      user: [
        `Output language: ${outputLanguage(body.lang, body.dialect)}.`,
        `Depth: ${depth}.`,
        pack === "auto" || pack === "generic"
          ? `Picture pack: ${pack === "auto" ? "choose the best one for the interest" : "generic"}.`
          : `Theme: ${pack}. The student chose this theme: build every name, group, analogy and figure around ${pack}, even if the interest text below names something else; use the interest text only for details that fit ${pack}. Set "pack" to ${pack}.`,
        `<interest>\n${fence(interest)}\n</interest>`,
        `<assignment>\n${fence(JSON.stringify(assignment, null, 1))}\n</assignment>`,
      ].join("\n\n"),
      accept: (t) => themeProblems(t, steps.length, deadlines.length, depth, facts)[0] ?? null,
    });
    const theme = sanitizeTheme(data, steps.length, deadlines.length, depth);
    return json({ ...theme, pack: pack === "auto" ? theme.pack : pack, _route: meta });
  } catch (e) {
    return errorResponse(e);
  }
}
