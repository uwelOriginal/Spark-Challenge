// Run: npm test   (Node 24 strips TypeScript types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { checkDate } from "../src/lib/verify.ts";
import { parseTranscriptFile, speakerStats, transcriptText } from "../src/lib/transcript.ts";
import { buildIcs, parseIcs } from "../src/lib/ics.ts";

test("weekday matches the date", () => assert.equal(checkDate("viernes 13 de noviembre a las 23:59 h", "2026-11-13"), "ok"));
test("weekday mismatch is caught", () => assert.equal(checkDate("jueves 13 de noviembre", "2026-11-13"), "mismatch"));
test("no weekday in text is unchecked", () => assert.equal(checkDate("13 de noviembre", "2026-11-13"), "unchecked"));
test("no date is none", () => assert.equal(checkDate("Sunday at midnight", null), "none"));
test("English weekday works", () => assert.equal(checkDate("Monday, November 16", "2026-11-16"), "ok"));

const vtt = `WEBVTT

00:00:03.000 --> 00:00:10.000
<v Profesora>La fecha correcta es el jueves 12.</v>

00:00:11.000 --> 00:00:14.000
<v Profesora>Máximo 1,500 palabras.</v>

00:00:15.000 --> 00:00:17.000
<v Alumno 1>¿En equipo?</v>`;

test("VTT speakers are parsed and consecutive lines merge", () => {
  const segs = parseTranscriptFile(vtt);
  assert.equal(segs.length, 2);
  assert.equal(segs[0].speaker, "Profesora");
  assert.match(segs[0].text, /jueves 12.*1,500/);
});

test("only the kept speakers reach the model, with time marks", () => {
  const segs = parseTranscriptFile(vtt);
  const keep = new Set([speakerStats(segs)[0].speaker]);
  const text = transcriptText(segs, keep);
  assert.match(text, /^\[00:03\] La fecha/);
  assert.doesNotMatch(text, /equipo/);
});

test("plain text transcript becomes one segment", () => {
  const segs = parseTranscriptFile("El ensayo es individual.");
  assert.equal(segs.length, 1);
});

test("Canvas demo feed parses three assignments with unescaped descriptions", () => {
  const items = parseIcs(fs.readFileSync(new URL("../public/samples/canvas-demo.ics", import.meta.url), "utf8"));
  assert.equal(items.length, 3);
  assert.ok(items.every((i) => i.isAssignment));
  assert.match(items[0].description, /Ética, persona y sociedad/);
  assert.match(items[0].description, /\n/);
  assert.equal(items[0].start, "2026-11-13T23:59:00");
});

test("built calendar round-trips through the parser", () => {
  const ics = buildIcs([
    { uid: "a1", title: "Entrega: Ensayo, ética", description: "viernes 13; 23:59", start: new Date(2026, 10, 13, 23, 59), end: new Date(2026, 10, 14, 0, 14), allDay: false },
  ]);
  assert.match(ics, /BEGIN:VALARM/);
  const [ev] = parseIcs(ics);
  assert.equal(ev.title, "Entrega: Ensayo, ética");
  assert.equal(ev.start, "2026-11-13T23:59:00");
});
