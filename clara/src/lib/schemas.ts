import { z } from "zod";

// Shapes the model must return (enforced with structured outputs).
// Every claim carries a verbatim `quote` plus the `source_id` it came from, so code can check it.

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
      date: z.string().nullable(), // YYYY-MM-DD, only if the source gives day and month
      time: z.string().nullable(), // HH:MM 24h, only if the source gives a time
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

export const ChatSchema = z.object({
  answer: z.string(),
  citations: z.array(z.object({ ...Quoted })),
  not_in_sources: z.boolean(),
  question_for_professor: z.string().nullable(),
  safety: z.enum(["none", "distress", "ghostwriting"]),
});

export type Decode = z.infer<typeof DecodeSchema>;
export type Changes = z.infer<typeof ChangesSchema>;
export type Chat = z.infer<typeof ChatSchema>;

export type SourceKind = "brief" | "rubric" | "class" | "announcement" | "other";
export type SourceInput = { id: string; kind: SourceKind; name: string; text: string };

// After the server checks each quote against the sources.
export type Checked<T> = T & { verified: boolean };
export type DateCheck = "ok" | "mismatch" | "unchecked" | "none";

export type DecodeResult = Omit<
  Decode,
  "deliverables" | "deadlines" | "format_requirements" | "grading_criteria" | "ambiguities"
> & {
  deliverables: Checked<Decode["deliverables"][number]>[];
  deadlines: (Checked<Decode["deadlines"][number]> & { date_check: DateCheck })[];
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
