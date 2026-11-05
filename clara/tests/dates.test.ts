import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveRelative } from "../src/lib/dates.ts";
import { resolveDeadlineDate } from "../src/lib/verify.ts";
import { plannedNotifications, planEvents } from "../src/lib/calendar.ts";
import { DEFAULT_SETTINGS, type Assignment } from "../src/lib/store.ts";
import { STRINGS } from "../src/lib/i18n.ts";

const WED = "2026-11-04"; // a Wednesday

test("mañana is tomorrow", () => assert.equal(resolveRelative("mañana", WED), "2026-11-05"));
test("tarea para mañana", () => assert.equal(resolveRelative("Hay tarea para mañana", WED), "2026-11-05"));
test("tomorrow", () => assert.equal(resolveRelative("due tomorrow", WED), "2026-11-05"));
test("mañana in the morning is still tomorrow", () => assert.equal(resolveRelative("mañana por la mañana", WED), "2026-11-05"));
test("la mañana is not tomorrow", () => assert.equal(resolveRelative("por la mañana", WED), null));
test("esta mañana is not tomorrow", () => assert.equal(resolveRelative("lo dijo esta mañana", WED), null));
test("pasado mañana", () => assert.equal(resolveRelative("pasado mañana", WED), "2026-11-06"));
test("hoy", () => assert.equal(resolveRelative("hoy a las 8", WED), WED));
test("en 3 días", () => assert.equal(resolveRelative("en 3 días", WED), "2026-11-07"));
test("en tres días", () => assert.equal(resolveRelative("en tres días", WED), "2026-11-07"));
test("in two days", () => assert.equal(resolveRelative("in two days", WED), "2026-11-06"));
test("bare weekday is the next one", () => assert.equal(resolveRelative("el viernes", WED), "2026-11-06"));
test("today's weekday means next week", () => assert.equal(resolveRelative("el miércoles", WED), "2026-11-11"));
test("accentless weekday", () => assert.equal(resolveRelative("el sabado", WED), "2026-11-07"));
test("month rollover", () => assert.equal(resolveRelative("mañana", "2026-12-31"), "2027-01-01"));
test("an explicit date is not relative", () => assert.equal(resolveRelative("viernes 13 de noviembre", WED), null));
test("an explicit English date is not relative", () => assert.equal(resolveRelative("Friday, November 13", WED), null));
test("next week names no single day", () => assert.equal(resolveRelative("la próxima semana", WED), null));
test("pronto names no single day", () => assert.equal(resolveRelative("pronto", WED), null));
test("every Friday names no single day", () => assert.equal(resolveRelative("cada viernes", WED), null));

const dl = (x: Partial<{ when: string; date: string | null; quote: string | null; source_id: string | null }>) => ({ when: "", date: null, quote: null, source_id: "S1", ...x });

test("the deadline gets its date when the model leaves it empty", () => {
  const r = resolveDeadlineDate(dl({ when: "mañana" }), [], WED);
  assert.equal(r.date, "2026-11-05");
  assert.equal(r.date_computed, true);
});
test("a wrong date from the model is corrected", () => assert.equal(resolveDeadlineDate(dl({ when: "mañana", date: "2026-11-09" }), [], WED).date, "2026-11-05"));
test("an explicit date from the model is kept", () => {
  const r = resolveDeadlineDate(dl({ when: "13 de noviembre", date: "2026-11-13", quote: "para mañana no, para el 13" }), [], WED);
  assert.equal(r.date, "2026-11-13");
  assert.equal(r.date_computed, undefined);
});
test("the quote is used when 'when' is vague", () => assert.equal(resolveDeadlineDate(dl({ when: "sin fecha", quote: "tarea para mañana" }), [], WED).date, "2026-11-05"));
test("the model's date is flagged as worked out when the quote says mañana", () => {
  const r = resolveDeadlineDate(dl({ when: "al inicio de la clase", date: "2026-11-05", quote: "Hay tarea para mañana" }), [], WED);
  assert.equal(r.date_computed, true);
});
test("wrong arithmetic is corrected from the quote", () => assert.equal(resolveDeadlineDate(dl({ when: "al inicio de la clase", date: "2026-11-09", quote: "Hay tarea para mañana" }), [], WED).date, "2026-11-05"));
test("a stated date beats a passing mañana in the quote", () => assert.equal(resolveDeadlineDate(dl({ when: "el 13", date: "2026-11-13", quote: "mañana les digo, es para el 13" }), [], WED).date, "2026-11-13"));
test("a date with no number in its quote is flagged as worked out", () => {
  const r = resolveDeadlineDate(dl({ when: "al inicio de la clase", date: "2026-11-05", quote: "Se entrega al inicio de la clase" }), [], WED);
  assert.equal(r.date_computed, true);
});
test("mañana counts from the day of the recording", () => {
  const sources = [{ id: "S1", kind: "class" as const, name: "clase", text: "x", date: "2026-11-02" }];
  assert.equal(resolveDeadlineDate(dl({ when: "mañana" }), sources, WED).date, "2026-11-03");
});

// ---------- Reminders ----------

function assignment(date: string, time: string | null = null): Assignment {
  return {
    id: "a1", createdAt: "", updatedAt: "", finishedAt: null, sources: [], done: [], picked: [], extraQuestions: [], chat: [], profName: "",
    decode: {
      title: "Tarea", course: null, literal_summary: [], deliverables: [], format_requirements: [], grading_criteria: [], ambiguities: [], quote_check: { verified: 0, total: 0 },
      steps: [{ action: "Abrir", minutes: 10, done_when: "abierto" }],
      deadlines: [{ item: "Tarea", when: "mañana", date, time, quote: "", source_id: "", verified: true, date_check: "ok" }],
    } as unknown as Assignment["decode"],
  };
}
const inDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const t = STRINGS.es;

test("something due tomorrow still gets a reminder on the due day", () => {
  const list = plannedNotifications([assignment(inDays(1))], DEFAULT_SETTINGS, t);
  assert.ok(list.some((n) => n.title.startsWith(t.reminderEvent(0)) && new Date(n.at).getHours() === 9));
});
test("an all-day due date does not notify at midnight", () => {
  for (const n of plannedNotifications([assignment(inDays(5))], DEFAULT_SETTINGS, t)) assert.notEqual(new Date(n.at).getHours(), 0);
});
test("due early in the morning: the reminder comes before it", () => {
  const events = planEvents(assignment(inDays(2), "08:00"), DEFAULT_SETTINGS, t);
  const dayOf = events.find((e) => e.uid.endsWith("-0") && e.kind === "reminder");
  assert.equal(dayOf?.start.getHours(), 7);
});
test("finished work is not notified", () => {
  assert.equal(plannedNotifications([{ ...assignment(inDays(5)), finishedAt: "x" }], DEFAULT_SETTINGS, t).length, 0);
});
