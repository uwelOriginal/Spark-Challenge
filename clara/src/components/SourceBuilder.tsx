"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError, type AudioJobStatus } from "@/lib/api";
import type { Strings } from "@/lib/i18n";
import type { FeedItem } from "@/lib/ics";
import type { SourceKind } from "@/lib/schemas";
import type { Source } from "@/lib/store";
import { mmss, parseTranscriptFile, speakerStats, transcriptText, type Segment } from "@/lib/transcript";
import { Icon, Notice, SourceChip } from "./ui";

type Method = "paste" | "file" | "audio" | "transcript" | "canvas";
type NewSource = Omit<Source, "id" | "addedAt">;

const KINDS: SourceKind[] = ["brief", "rubric", "class", "announcement", "other"];

export function errorText(t: Strings, e: unknown): string {
  return t.errors[e instanceof ApiError ? e.message : "unavailable"] ?? t.errors.unavailable;
}

/** Add sources to an assignment: paste, PDF/photo, class audio, transcript file or Canvas. */
export default function SourceBuilder(props: {
  t: Strings;
  canvasFeedUrl: string;
  onCanvasUrl: (url: string) => void;
  onAdd: (s: NewSource, titleHint?: string) => void;
  defaultKind?: SourceKind;
}) {
  const { t } = props;
  const [method, setMethod] = useState<Method | null>(null);
  const methods: { id: Method; icon: string }[] = [
    { id: "paste", icon: "paste" },
    { id: "file", icon: "file" },
    { id: "audio", icon: "mic" },
    { id: "transcript", icon: "transcript" },
    { id: "canvas", icon: "canvas" },
  ];
  const done = (s: NewSource, hint?: string) => {
    props.onAdd(s, hint);
    setMethod(null);
  };

  return (
    <div className="builder">
      <div className="method-grid" role="group" aria-label={t.addSource}>
        {methods.map((m) => (
          <button key={m.id} className="method" aria-pressed={method === m.id} onClick={() => setMethod(method === m.id ? null : m.id)}>
            <Icon name={m.icon} size={20} />
            <span>{t.methods[m.id]}</span>
          </button>
        ))}
      </div>
      {method && <p className="muted small method-help">{t.methodHelp[method]}</p>}
      {method === "paste" && <PasteSource t={t} defaultKind={props.defaultKind ?? "brief"} onDone={done} onCancel={() => setMethod(null)} />}
      {method === "file" && <FileSource t={t} defaultKind={props.defaultKind ?? "brief"} onDone={done} onCancel={() => setMethod(null)} />}
      {method === "audio" && <AudioSource t={t} onDone={done} onCancel={() => setMethod(null)} />}
      {method === "transcript" && <TranscriptSource t={t} onDone={done} onCancel={() => setMethod(null)} />}
      {method === "canvas" && <CanvasSource t={t} url={props.canvasFeedUrl} onUrl={props.onCanvasUrl} onDone={done} />}
    </div>
  );
}

function KindSelect({ t, value, onChange }: { t: Strings; value: SourceKind; onChange: (k: SourceKind) => void }) {
  return (
    <div className="field">
      <label htmlFor="kind">{t.kindLabel}</label>
      <div className="seg" role="radiogroup" id="kind">
        {KINDS.map((k) => (
          <button key={k} role="radio" aria-checked={value === k} className={`seg-item src-${k}`} onClick={() => onChange(k)}>
            {t.sourceKinds[k]}
          </button>
        ))}
      </div>
    </div>
  );
}

