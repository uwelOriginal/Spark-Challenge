"use client";

import { api, ApiError, type Voice } from "./api";
import { profileFor, themeKey } from "./personal";
import type { DecodeResult, SourceInput, SourceKind, Themed } from "./schemas";
import { newId, type Assignment, type ChatTurn, type Settings, type Source } from "./store";

// Every AI flow of the app, kept out of the components. Each function takes the current
// assignment and returns the next one; the caller saves it. Nothing here touches the UI.

export type NewSource = Omit<Source, "id" | "addedAt">;

export const toInputs = (sources: Source[]): SourceInput[] => sources.map(({ id, kind, name, text }) => ({ id, kind, name, text }));

const now = () => new Date().toISOString();

export function nextSourceId(sources: Pick<Source, "id">[]): string {
  const max = sources.reduce((m, s) => Math.max(m, Number(s.id.slice(1)) || 0), 0);
  return `S${max + 1}`;
}

export function withId(existing: Source[], s: NewSource): Source {
  return { ...s, id: nextSourceId(existing), addedAt: now() };
}

/** The interest layer for this assignment (docs/15): made from the decode, never from the raw sources. */
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

/** Short text the chat model gets as context, so it does not re-read everything from scratch. */
export function summaryText(d: DecodeResult): string {
  return [
    d.title,
    ...d.literal_summary,
    ...d.deadlines.map((x, i) => `Deadline ${i}: ${x.item}: ${x.when}`),
    ...d.ambiguities.map((x) => `Open question (${x.kind}): ${x.issue}`),
    ...d.steps.map((x, i) => `Step ${i}: ${x.action}`),
  ].join("\n");
}

/** Step 1 → 2: read the uploaded material and save it as a new assignment. */
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

/**
 * New material during work (an announcement, the rubric, a class recording):
 * re-read everything, keep the steps already done, and post "what changed" in the chat.
 */
export async function addMaterial(a: Assignment, s: NewSource, voice: Voice, kindName: (k: SourceKind) => string): Promise<Assignment> {
  const sources = [...a.sources, withId(a.sources, s)];
  const joined = (list: Source[]) => list.map((x) => `${kindName(x.kind)}: ${x.name}\n${x.text}`).join("\n\n");
  const [decode, changes] = await Promise.all([api.decode(toInputs(sources), voice), api.changes(joined(a.sources), joined(sources), voice)]);
  const note: ChatTurn = { role: "assistant", text: s.name, at: now(), changes };
  return {
    ...a,
    sources,
    decode,
    done: a.done.filter((action) => decode.steps.some((st) => st.action === action)),
    picked: decode.ambiguities.map((_, i) => i),
    chat: [...a.chat, note],
  };
}

/** Add the student's question to the conversation (shown at once, before the answer arrives). */
export function withQuestion(a: Assignment, message: string): Assignment {
  return { ...a, chat: [...a.chat, { role: "user", text: message, at: now() }] };
}

/** Ask Clara about the assignment. `a` already contains the question (see withQuestion). */
export async function answer(a: Assignment, voice: Voice, settings: Settings): Promise<Assignment> {
  const question = a.chat[a.chat.length - 1];
  const history = a.chat.slice(0, -1).filter((c) => !c.changes).map((c) => ({ role: c.role, text: c.text }));
  const r = await api.chat(toInputs(a.sources), summaryText(a.decode), history, question.text, voice, profileFor(settings));
  return { ...a, chat: [...a.chat, { role: "assistant", text: r.answer, at: now(), result: r }] };
}

export function toggleStep(a: Assignment, i: number): Assignment {
  const action = a.decode.steps[i].action;
  return { ...a, done: a.done.includes(action) ? a.done.filter((x) => x !== action) : [...a.done, action] };
}

/** Which intake a file goes through, from its type or extension. */
export function fileRoute(f: File): "document" | "audio" | "transcript" | null {
  const name = f.name.toLowerCase();
  if (/\.(vtt|srt|txt|md)$/.test(name) || f.type.startsWith("text/")) return "transcript";
  if (f.type.startsWith("audio/") || f.type.startsWith("video/") || /\.(m4a|mp3|wav|webm|ogg|mp4)$/.test(name)) return "audio";
  if (f.type === "application/pdf" || f.type.startsWith("image/") || /\.(pdf|png|jpe?g|webp)$/.test(name)) return "document";
  return null;
}
