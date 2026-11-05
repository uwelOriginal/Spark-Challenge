// Interest-based personalization: the themed layer may relabel the assignment, never change it,
// and Clara's settings proposals can only reach display and personalization keys.
import { test } from "node:test";
import assert from "node:assert/strict";
import { changeToPatch, guessPack, isActive, sanitizeTheme, themeKey, themeProblems, undoFor } from "../src/lib/personal.ts";
import type { Chat, Theme } from "../src/lib/schemas.ts";

const base = { interest: "fútbol", pack: "auto" as const, depth: "full" as const, lang: "es" as const, dialect: "es-MX" };
const steps = [{ action: "Leer la rúbrica" }, { action: "Elegir el tema" }, { action: "Hacer un esquema" }];

const theme = (over: Partial<Theme> = {}): Theme => ({
  pack: "football",
  intro: "Tu ensayo es un partido.",
  step_labels: ["Calentamiento", "Elegir la táctica", "Primer tiempo"],
  groups: [
    { label: "Previa", icon: "whistle", steps: [0] },
    { label: "Partido", icon: "ball", steps: [1, 2] },
  ],
  analogies: [{ concept: "tesis", analogy: "Es el plan de juego.", where_it_breaks: "Un ensayo no tiene rival.", icon: "target" }],
  scenes: [{ kind: "timeline", title: "Calendario", alt: "Fechas en orden.", items: [{ label: "Entrega", icon: "goal", note: null, step: null, deadline: 0 }, { label: "Inicio", icon: "flag", note: null, step: 0, deadline: null }] }],
  ...over,
});

test("free-text interests map to a picture pack", () => {
  assert.equal(guessPack("Me encanta el fútbol y el Real Madrid"), "football");
  assert.equal(guessPack("minecraft and zelda"), "videogames");
  assert.equal(guessPack("K-pop, sobre todo BTS"), "music");
  assert.equal(guessPack("la cocina francesa"), "generic");
  assert.equal(guessPack(""), "generic");
});

test("personalization is on only with an interest and a depth", () => {
  assert.equal(isActive({ interest: "fútbol", depth: "full" }), true);
  assert.equal(isActive({ interest: "  ", depth: "full" }), false);
  assert.equal(isActive({ interest: "fútbol", depth: "off" }), false);
});

test("the theme key changes when the interest or the steps change", () => {
  const k = themeKey(base, steps);
  assert.equal(themeKey({ ...base, interest: " Fútbol " }, steps), k);
  assert.notEqual(themeKey({ ...base, interest: "música" }, steps), k);
  assert.notEqual(themeKey(base, [...steps, { action: "Escribir" }]), k);
  assert.notEqual(themeKey({ ...base, depth: "light" }, steps), k);
});

test("a good theme has no problems", () => assert.deepEqual(themeProblems(theme(), 3, 1, "full", "entrega 2026-11-20"), []));

test("a theme that loses or repeats a step is rejected", () => {
  assert.ok(themeProblems(theme({ groups: [{ label: "Todo", icon: "ball", steps: [0, 1] }] }), 3, 1, "full", "").includes("groups"));
  assert.ok(themeProblems(theme({ groups: [{ label: "Todo", icon: "ball", steps: [0, 1, 2, 2] }] }), 3, 1, "full", "").includes("groups"));
  assert.ok(themeProblems(theme({ step_labels: ["a"] }), 3, 1, "full", "").includes("labels"));
});

test("a theme that invents a date, time or weight is rejected", () => {
  const facts = JSON.stringify({ deadlines: [{ when: "viernes 20 de noviembre, 23:59" }], grading: ["Argumento (40%)"] });
  assert.deepEqual(themeProblems(theme({ intro: "El silbatazo final es a las 23:59." }), 3, 1, "full", facts), []);
  assert.ok(themeProblems(theme({ intro: "El partido termina a las 18:00." }), 3, 1, "full", facts).includes("invented_fact"));
  assert.ok(themeProblems(theme({ intro: "El argumento vale 50%." }), 3, 1, "full", facts).includes("invented_fact"));
});

test("analogies must say where they stop matching", () => {
  const t = theme({ analogies: [{ concept: "tesis", analogy: "El plan de juego.", where_it_breaks: " ", icon: "target" }] });
  assert.ok(themeProblems(t, 3, 1, "full", "").includes("no_limits"));
  assert.ok(themeProblems(theme({ analogies: [] }), 3, 1, "full", "").includes("no_analogies"));
  assert.deepEqual(themeProblems(theme({ analogies: [] }), 3, 1, "light", ""), []);
});

test("sanitizing puts forgotten steps back and drops broken references", () => {
  const t = sanitizeTheme(
    theme({
      groups: [{ label: "Partido", icon: "ball", steps: [1, 1, 9] }, { label: "Previa", icon: "whistle", steps: [0] }],
      scenes: [{ kind: "flow", title: "x", alt: "y", items: [{ label: "a", icon: "ball", note: null, step: 7, deadline: 3 }, { label: "b", icon: "goal", note: null, step: 1, deadline: null }] }],
    }),
    3,
    1,
    "full",
  );
  assert.deepEqual(t.groups.map((g) => g.steps), [[0], [1, 2]]);
  assert.equal(t.scenes[0].items[0].step, null);
  assert.equal(t.scenes[0].items[0].deadline, null);
  assert.equal(t.scenes[0].items[1].step, 1);
});

test("light depth never shows analogies", () => assert.deepEqual(sanitizeTheme(theme(), 3, 1, "light").analogies, []));

const noChange: Chat["settings_change"] = {
  wanted: false, reason: "", theme: null, accent: null, font: null, text_size: null, control_size: null,
  spacing: null, layout: null, voice_rate: null, motion: null, depth: null, interest: null, pack: null,
};

test("a settings proposal becomes a patch of only the fields Clara named", () => {
  assert.deepEqual(changeToPatch(noChange), {});
  assert.deepEqual(changeToPatch({ ...noChange, wanted: true, theme: "light", motion: "off" }), { theme: "light", motion: "off" });
  assert.deepEqual(changeToPatch({ ...noChange, wanted: true, voice_rate: "slow" }), { voiceRate: 0.75 });
});

test("asking for a new interest turns personalization on", () => {
  assert.deepEqual(changeToPatch({ ...noChange, wanted: true, interest: "basketball", pack: "basketball" }), { interest: "basketball", depth: "full", pack: "basketball" });
});

test("values outside the allowed lists are ignored", () => {
  const sneaky = { ...noChange, wanted: true, theme: "neon", studentName: "x", reminderDays: [0] } as unknown as Chat["settings_change"];
  assert.deepEqual(changeToPatch(sneaky), {});
});

test("undo restores exactly the keys that were changed", () => {
  const current = { theme: "dark", motion: "calm", font: "atkinson" } as never;
  assert.deepEqual(undoFor({ theme: "light", motion: "off" }, current), { theme: "dark", motion: "calm" });
});

test("a new theme from the chat also renames the interest, so analogies follow it", () => {
  assert.deepEqual(changeToPatch({ ...noChange, wanted: true, pack: "football" }, "es"), { pack: "football", interest: "Fútbol" });
  assert.deepEqual(changeToPatch({ ...noChange, wanted: true, pack: "auto" }), { pack: "auto" });
});
