"use client";

import type { Profile } from "./personal";
import type { ChangesResult, ChatResult, DecodeResult, Lang, SourceInput, Theme } from "./schemas";
import type { Segment } from "./transcript";

// Browser-side calls to Clara's API routes. Errors become ApiError(code) so the UI can show
// the matching plain-language message from i18n.

export class ApiError extends Error {}

const CODE_KEY = "clara-access-code";

export function getAccessCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

export function setAccessCode(code: string) {
  try {
    localStorage.setItem(CODE_KEY, code);
  } catch {
    /* private mode: the code is asked again next time */
  }
}

async function call<T>(path: string, body: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  const code = getAccessCode();
  let res: Response;
  try {
    res = await fetch(path, {
      method: "POST",
      headers: { ...(isForm ? {} : { "Content-Type": "application/json" }), ...(code ? { "x-clara-code": code } : {}) },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("network");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "unavailable");
  return data as T;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Output language for the AI: the UI language plus its regional variant (see dialects.ts). */
export type Voice = { lang: Lang; dialect: string };

export const api = {
  decode: (sources: SourceInput[], v: Voice) => call<DecodeResult>("/api/decode", { sources, ...v, today: today() }),
  changes: (before: string, after: string, v: Voice) => call<ChangesResult>("/api/changes", { before, after, ...v }),
  chat: (sources: SourceInput[], summary: string, history: { role: string; text: string }[], message: string, v: Voice, profile: Profile) =>
    call<ChatResult>("/api/chat", { sources, summary, history, message, profile, ...v }),
  theme: (body: ThemeRequest, v: Voice) => call<Theme>("/api/theme", { ...body, ...v }),
  extract: (file: File) => {
    const f = new FormData();
    f.append("file", file);
    return call<{ text: string; method: string }>("/api/extract", f);
  },
  transcribe: (file: Blob, name: string, lang: Lang) => {
    const f = new FormData();
    f.append("file", file, name);
    f.append("lang", lang);
    return call<{ segments: Segment[]; language: string | null; diarization: "acoustic" | "estimated" | "none" }>("/api/transcribe", f);
  },

  /** Whole-class recordings: upload once (streamed), then poll the background job. */
  startAudioJob: async (file: Blob, name: string, lang: Lang): Promise<{ id: string }> => {
    const code = getAccessCode();
    let res: Response;
    try {
      res = await fetch("/api/audio-jobs", {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "x-file-name": encodeURIComponent(name),
          "x-lang": lang,
          ...(code ? { "x-clara-code": code } : {}),
        },
        body: file,
      });
    } catch {
      throw new ApiError("network");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "unavailable");
    return data;
  },
  audioJob: async (id: string): Promise<AudioJobStatus> => {
    const code = getAccessCode();
    const res = await fetch(`/api/audio-jobs/${id}`, { headers: code ? { "x-clara-code": code } : {} }).catch(() => null);
    if (!res) throw new ApiError("network");
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "unavailable");
    return data;
  },
};

export type ThemeRequest = {
  assignment: {
    title: string;
    summary: string[];
    steps: { action: string; minutes: number; done_when: string }[];
    deadlines: { item: string; when: string }[];
    deliverables: string[];
    grading: string[];
    vague: string[];
  };
  interest: string;
  pack: string;
  depth: "light" | "full";
};

export type ClassPassage = { time: string; seconds: number; quote: string; topic: string };
export type AudioJobStatus = {
  id: string;
  fileName: string;
  status: "splitting" | "transcribing" | "extracting" | "done" | "error";
  duration: number;
  parts: number;
  transcribed: number;
  extracted: number;
  waitingUntil: number | null;
  error: string | null;
  transcript: string | null;
  passages: ClassPassage[] | null;
};
