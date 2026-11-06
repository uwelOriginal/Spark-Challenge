"use client";

import { api, ApiError, type Voice } from "./api";
import { profileFor, themeKey } from "./personal";
import type { DecodeResult, SourceInput, SourceKind, Themed } from "./schemas";
import { newId, type Assignment, type ChatTurn, type Settings, type Source } from "./store";

// AI flows. Each takes the assignment and returns the next one, the caller saves it.

export type NewSource = Omit<Source, "id" | "addedAt">;

// "mañana" in Tuesday's recording means Wednesday, even if uploaded Friday
export const toInputs = (sources: Source[]): SourceInput[] =>
  sources.map(({ id, kind, name, text, addedAt, saidOn }) => ({ id, kind, name, text, date: saidOn ?? localDay(new Date(addedAt)) }));

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const now = () => new Date().toISOString();

export function nextSourceId(sources: Pick<Source, "id">[]): string {
  const max = sources.reduce((m, s) => Math.max(m, Number(s.id.slice(1)) || 0), 0);
  return `S${max + 1}`;
}

export function withId(existing: Source[], s: NewSource): Source {
  return { ...s, id: nextSourceId(existing), addedAt: now() };
}

// built from the decode, not the raw sources
export async function makeTheme(a: Assignment, s: Settings, voice: Voice): Promise<Themed> {
  const d = a.decode;
  const theme = await api.theme(
    {
      assignment: {
        title: d.title,
        summary: d.literal_summary,
        steps: d.steps,
        deadlines: d.deadlines.map((x) => ({ item: x.item, when: x.when })),
        deliverables: d.deliverables.map((x) => x.item),
        grading: d.grading_criteria.map((x) => (x.weight ? `${x.item} (${x.weight})` : x.item)),
        vague: d.ambiguities.filter((x) => x.kind === "vague").map((x) => x.quote ?? x.issue),
      },
      interest: s.interest,
      pack: s.pack,
      depth: s.depth === "full" ? "full" : "light",
    },
    voice,
  );
  return { ...theme, key: themeKey(s, d.steps) };
}

export function summaryText(d: DecodeResult): string {
  return [
    d.title,
    ...d.literal_summary,
    ...d.deadlines.map((x, i) => `Deadline ${i}: ${x.item}: ${x.when}`),
    ...d.ambiguities.map((x) => `Open question (${x.kind}): ${x.issue}`),
    ...d.steps.map((x, i) => `Step ${i}: ${x.action}`),
  ].join("\n");
}

export async function createAssignment(sources: Source[], voice: Voice): Promise<Assignment> {
  const decode = await api.decode(toInputs(sources), voice);
  if (decode.not_an_assignment) throw new ApiError("not_an_assignment");
  const at = now();
  return {
    id: newId(),
    createdAt: at,
    updatedAt: at,
    finishedAt: null,
    sources,
    decode,
    done: [],
    picked: decode.ambiguities.map((_, i) => i),
    extraQuestions: [],
    chat: [],
    profName: "",
  };
}

// Re-read everything, keep done steps, post what changed in the chat.
export async function addMaterial(a: Assignment, s: NewSource, voice: Voice, kindName: (k: SourceKind) => string): Promise<Assignment> {
  const sources = [...a.sources, withId(a.sources, s)];
  const joined = (list: Source[]) => list.map((x) => `${kindName(x.kind)}: ${x.name}\n${x.text}`).join("\n\n");
  const [decode, changes] = await Promise.all([api.decode(toInputs(sources), voice), api.changes(joined(a.sources), joined(sources), voice)]);
  const note: ChatTurn = { role: "assistant", text: s.name, at: now(), changes };
  // a hand-picked date survives unless the deadline now has its own
  const kept = a.decode.deadlines.filter((x) => x.date_set_by_student);
  const deadlines = decode.deadlines.map((x) => {
    const mine = kept.find((k) => k.item === x.item);
    return mine && !x.date ? { ...x, date: mine.date, time: mine.time, date_set_by_student: true } : x;
  });
  const extra = kept.filter((k) => !decode.deadlines.some((x) => x.item === k.item));
  return {
    ...a,
    sources,
    decode: { ...decode, deadlines: [...deadlines, ...extra] },
    done: a.done.filter((action) => decode.steps.some((st) => st.action === action)),
    picked: decode.ambiguities.map((_, i) => i),
    chat: [...a.chat, note],
  };
}

export function withQuestion(a: Assignment, message: string): Assignment {
  return { ...a, chat: [...a.chat, { role: "user", text: message, at: now() }] };
}

// `a` already includes the question
export async function answer(a: Assignment, voice: Voice, settings: Settings): Promise<Assignment> {
  const question = a.chat[a.chat.length - 1];
  const history = a.chat.slice(0, -1).filter((c) => !c.changes).map((c) => ({ role: c.role, text: c.text }));
  const r = await api.chat(toInputs(a.sources), summaryText(a.decode), history, question.text, voice, profileFor(settings));
  return { ...a, chat: [...a.chat, { role: "assistant", text: r.answer, at: now(), result: r }] };
}

// index -1 adds a new deadline
export function withDeadlineDate(a: Assignment, index: number, date: string | null, item: string): Assignment {
  const list = a.decode.deadlines;
  const deadlines =
    index >= 0
      ? list.map((x, i) => (i === index ? { ...x, date, date_computed: false, date_check: "none" as const, date_set_by_student: true } : x))
      : [...list, { item, when: date ?? "", date, time: null, quote: "", source_id: "", verified: true, date_check: "none" as const, date_set_by_student: true }];
  return { ...a, decode: { ...a.decode, deadlines } };
}

export function toggleStep(a: Assignment, i: number): Assignment {
  const action = a.decode.steps[i].action;
  return { ...a, done: a.done.includes(action) ? a.done.filter((x) => x !== action) : [...a.done, action] };
}

export function fileRoute(f: File): "document" | "audio" | "transcript" | null {
  const name = f.name.toLowerCase();
  if (/\.(vtt|srt|txt|md)$/.test(name) || f.type.startsWith("text/")) return "transcript";
  if (f.type.startsWith("audio/") || f.type.startsWith("video/") || /\.(m4a|mp3|wav|webm|ogg|mp4)$/.test(name)) return "audio";
  if (f.type === "application/pdf" || f.type.startsWith("image/") || /\.(pdf|png|jpe?g|webp)$/.test(name)) return "document";
  return null;
}