function PasteSource({ t, defaultKind, onDone, onCancel }: { t: Strings; defaultKind: SourceKind; onDone: (s: NewSource) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<SourceKind>(defaultKind);
  const [name, setName] = useState("");
  return (
    <div className="panel-inner">
      <KindSelect t={t} value={kind} onChange={setKind} />
      <div className="field">
        <label htmlFor="paste-text">{t.methods.paste}</label>
        <textarea id="paste-text" value={text} placeholder={t.pastePlaceholder} onChange={(e) => setText(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="paste-name">{t.nameLabel}</label>
        <input id="paste-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={text.trim().length < 20} onClick={() => onDone({ kind, name: name || t.sourceKinds[kind], text, method: "paste" })}>
          {t.add}
        </button>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  );
}

function FileSource({ t, defaultKind, onDone, onCancel }: { t: Strings; defaultKind: SourceKind; onDone: (s: NewSource) => void; onCancel: () => void }) {
  const [kind, setKind] = useState<SourceKind>(defaultKind);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<{ name: string; text: string; method: "pdf" | "image" } | null>(null);
  async function onFile(f?: File) {
    if (!f) return;
    setBusy(true);
    setError(null);
    try {
      const r = await api.extract(f);
      setFile({ name: f.name, text: r.text, method: f.type.startsWith("image/") ? "image" : "pdf" });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-inner">
      <KindSelect t={t} value={kind} onChange={setKind} />
      {!file && (
        <label className="btn file-btn">
          <Icon name="file" /> {busy ? t.reading : t.methods.file}
          <input className="sr-only" type="file" accept=".pdf,image/png,image/jpeg,image/webp" disabled={busy} onChange={(e) => onFile(e.target.files?.[0])} />
        </label>
      )}
      {error && <Notice kind="warn">{error}</Notice>}
      {file && (
        <>
          <Notice>{t.reviewText}</Notice>
          <textarea aria-label={file.name} value={file.text} onChange={(e) => setFile({ ...file, text: e.target.value })} />
          <div className="row">
            <button className="btn btn-primary" disabled={file.text.trim().length < 20} onClick={() => onDone({ kind, name: file.name, text: file.text, method: file.method })}>
              {t.add}
            </button>
            <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
          </div>
        </>
      )}
    </div>
  );
}

/** Choose which voices to keep. Only the kept speakers' words become the source. */
function SpeakerPicker({ t, segments, onDone, method, fileName, estimated = false }: { t: Strings; segments: Segment[]; onDone: (s: NewSource) => void; method: "audio" | "transcript"; fileName: string; estimated?: boolean }) {
  const stats = speakerStats(segments);
  const [keep, setKeep] = useState<Set<string>>(new Set(stats.slice(0, 1).map((s) => s.speaker)));
  const label = (sp: string, i: number) =>
    sp === "instructor" ? t.voiceInstructor : sp === "other" ? t.voiceOther : /^speaker_\d+$/.test(sp) ? t.voice(i + 1) : sp;
  const text = transcriptText(segments, keep);
  return (
    <div className="panel-inner">
      <h3 className="h3">{t.speakersTitle}</h3>
      <p className="muted small">{t.speakersHelp}</p>
      {estimated && <Notice>{t.speakersEstimated}</Notice>}
      <ul className="speakers">
        {stats.map((s, i) => {
          const first = segments.find((x) => x.speaker === s.speaker);
          return (
            <li key={s.speaker} className="check">
              <input
                id={`sp-${i}`}
                type="checkbox"
                checked={keep.has(s.speaker)}
                onChange={() => {
                  const next = new Set(keep);
                  if (next.has(s.speaker)) next.delete(s.speaker);
                  else next.add(s.speaker);
                  setKeep(next);
                }}
              />
              <label htmlFor={`sp-${i}`}>
                <strong>{label(s.speaker, i)}</strong> <span className="muted num">{t.speakerShare(Math.round(s.share * 100))}</span>
                {first && (
                  <span className="muted small speaker-sample">
                    [{mmss(first.start)}] {first.text.slice(0, 90)}
                    {first.text.length > 90 ? "…" : ""}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>
      <details className="quote">
        <summary>{t.preview}</summary>
        <pre className="transcript-preview">{text || "—"}</pre>
      </details>
      <div className="row">
        <button
          className="btn btn-primary"
          disabled={!text.trim()}
          onClick={() => onDone({ kind: "class", name: fileName, text, method })}
        >
          {t.keepSelected}
        </button>
      </div>
    </div>
  );
}

function AudioSource({ t, onDone, onCancel }: { t: Strings; onDone: (s: NewSource) => void; onCancel: () => void }) {
  const [state, setState] = useState<"idle" | "recording" | "busy">("idle");
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [estimated, setEstimated] = useState(false);
  const [longJob, setLongJob] = useState<{ id: string; name: string } | null>(null);
  const [name, setName] = useState("");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stream.getTracks().forEach((tr) => tr.stop());
  }, []);

  async function send(blob: Blob, fileName: string) {
    setState("busy");
    setError(null);
    // Whole classes go through the background job (split, parallel, resumable).
    if (blob.size > LONG_AUDIO_BYTES || (await audioSeconds(blob)) > LONG_AUDIO_SECONDS) {
      try {
        const { id } = await api.startAudioJob(blob, fileName, t.locale.startsWith("es") ? "es" : "en");
        setLongJob({ id, name: fileName });
      } catch (e) {
        setError(errorText(t, e));
      }
      setState("idle");
      return;
    }
    try {
      const r = await api.transcribe(blob, fileName, t.locale.startsWith("es") ? "es" : "en");
      setSegments(r.segments);
      setEstimated(r.diarization !== "acoustic");
      setName(fileName);
      setState("idle");
    } catch (e) {
      setError(errorText(t, e));
      setState("idle");
    }
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((m) => MediaRecorder.isTypeSupported(m));
      const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32_000 });
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        const ext = rec.mimeType.includes("mp4") ? "m4a" : "webm";
        void send(blob, `clase-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-")}.${ext}`);
      };
      recorder.current = rec;
      rec.start();
      setSeconds(0);
      setState("recording");
      timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError(t.micDenied);
    }
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
    recorder.current?.stop();
  }

  if (longJob) return <LongClassJob t={t} id={longJob.id} fileName={longJob.name} onDone={onDone} onCancel={onCancel} />;
  if (segments) return <SpeakerPicker t={t} segments={segments} onDone={onDone} method="audio" fileName={name} estimated={estimated} />;
  return (
    <div className="panel-inner">
      <div className="row">
        {state !== "recording" ? (
          <button className="btn btn-primary" onClick={start} disabled={state === "busy"}>
            <Icon name="mic" /> {t.record}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={stop}>
            {t.stop} · <span className="num">{mmss(seconds)}</span>
          </button>
        )}
        <label className="btn file-btn">
          {t.uploadAudio}
          <input className="sr-only" type="file" accept="audio/*,video/mp4,.m4a,.mp3,.wav,.webm" disabled={state !== "idle"} onChange={(e) => e.target.files?.[0] && send(e.target.files[0], e.target.files[0].name)} />
        </label>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
      <div aria-live="polite">
        {state === "recording" && <Notice>{t.recording(mmss(seconds))}</Notice>}
        {state === "busy" && <Notice>{t.transcribing}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
    </div>
  );
}

const LONG_AUDIO_BYTES = 20 * 1024 * 1024; // Groq free tier takes 25 MB per file; keep a margin
const LONG_AUDIO_SECONDS = 30 * 60;

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
function LongClassJob({ t, id, fileName, onDone, onCancel }: { t: Strings; id: string; fileName: string; onDone: (s: NewSource) => void; onCancel: () => void }) {
  const [job, setJob] = useState<AudioJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keep, setKeep] = useState<Set<number> | null>(null);

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

  useEffect(() => {
    if (job?.passages && !keep) setKeep(new Set(job.passages.map((_, i) => i)));
  }, [job, keep]);

  if (error) return <Notice kind="warn">{error}</Notice>;
  if (!job) return <Notice>{t.longPreparing}</Notice>;
  if (job.status === "error") return <Notice kind="warn">{t.errors[job.error ?? "unavailable"] ?? t.errors.unavailable}</Notice>;

  if (job.status !== "done") {
    const extracting = job.status === "extracting";
    const doneParts = extracting ? job.extracted : job.transcribed;
    return (
      <div className="panel-inner" aria-live="polite">
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
  const selected = passages.filter((_, i) => keep?.has(i));
  const download = () => {
    const blob = new Blob([job.transcript ?? ""], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName.replace(/\.[^.]+$/, "")}-transcripcion.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };
  return (
    <div className="panel-inner">
      <h3 className="h3">{t.longPassagesTitle(passages.length, mmss(job.duration))}</h3>
      <p className="muted small">{t.longPassagesHelp}</p>
      {passages.length === 0 ? (
        <Notice>{t.longNoPassages}</Notice>
      ) : (
        <ul className="speakers">
          {passages.map((p, i) => (
            <li key={i} className="check">
              <input
                id={`pa-${i}`}
                type="checkbox"
                checked={keep?.has(i) ?? true}
                onChange={() => {
                  const next = new Set(keep ?? []);
                  if (next.has(i)) next.delete(i);
                  else next.add(i);
                  setKeep(next);
                }}
              />
              <label htmlFor={`pa-${i}`}>
                <span className="muted num">[{p.time}]</span> {p.quote}
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="row">
        <button
          className="btn btn-primary"
          disabled={selected.length === 0}
          onClick={() => onDone({ kind: "class", name: fileName, text: selected.map((p) => `[${p.time}] ${p.quote}`).join("\n"), method: "audio" })}
        >
          {t.longAdd(selected.length)}
        </button>
        <button className="btn" onClick={download}>{t.longDownload}</button>
      </div>
    </div>
  );
}

function TranscriptSource({ t, onDone, onCancel }: { t: Strings; onDone: (s: NewSource) => void; onCancel: () => void }) {
  const [segments, setSegments] = useState<Segment[] | null>(null);
  const [name, setName] = useState("");
  if (segments) return <SpeakerPicker t={t} segments={segments} onDone={onDone} method="transcript" fileName={name} />;
  return (
    <div className="panel-inner">
      <div className="row">
        <label className="btn file-btn">
          <Icon name="transcript" /> {t.methods.transcript}
          <input
            className="sr-only"
            type="file"
            accept=".vtt,.srt,.txt,.md,text/vtt,text/plain"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setName(f.name);
              setSegments(parseTranscriptFile(await f.text()));
            }}
          />
        </label>
        <button className="btn btn-quiet" onClick={onCancel}>{t.cancel}</button>
      </div>
    </div>
  );
}

function CanvasSource({ t, url, onUrl, onDone }: { t: Strings; url: string; onUrl: (u: string) => void; onDone: (s: NewSource, hint?: string) => void }) {
  const [value, setValue] = useState(url);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<FeedItem[] | null>(null);
  async function load(u: string) {
    setBusy(true);
    setError(null);
    try {
      const r = await api.canvas(u);
      setItems(r.items.filter((i) => i.isAssignment || u === "demo"));
      if (u !== "demo") onUrl(u);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="panel-inner">
      <div className="field">
        <label htmlFor="canvas-url">{t.canvasUrlLabel}</label>
        <input id="canvas-url" type="url" inputMode="url" value={value} placeholder="https://…/feeds/calendars/user_….ics" onChange={(e) => setValue(e.target.value)} aria-describedby="canvas-help" />
        <p id="canvas-help" className="muted small">{t.canvasUrlHelp}</p>
      </div>
      <div className="row">
        <button className="btn btn-primary" disabled={!value || busy} onClick={() => load(value)}>{t.canvasLoad}</button>
        <button className="btn" disabled={busy} onClick={() => load("demo")}>{t.canvasDemo}</button>
      </div>
      <div aria-live="polite">
        {busy && <Notice>{t.canvasLoading}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
      {items && items.length === 0 && <p className="muted">{t.canvasEmpty}</p>}
      {items && items.length > 0 && (
        <>
          <h3 className="h3">{t.canvasPick}</h3>
          <ul className="rows">
            {items.map((it) => (
              <li key={it.uid}>
                <button
                  className="row-card"
                  onClick={() => onDone({ kind: "brief", name: `Canvas · ${it.title}`, text: it.description || it.title, method: "canvas" }, it.title)}
                >
                  <span className="row-title">{it.title}</span>
                  <span className="row-meta small num">
                    {new Date(it.start.length === 10 ? `${it.start}T12:00:00` : it.start).toLocaleDateString(t.locale, { day: "numeric", month: "short" })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function SourceList({ t, sources, onRemove }: { t: Strings; sources: Source[]; onRemove?: (id: string) => void }) {
  if (sources.length === 0) return <p className="muted empty-line">{t.noSourcesYet}</p>;
  return (
    <ul className="rows">
      {sources.map((s) => (
        <li key={s.id} className="row-card static">
          <div className="row-main">
            <SourceChip kind={s.kind} t={t} />
            <span className="row-title">{s.name}</span>
            <span className="muted small">{s.text.slice(0, 120).replace(/\s+/g, " ")}{s.text.length > 120 ? "…" : ""}</span>
          </div>
          {onRemove && (
            <button className="icon-btn" aria-label={`${t.remove}: ${s.name}`} onClick={() => onRemove(s.id)}>
              <Icon name="close" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
