"use client";

import { useEffect, useState } from "react";
import type { ChangesResult, ChatResult, DecodeResult, Lang, SourceKind } from "./schemas";

// Local-first storage: every assignment, chat and setting lives on the student's device
// (localStorage). No account, no server database. "Delete my data" wipes it all.

export type Source = {
  id: string; // S1, S2, ... (stable inside one assignment)
  kind: SourceKind;
  name: string;
  text: string;
  method: "paste" | "pdf" | "image" | "audio" | "transcript" | "canvas" | "example";
  addedAt: string;
};

export type ChatTurn = { role: "user" | "assistant"; text: string; at: string; result?: ChatResult };

export type Assignment = {
  id: string;
  createdAt: string;
  updatedAt: string;
  sources: Source[];
  decode: DecodeResult | null;
  decodedSourcesKey: string; // which sources the decode is based on
  picked: number[]; // ambiguity indexes included in the professor message
  done: number[]; // step indexes done
  chat: ChatTurn[];
  changes: { at: string; result: ChangesResult }[];
  profName: string;
  stuck: string;
  extraQuestions?: string[]; // questions added from the chat ("add to the message for the professor")
};

export type Settings = {
  lang: Lang;
  studentName: string;
  reminderDays: number[]; // days before each due date
  reminderTime: string; // HH:MM
  canvasFeedUrl: string;
  onboarded: boolean;
};

type State = { assignments: Assignment[]; settings: Settings };

const KEY = "clara.v2";
export const DEFAULT_SETTINGS: Settings = {
  lang: "es",
  studentName: "",
  reminderDays: [3, 1],
  reminderTime: "09:00",
  canvasFeedUrl: "",
  onboarded: false,
};

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      return { assignments: s.assignments ?? [], settings: { ...DEFAULT_SETTINGS, ...s.settings } };
    }
  } catch {
    /* storage blocked or corrupted: start empty */
  }
  return { assignments: [], settings: DEFAULT_SETTINGS };
}

function save(s: State) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode: keep working in memory */
  }
}

export function sourcesKey(sources: Source[]): string {
  return sources.map((s) => `${s.id}:${s.text.length}`).join("|");
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
    setSettings: (patch: Partial<Settings>) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    upsert: (a: Assignment) =>
      update((s) => {
        const stamped = { ...a, updatedAt: new Date().toISOString() };
        const exists = s.assignments.some((x) => x.id === a.id);
        return { ...s, assignments: exists ? s.assignments.map((x) => (x.id === a.id ? stamped : x)) : [stamped, ...s.assignments] };
      }),
    remove: (id: string) => update((s) => ({ ...s, assignments: s.assignments.filter((x) => x.id !== id) })),
    wipe: () => update(() => ({ assignments: [], settings: DEFAULT_SETTINGS })),
  };
}

/** Earliest due date (YYYY-MM-DD[THH:MM]) of an assignment, for sorting and "next up". */
export function nextDue(a: Assignment): string | null {
  const dates = (a.decode?.deadlines ?? [])
    .filter((d) => d.date)
    .map((d) => `${d.date}T${d.time ?? "23:59"}`)
    .sort();
  return dates[0] ?? null;
}
