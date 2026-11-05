"use client";

import { useEffect, useRef, useState } from "react";
import { fileRoute, localDay, type NewSource } from "@/lib/actions";
import { api, type AudioJobStatus } from "@/lib/api";
import type { FeedItem } from "@/lib/ics";
import type { Strings } from "@/lib/i18n";
import type { SourceKind } from "@/lib/schemas";
import { mmss, parseTranscriptFile, speakerStats, transcriptText, type Segment } from "@/lib/transcript";
import { downloadFile, errorText, Icon, Notice } from "./ui";

// One way in for every kind of material. The student drops a file (or pastes, or records);
// the file type decides the route, and every route ends with text the student has seen:
//   PDF / photo        → /api/extract → review text → add
//   paste              → review text → add
//   .vtt / .srt / .txt → parse; several speakers → keep voices → add, otherwise review → add
//   audio (short)      → /api/transcribe → keep voices → add
//   audio (long)       → /api/audio-jobs → passages about coursework → add
//   Canvas             → /api/canvas → pick an assignment → review text → add

const KINDS: SourceKind[] = ["brief", "rubric", "class", "announcement", "other"];
const LONG_AUDIO_BYTES = 20 * 1024 * 1024; // Groq free tier takes 25 MB per file; keep a margin
const LONG_AUDIO_SECONDS = 30 * 60;

type Stage =
  | { name: "idle" }
  | { name: "busy"; note: string }
  | { name: "review"; text: string; fileName: string; method: NewSource["method"] }
  | { name: "record" }
  | { name: "canvas" }
  | { name: "speakers"; segments: Segment[]; fileName: string; method: "audio" | "transcript"; estimated: boolean }
  | { name: "long"; id: string; fileName: string };

