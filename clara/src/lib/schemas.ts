import { z } from "zod";
import { GLYPHS } from "./glyphs.ts";
import { PACK_IDS } from "./personal.ts";

// What the model must return. Claims carry a verbatim quote and source_id so code can check them.

const Quoted = { quote: z.string(), source_id: z.string() };

export const DecodeSchema = z.object({
  not_an_assignment: z.boolean(),
  injected_instructions_ignored: z.boolean(),
  title: z.string(),
  course: z.string().nullable(),
  literal_summary: z.array(z.string()),
  deliverables: z.array(z.object({ item: z.string(), details: z.string(), ...Quoted })),
  deadlines: z.array(
    z.object({
      item: z.string(),
      when: z.string(),
      date: z.string().nullable(), // YYYY-MM-DD
      time: z.string().nullable(), // HH:MM
      ...Quoted,
    }),
  ),
  format_requirements: z.array(z.object({ item: z.string(), ...Quoted })),
  grading_criteria: z.array(z.object({ item: z.string(), weight: z.string().nullable(), ...Quoted })),
  ambiguities: z.array(
    z.object({
      kind: z.enum(["missing", "vague", "contradiction"]),
      issue: z.string(),
      why_it_matters: z.string(),
      question: z.string(),
      quote: z.string().nullable(),
      source_id: z.string().nullable(),
    }),
  ),
  steps: z.array(z.object({ action: z.string(), minutes: z.number(), done_when: z.string() })),
});

export const ChangesSchema = z.object({
  has_changes: z.boolean(),
  changes: z.array(
    z.object({
      kind: z.enum(["added", "removed", "modified"]),
      what: z.string(),
      before_quote: z.string().nullable(),
      after_quote: z.string().nullable(),
    }),
  ),
  what_to_do: z.array(z.string()),
  unchanged: z.array(z.string()),
});

// Figure data, drawn by studio/Scene.tsx. step and deadline index into the decode.
export const SceneSchema = z.object({
  kind: z.enum(["timeline", "flow", "cards"]),
  title: z.string(),
  alt: z.string(),
  items: z.array(
    z.object({
      label: z.string(),
      icon: z.enum(GLYPHS),
      note: z.string().nullable(),
      step: z.number().nullable(),
      deadline: z.number().nullable(),
    }),
  ),
});

// Relabels the decode, never adds facts.
export const ThemeSchema = z.object({
  pack: z.enum(PACK_IDS),
  intro: z.string(),
  step_labels: z.array(z.string()), // one per step
  groups: z.array(z.object({ label: z.string(), icon: z.enum(GLYPHS), steps: z.array(z.number()) })),
  analogies: z.array(z.object({ concept: z.string(), analogy: z.string(), where_it_breaks: z.string(), icon: z.enum(GLYPHS) })),
  scenes: z.array(SceneSchema),
});

const nullableEnum = <T extends readonly [string, ...string[]]>(values: T) => z.enum(values).nullable();

export const ChatSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ ...Quoted })),
  not_in_sources: z.boolean(),
  question_for_professor: z.string().nullable(),
  safety: z.enum(["none", "distress", "ghostwriting"]),
  visuals: z.array(SceneSchema),
  // see changeToPatch in personal.ts
  settings_change: z.object({
    wanted: z.boolean(),
    reason: z.string(),
    theme: nullableEnum(["dark", "light", "contrast"]),
    accent: nullableEnum(["blue", "teal", "yellow", "violet", "rose"]),
    font: nullableEnum(["atkinson", "lexend", "system"]),
    text_size: nullableEnum(["s", "m", "l", "xl"]),
    control_size: nullableEnum(["m", "l", "xl"]),
    spacing: nullableEnum(["normal", "relaxed"]),
    layout: nullableEnum(["side", "swap", "stacked", "tabs"]),
    voice_rate: nullableEnum(["slow", "normal", "fast"]),
    motion: nullableEnum(["off", "calm", "full"]),
    depth: nullableEnum(["off", "light", "full"]),
    interest: z.string().nullable(),
    pack: nullableEnum(["auto", ...PACK_IDS]),
  }),
});

export type Decode = z.infer<typeof DecodeSchema>;
export type Changes = z.infer<typeof ChangesSchema>;
export type Chat = z.infer<typeof ChatSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type Themed = Theme & { key: string };

export type SourceKind = "brief" | "rubric" | "class" | "announcement" | "other";
export type SourceInput = { id: string; kind: SourceKind; name: string; text: string; date?: string };

// after the quote checks
export type Checked<T> = T & { verified: boolean };
export type DateCheck = "ok" | "mismatch" | "unchecked" | "none";

export type DecodeResult = Omit<
  Decode,
  "deliverables" | "deadlines" | "format_requirements" | "grading_criteria" | "ambiguities"
> & {
  deliverables: Checked<Decode["deliverables"][number]>[];
  deadlines: (Checked<Decode["deadlines"][number]> & { date_check: DateCheck; date_computed?: boolean; date_set_by_student?: boolean })[];
  format_requirements: Checked<Decode["format_requirements"][number]>[];
  grading_criteria: Checked<Decode["grading_criteria"][number]>[];
  ambiguities: Checked<Decode["ambiguities"][number]>[];
  quote_check: { verified: number; total: number };
};

export type ChangesResult = Omit<Changes, "changes"> & {
  changes: Checked<Changes["changes"][number]>[];
};

export type ChatResult = Omit<Chat, "citations"> & { citations: Checked<Chat["citations"][number]>[] };

export type Lang = "es" | "en";
