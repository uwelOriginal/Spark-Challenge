"use client";

import { useEffect, useState } from "react";
import { defaultDialect, validDialect } from "./dialects.ts";
import type { Depth, Motion, PackId } from "./personal";
import { resolveDeadlineDate } from "./verify.ts";
import type { ChangesResult, ChatResult, DecodeResult, Lang, SourceKind, Themed } from "./schemas";

// Everything lives in localStorage. No account, no server database.

export type Source = {
  id: string; // S1, S2...
  kind: SourceKind;
  name: string;
  text: string;
  method: "paste" | "pdf" | "image" | "audio" | "transcript" | "example" | "canvas";
  addedAt: string;
  saidOn?: string; // recording or file date
};

export type ChatTurn = {
  role: "user" | "assistant";
  text: string;
  at: string;
  result?: ChatResult;
  changes?: ChangesResult; // after new material
  // the student's decision on a settings proposal, and what Undo restores
  decision?: "applied" | "declined" | "undone";
  undo?: Partial<Settings>;
};

export type Assignment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
  sources: Source[];
  decode: DecodeResult;
  done: string[]; // step text, since indexes change on a re-decode
  picked: number[]; // ambiguity indexes for the professor email
  extraQuestions: string[];
  chat: ChatTurn[];
  profName: string;
  themed?: Themed;
};

export type Theme = "dark" | "light" | "contrast";
export type Accent = "blue" | "teal" | "yellow" | "violet" | "rose";
export type Font = "atkinson" | "lexend" | "system";
export type TextSize = "s" | "m" | "l" | "xl";
export type Layout = "side" | "swap" | "stacked" | "tabs";

export type Settings = {
  lang: Lang;
  dialect: string; // see dialects.ts
  studentName: string;
  // display
  theme: Theme;
  accent: Accent;
  font: Font;
  textSize: TextSize;
  controlSize: "m" | "l" | "xl";
  spacing: "normal" | "relaxed";
  layout: Layout;
  voiceRate: number; // 0.7 to 1.2
  // personalization
  interest: string; // free text
  pack: PackId | "auto";
  depth: Depth;
  motion: Motion;
  interestAsked: boolean;
  decor: boolean;
  // reminders
  reminderDays: number[];
  reminderTime: string;
  notifications: boolean;
  canvasFeedUrl: string;
};

type State = { assignments: Assignment[]; settings: Settings };

export const STORAGE_KEY = "clara.v3";
const OLD_KEY = "clara.v2";

export const DEFAULT_SETTINGS: Settings = {
  lang: "es",
  dialect: defaultDialect("es"),
  studentName: "",
  theme: "dark",
  accent: "blue",
  font: "atkinson",
  textSize: "m",
  controlSize: "m",
  spacing: "normal",
  layout: "side",
  voiceRate: 0.95,
  interest: "",
  pack: "auto",
  depth: "full",
  motion: "calm",
  interestAsked: false,
  decor: true,
  reminderDays: [3, 1],
  reminderTime: "09:00",
  notifications: false,
  canvasFeedUrl: "",
};

// v2 stored done steps as indexes, plus a changes log and drafts
function migrate(old: { assignments?: unknown[]; settings?: Partial<Settings> }): State {
  const assignments = (old.assignments ?? [])
    .filter((a): a is Record<string, any> => !!a && typeof a === "object" && !!(a as any).decode)
    .map((a) => ({
      id: a.id,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      finishedAt: null,
      sources: (a.sources ?? []).map((s: Record<string, any>) => ({ ...s, method: s.method === "canvas" ? "paste" : s.method })) as Source[],
      decode: a.decode,
      done: (a.done ?? []).map((i: number) => a.decode.steps[i]?.action).filter(Boolean),
      picked: a.picked ?? [],
      extraQuestions: a.extraQuestions ?? [],
      chat: a.chat ?? [],
      profName: a.profName ?? "",
    }));
  return { assignments, settings: withDefaults(old.settings) };
}

function withDefaults(s: Partial<Settings> | undefined): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...s };
  return { ...merged, dialect: validDialect(merged.lang, merged.dialect) };
}

function load(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      return { assignments: (s.assignments ?? []).map(withRelativeDates), settings: withDefaults(s.settings) };
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) return migrate(JSON.parse(old));
  } catch {
    /* blocked or corrupted */
  }
  return { assignments: [], settings: DEFAULT_SETTINGS };
}

// older assignments: work out relative dates from createdAt
function withRelativeDates(a: Assignment): Assignment {
  const created = new Date(a.createdAt);
  const day = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, "0")}-${String(created.getDate()).padStart(2, "0")}`;
  const deadlines = a.decode.deadlines.map((x) => (x.date ? x : resolveDeadlineDate(x, a.sources, day)));
  return { ...a, decode: { ...a.decode, deadlines } };
}

function save(s: State) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode */
  }
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function useClaraStore() {
  const [state, setState] = useState<State>({ assignments: [], settings: DEFAULT_SETTINGS });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  function update(fn: (s: State) => State) {
    setState((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }

  return {
    ready,
    assignments: state.assignments,
    settings: state.settings,
    setSettings: (patch: Partial<Settings>) => update((s) => ({ ...s, settings: withDefaults({ ...s.settings, ...patch }) })),
    upsert: (a: Assignment) =>
      update((s) => {
        const stamped = { ...a, updatedAt: new Date().toISOString() };
        const exists = s.assignments.some((x) => x.id === a.id);
        return { ...s, assignments: exists ? s.assignments.map((x) => (x.id === a.id ? stamped : x)) : [stamped, ...s.assignments] };
      }),
    remove: (id: string) => update((s) => ({ ...s, assignments: s.assignments.filter((x) => x.id !== id) })),
    wipe: () => {
      try {
        localStorage.removeItem(OLD_KEY);
      } catch {
        /* nothing to remove */
      }
      update(() => ({ assignments: [], settings: DEFAULT_SETTINGS }));
    },
  };
}

export type Store = ReturnType<typeof useClaraStore>;

// Derived values

export function nextDue(a: Assignment): string | null {
  const dates = a.decode.deadlines
    .filter((d) => d.date)
    .map((d) => `${d.date}T${d.time ?? "23:59"}`)
    .sort();
  return dates[0] ?? null;
}

export function isDone(a: Assignment, i: number): boolean {
  return a.done.includes(a.decode.steps[i]?.action);
}

export function nextStep(a: Assignment): number {
  return a.decode.steps.findIndex((_, i) => !isDone(a, i));
}

export function teacherQuestions(a: Assignment): string[] {
  return [...a.decode.ambiguities.filter((_, i) => a.picked.includes(i)).map((x) => x.question), ...a.extraQuestions];
}

export function byDue(list: Assignment[]): Assignment[] {
  return [...list].sort((x, y) => (nextDue(x) ?? "9999").localeCompare(nextDue(y) ?? "9999"));
}