export default function MaterialInput({ t, canvasUrl, onCanvasUrl, defaultKind, onAdd, onCancel }: { t: Strings; canvasUrl: string; onCanvasUrl: (url: string) => void; defaultKind: SourceKind; onAdd: (s: NewSource) => void; onCancel?: () => void }) {
  const [stage, setStage] = useState<Stage>({ name: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const lang = t.locale.startsWith("es") ? "es" : "en";
  const reset = () => setStage({ name: "idle" });
  // The day of a recording or transcript file: "mañana" in it counts from then, not from the upload.
  const saidOn = useRef<string | undefined>(undefined);
  const add = (s: NewSource) => {
    onAdd(saidOn.current ? { ...s, saidOn: saidOn.current } : s);
    saidOn.current = undefined;
    reset();
  };

  async function onFile(f?: File) {
    if (!f) return;
    setError(null);
    const route = fileRoute(f);
    const fileDay = localDay(new Date(f.lastModified));
    saidOn.current = (route === "audio" || route === "transcript") && fileDay < localDay(new Date()) ? fileDay : undefined;
    try {
      if (route === "document") {
        setStage({ name: "busy", note: t.readingFile });
        const r = await api.extract(f);
        setStage({ name: "review", text: r.text, fileName: f.name, method: f.type.startsWith("image/") ? "image" : "pdf" });
      } else if (route === "transcript") {
        const segments = parseTranscriptFile(await f.text());
        if (speakerStats(segments).length > 1) setStage({ name: "speakers", segments, fileName: f.name, method: "transcript", estimated: false });
        else setStage({ name: "review", text: segments.map((s) => s.text).join("\n"), fileName: f.name, method: "transcript" });
      } else if (route === "audio") {
        await sendAudio(f, f.name);
      } else {
        setError(t.errors.unsupported_file);
      }
    } catch (e) {
      setError(errorText(t, e));
      reset();
    }
  }

  async function sendAudio(blob: Blob, fileName: string) {
    setStage({ name: "busy", note: t.transcribing });
    try {
      // Whole classes go through the background job (split, parallel, resumable).
      if (blob.size > LONG_AUDIO_BYTES || (await audioSeconds(blob)) > LONG_AUDIO_SECONDS) {
        const { id } = await api.startAudioJob(blob, fileName, lang);
        setStage({ name: "long", id, fileName });
      } else {
        const r = await api.transcribe(blob, fileName, lang);
        setStage({ name: "speakers", segments: r.segments, fileName, method: "audio", estimated: r.diarization !== "acoustic" });
      }
    } catch (e) {
      setError(errorText(t, e));
      reset();
    }
  }

  const status = (
    <div aria-live="polite">
      {stage.name === "busy" && <Notice>{stage.note}</Notice>}
      {error && <Notice kind="warn">{error}</Notice>}
    </div>
  );

  if (stage.name === "review") return <Review t={t} stage={stage} defaultKind={defaultKind} onAdd={add} onCancel={reset} />;
  if (stage.name === "speakers") return <SpeakerPicker t={t} {...stage} onAdd={add} onCancel={reset} />;
  if (stage.name === "long") return <LongClassJob t={t} id={stage.id} fileName={stage.fileName} onAdd={add} onCancel={reset} />;
  if (stage.name === "canvas")
    return <CanvasPicker t={t} url={canvasUrl} onUrl={onCanvasUrl} onCancel={reset} onPick={(text, fileName) => setStage({ name: "review", text, fileName, method: "canvas" })} />;
  if (stage.name === "record") return <Recorder t={t} onDone={(blob, name) => void sendAudio(blob, name)} onCancel={reset} />;

  const busy = stage.name === "busy";
  return (
    <div className="intake">
      <label
        className="drop"
        data-dragging={dragging || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void onFile(e.dataTransfer.files?.[0]);
        }}
      >
        <Icon name="upload" size={28} />
        <span className="drop-title">{t.dropTitle}</span>
        <span className="muted small">{t.dropHint}</span>
        <input
          className="sr-only"
          type="file"
          disabled={busy}
          accept=".pdf,image/png,image/jpeg,image/webp,audio/*,video/mp4,.m4a,.mp3,.wav,.webm,.vtt,.srt,.txt,.md"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      <div className="row">
        <button className="btn" disabled={busy} onClick={() => setStage({ name: "review", text: "", fileName: "", method: "paste" })}>
          <Icon name="paste" /> {t.pasteText}
        </button>
        <button className="btn" disabled={busy} onClick={() => setStage({ name: "record" })}>
          <Icon name="mic" /> {t.recordAudio}
        </button>
        <button className="btn" disabled={busy} onClick={() => setStage({ name: "canvas" })}>
          <Icon name="calendar" /> {t.canvasFrom}
        </button>
        {onCancel && <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>}
      </div>
      {status}
    </div>
  );
}

/** Text the student checks (or pastes) before it becomes material. */
function Review({ t, stage, defaultKind, onAdd, onCancel }: { t: Strings; stage: Extract<Stage, { name: "review" }>; defaultKind: SourceKind; onAdd: (s: NewSource) => void; onCancel: () => void }) {
  const [text, setText] = useState(stage.text);
  const [kind, setKind] = useState<SourceKind>(defaultKind);
  return (
    <div className="intake">
      {stage.fileName && <Notice>{t.reviewText}</Notice>}
      <div className="field">
        <label htmlFor="material-kind">{t.kindLabel}</label>
        <select id="material-kind" value={kind} onChange={(e) => setKind(e.target.value as SourceKind)}>
          {KINDS.map((k) => <option key={k} value={k}>{t.sourceKinds[k]}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="material-text">{stage.fileName || t.pasteLabel}</label>
        <textarea id="material-text" value={text} placeholder={t.pastePlaceholder} onChange={(e) => setText(e.target.value)} autoFocus />
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={text.trim().length < 20} onClick={() => onAdd({ kind, name: stage.fileName || t.sourceKinds[kind], text, method: stage.method })}>
          {t.add}
        </button>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  );
}

/** Assignments from the Canvas calendar feed. The student picks one and checks its text like any other material. */
function CanvasPicker({ t, url, onUrl, onPick, onCancel }: { t: Strings; url: string; onUrl: (u: string) => void; onPick: (text: string, name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[] | null>(null);

  async function load(u: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.canvas(u);
      setItems(r.items);
      if (u !== "demo") onUrl(u);
    } catch (e) {
      setError(errorText(t, e));
    }
    setBusy(false);
  }

  const when = (it: FeedItem) => new Date(it.start.length === 10 ? `${it.start}T12:00` : it.start).toLocaleString(t.locale, { dateStyle: "full", ...(it.start.length === 10 ? {} : { timeStyle: "short" as const }) });
  return (
    <div className="intake">
      <div className="field">
        <label htmlFor="canvas-url">{t.canvasUrlLabel}</label>
        <input id="canvas-url" type="url" inputMode="url" value={value} placeholder="https://…/feeds/calendars/user_….ics" aria-describedby="canvas-help" onChange={(e) => setValue(e.target.value.trim())} />
        <p id="canvas-help" className="muted small">{t.canvasUrlHelp}</p>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={!value || busy} onClick={() => void load(value)}>{t.canvasLoad}</button>
        <button className="btn" disabled={busy} onClick={() => void load("demo")}>{t.canvasDemo}</button>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
      <div aria-live="polite">
        {busy && <Notice>{t.canvasLoading}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
      {items?.length === 0 && <p className="muted">{t.canvasEmpty}</p>}
      {!!items?.length && (
        <>
          <h3 className="h3">{t.canvasPick}</h3>
          <ul className="rows">
            {items.map((it) => (
              <li key={it.uid}>
                {/* The date lives in the calendar entry, not always in its description, so it goes into the text. */}
                <button className="row-card" onClick={() => onPick(`${it.title}\n${t.canvasDue}: ${when(it)}\n\n${it.description}`.trim(), `Canvas · ${it.title}`.slice(0, 80))}>
                  <span className="row-main"><span className="row-title">{it.title}</span><span className="muted small">{when(it)}</span></span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Recorder({ t, onDone, onCancel }: { t: Strings; onDone: (blob: Blob, name: string) => void; onCancel: () => void }) {
  const [seconds, setSeconds] = useState(0);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const ext = rec.mimeType.includes("mp4") ? "m4a" : "webm";
        onDone(new Blob(chunks, { type: rec.mimeType }), `clase-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`);
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(t.micDenied);
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stop();
  }

  return (
    <div className="intake">
      <p className="muted small">{t.audioPermission}</p>
      <div className="row">
        {recording ? (
          <button className="btn btn-primary" onClick={stop}>{t.stop} · <span className="num">{mmss(seconds)}</span></button>
        ) : (
          <button className="btn btn-primary" onClick={start}><Icon name="mic" /> {t.record}</button>
        )}
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
      <div aria-live="polite">
        {recording && <Notice>{t.recording(mmss(seconds))}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
    </div>
  );
}

/** Choose which voices to keep. Only the kept speakers' words become material. */
function SpeakerPicker({ t, segments, fileName, method, estimated, onAdd, onCancel }: {
  t: Strings;
  segments: Segment[];
  fileName: string;
  method: "audio" | "transcript";
  estimated: boolean;
  onAdd: (s: NewSource) => void;
  onCancel: () => void;
}) {
  const stats = speakerStats(segments);
  const [keep, setKeep] = useState<Set<string>>(new Set(stats.slice(0, 1).map((s) => s.speaker)));
  const label = (sp: string, i: number) => (sp === "instructor" ? t.voiceInstructor : sp === "other" ? t.voiceOther : /^speaker_\d+$/.test(sp) ? t.voice(i + 1) : sp);
  const text = transcriptText(segments, keep);
  const toggle = (sp: string) => {
    const next = new Set(keep);
    if (!next.delete(sp)) next.add(sp);
    setKeep(next);
  };
  return (
    <div className="intake">
      <h3 className="h3">{t.speakersTitle}</h3>
      <p className="muted small">{t.speakersHelp}</p>
      {estimated && <Notice>{t.speakersEstimated}</Notice>}
      <ul className="checklist">
        {stats.map((s, i) => {
          const first = segments.find((x) => x.speaker === s.speaker);
          return (
            <li key={s.speaker} className="check">
              <input id={`sp-${i}`} type="checkbox" checked={keep.has(s.speaker)} onChange={() => toggle(s.speaker)} />
              <label htmlFor={`sp-${i}`}>
                <strong>{label(s.speaker, i)}</strong> <span className="muted num">{t.speakerShare(Math.round(s.share * 100))}</span>
                {first && <span className="muted small block">[{mmss(first.start)}] {first.text.slice(0, 90)}{first.text.length > 90 ? "…" : ""}</span>}
              </label>
            </li>
          );
        })}
      </ul>
      <details className="quote">
        <summary>{t.preview}</summary>
        <pre className="source-text">{text || "—"}</pre>
      </details>
      <div className="row">
        <button className="btn btn-primary" disabled={!text.trim()} onClick={() => onAdd({ kind: "class", name: fileName, text, method })}>{t.keepSelected}</button>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  );
}

/** Duration from the file's metadata; 0 when the browser cannot tell (e.g. live webm recordings). */
function audioSeconds(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    const done = (s: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(s) ? s : 0);
    };
    a.preload = "metadata";
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(0), 4000);
    a.src = url;
  });
}

/** Progress of a whole-class job, then the coursework passages to review and add. */
function LongClassJob({ t, id, fileName, onAdd, onCancel }: { t: Strings; id: string; fileName: string; onAdd: (s: NewSource) => void; onCancel: () => void }) {
  const [job, setJob] = useState<AudioJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drop, setDrop] = useState<Set<number>>(new Set()); // passages the student removed

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const j = await api.audioJob(id);
        if (stop) return;
        setJob(j);
        if (j.status === "done" || j.status === "error") return;
      } catch (e) {
        if (!stop) setError(errorText(t, e));
      }
      if (!stop) setTimeout(tick, 3000);
    };
    void tick();
    return () => {
      stop = true;
    };
  }, [id, t]);

  if (error) return <Notice kind="warn">{error}</Notice>;
  if (!job) return <Notice>{t.longPreparing}</Notice>;
  if (job.status === "error") return <Notice kind="warn">{t.errors[job.error ?? "unavailable"] ?? t.errors.unavailable}</Notice>;

  if (job.status !== "done") {
    const extracting = job.status === "extracting";
    const doneParts = extracting ? job.extracted : job.transcribed;
    return (
      <div className="intake" aria-live="polite">
        <p className="strong">{job.status === "splitting" ? t.longPreparing : extracting ? t.longExtracting : t.longTranscribing(mmss(job.duration))}</p>
        {job.parts > 0 && (
          <>
            <progress className="progress" max={job.parts} value={doneParts} aria-label={t.longParts(doneParts, job.parts)} />
            <p className="muted small num">{t.longParts(doneParts, job.parts)}</p>
          </>
        )}
        {job.waitingUntil && <Notice>{t.longWaiting(new Date(job.waitingUntil).toLocaleTimeString(t.locale, { hour: "2-digit", minute: "2-digit" }))}</Notice>}
        <p className="muted small">{t.longKeepOpen}</p>
        <div className="row"><button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button></div>
      </div>
    );
  }

  const passages = job.passages ?? [];
  const selected = passages.filter((_, i) => !drop.has(i));
  const toggle = (i: number) => {
    const next = new Set(drop);
    if (!next.delete(i)) next.add(i);
    setDrop(next);
  };
  return (
    <div className="intake">
      <h3 className="h3">{t.longPassagesTitle(passages.length, mmss(job.duration))}</h3>
      <p className="muted small">{t.longPassagesHelp}</p>
      {passages.length === 0 ? (
        <Notice>{t.longNoPassages}</Notice>
      ) : (
        <ul className="checklist">
          {passages.map((p, i) => (
            <li key={i} className="check">
              <input id={`pa-${i}`} type="checkbox" checked={!drop.has(i)} onChange={() => toggle(i)} />
              <label htmlFor={`pa-${i}`}><span className="muted num">[{p.time}]</span> {p.quote}</label>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button className="btn btn-primary" disabled={selected.length === 0} onClick={() => onAdd({ kind: "class", name: fileName, text: selected.map((p) => `[${p.time}] ${p.quote}`).join("\n"), method: "audio" })}>
          {t.longAdd(selected.length)}
        </button>
        <button className="btn" onClick={() => downloadFile(job.transcript ?? "", `${fileName.replace(/\.[^.]+$/, "")}.txt`, "text/plain;charset=utf-8")}>{t.longDownload}</button>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  );
}
