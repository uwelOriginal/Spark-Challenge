import type {
  Changes,
  ChangesResult,
  Chat,
  ChatResult,
  DateCheck,
  Decode,
  DecodeResult,
  SourceInput,
} from "./schemas";
import { resolveRelative } from "./dates.ts";

// Quote verification: the model must back each claim with a verbatim excerpt.
// We check it in code, so the student sees which claims are traceable to their sources.

export function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/\[\d{1,2}:\d{2}(?::\d{2})?\]/g, " ") // ignore transcript time marks
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„‟″«»]/g, '"')
    .replace(/[‐-―−]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteFound(source: string, quote: string | null): boolean {
  if (!quote) return false;
  const src = normalize(source);
  const q = normalize(quote)
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.,;:]+$/, "")
    .trim();
  if (q.length < 3) return false;
  if (src.includes(q)) return true;

  // Allow an elided quote ("first part ... last part") if every part appears in order.
  const parts = q.split(/\s*\.\.\.\s*/).filter((p) => p.length >= 3);
  if (parts.length < 2) return false;
  let from = 0;
  for (const part of parts) {
    const at = src.indexOf(part, from);
    if (at < 0) return false;
    from = at + part.length;
  }
  return true;
}

/** A quote counts as verified only if it appears in the source it claims to come from. */
function inSource(sources: SourceInput[], sourceId: string | null, quote: string | null): boolean {
  const s = sources.find((x) => x.id === sourceId);
  return !!s && quoteFound(s.text, quote);
}

const WEEKDAYS: Record<string, number> = {
  domingo: 0, lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6,
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
};

/** If the text names a weekday, it must match the weekday of the model's YYYY-MM-DD date. */
export function checkDate(when: string, date: string | null): DateCheck {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return "none";
  const [y, m, d] = date.split("-").map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const named = Object.entries(WEEKDAYS).find(([name]) => new RegExp(`\\b${name}\\b`, "i").test(when));
  if (!named) return "unchecked";
  return named[1] === weekday ? "ok" : "mismatch";
}

/** Dates from relative words are computed here, from the day the source was said or written. */
export function resolveDeadlineDate<T extends { when: string; date: string | null; quote: string | null; source_id: string | null }>(x: T, sources: SourceInput[], today: string): T & { date_computed?: boolean } {
  const ref = sources.find((s) => s.id === x.source_id)?.date ?? today;
  const fromWhen = resolveRelative(x.when, ref);
  if (fromWhen) return { ...x, date: fromWhen, date_computed: true };
  const fromQuote = resolveRelative(x.quote, ref);
  // A date with no number behind it can only have been worked out, so the student is asked to confirm it.
  if (!fromQuote) return x.date && !/\d/.test(`${x.when} ${x.quote}`) ? { ...x, date_computed: true } : x;
  if (!x.date || x.date === fromQuote) return { ...x, date: fromQuote, date_computed: true };
  // The model chose another day. With no number in sight it can only have got the arithmetic wrong;
  // with one ("mañana les digo, es para el 13") the model read an actual date, so it stands.
  return /\d/.test(`${x.when} ${x.quote}`) ? x : { ...x, date: fromQuote, date_computed: true };
}

export function checkDecode(sources: SourceInput[], d: Decode, today = new Date().toISOString().slice(0, 10)): DecodeResult {
  const mark = <T extends { quote: string | null; source_id: string | null }>(items: T[]) =>
    items.map((it) => ({ ...it, verified: it.quote === null ? true : inSource(sources, it.source_id, it.quote) }));

  const result: DecodeResult = {
    ...d,
    deliverables: mark(d.deliverables),
    deadlines: mark(d.deadlines).map((x) => resolveDeadlineDate(x, sources, today)).map((x) => ({ ...x, date_check: checkDate(x.when, x.date) })),
    format_requirements: mark(d.format_requirements),
    grading_criteria: mark(d.grading_criteria),
    ambiguities: mark(d.ambiguities),
    quote_check: { verified: 0, total: 0 },
  };

  const quoted = [
    ...result.deliverables,
    ...result.deadlines,
    ...result.format_requirements,
    ...result.grading_criteria,
    ...result.ambiguities.filter((a) => a.quote !== null),
  ];
  result.quote_check = { verified: quoted.filter((q) => q.verified).length, total: quoted.length };
  return result;
}

export function checkChanges(before: string, after: string, c: Changes): ChangesResult {
  return {
    ...c,
    changes: c.changes.map((ch) => ({
      ...ch,
      verified:
        (ch.before_quote === null || quoteFound(before, ch.before_quote)) &&
        (ch.after_quote === null || quoteFound(after, ch.after_quote)),
    })),
  };
}

export function checkChat(sources: SourceInput[], c: Chat): ChatResult {
  return { ...c, citations: c.citations.map((x) => ({ ...x, verified: inSource(sources, x.source_id, x.quote) })) };
}
