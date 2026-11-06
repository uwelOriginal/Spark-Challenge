"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api";
import type { Strings } from "@/lib/i18n";
import type { Source } from "@/lib/store";

// Icons are decorative. Icon buttons carry their own label.

const paths: Record<string, ReactNode> = {
  home: <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  settings: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  upload: <path d="M12 16V4m0 0-5 5m5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />,
  paste: <path d="M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h4" />,
  mic: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" />,
  send: <path d="M4 12l16-8-6 16-2-7-8-1Z" />,
  check: <path d="M5 12l4 4 10-10" />,
  calendar: <path d="M4 7h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  install: <path d="M12 4v12m0 0-5-5m5 5 5-5M4 20h16" />,
  mail: <path d="M4 6h16v12H4zM4 7l8 6 8-6" />,
  flag: <path d="M5 21V4m0 0h11l-2 4 2 4H5" />,
  speaker: <path d="M5 9v6h4l5 4V5L9 9H5Zm12 0a4 4 0 0 1 0 6" />,
};

export function Icon({ name, size = 20 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

// yellow circle from the partner's diagram
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#FFC700" />
      <path d="M5 19c3.2-4.4 6.4-4.4 9.6 0s6.4 4.4 9.6 0c1-1.4 1.9-2.3 2.8-2.7" fill="none" stroke="#1E4FA3" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function FlowSteps({ t, current }: { t: Strings; current: 0 | 1 | 2 }) {
  return (
    <ol className="flow" aria-label="Clara">
      {t.flow.map((label, i) => (
        <li key={label} className="flow-step" data-state={i < current ? "done" : i === current ? "current" : "next"} aria-current={i === current ? "step" : undefined}>
          <span className="flow-num" aria-hidden="true">{i < current ? <Icon name="check" size={14} /> : i + 1}</span>
          <span>{label}</span>
        </li>
      ))}
    </ol>
  );
}

// native radios for keyboard and screen readers
export function Choice<T extends string>({ legend, name, value, options, onChange, help, wide = false }: {
  legend: string;
  name: string;
  value: T;
  options: { value: T; label: string; swatch?: string }[];
  onChange: (v: T) => void;
  help?: string;
  wide?: boolean;
}) {
  return (
    <fieldset className={wide ? "choice choice-wide" : "choice"}>
      <legend>{legend}</legend>
      {help && <p className="muted small">{help}</p>}
      <div className="choice-options">
        {options.map((o) => (
          <label key={o.value} className="choice-option">
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.swatch && <span className="swatch" data-accent={o.swatch} aria-hidden="true" />}
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Quote({ quote, sourceId, verified, sources, t }: { quote: string | null; sourceId: string | null; verified: boolean; sources: Source[]; t: Strings }) {
  if (!quote) return null;
  const src = sources.find((s) => s.id === sourceId);
  return (
    <details className="quote">
      <summary>
        <span className={verified ? "ok" : "warn"} aria-hidden="true">{verified ? <Icon name="check" size={15} /> : "!"}</span> {t.seeSource}
        {src ? <span className="muted"> · {t.from} {src.name}</span> : null}
      </summary>
      <blockquote>“{quote}”</blockquote>
      <p className={verified ? "ok small" : "warn small"}>{verified ? t.verified : t.unverified}</p>
    </details>
  );
}

export function CopyButton({ text, t }: { text: string; t: Strings }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* clipboard blocked, text is still selectable */
        }
      }}
    >
      <span aria-live="polite">{copied ? t.copied : t.copy}</span>
    </button>
  );
}

// Web Speech API, hidden when unsupported
export function ListenButton({ text, t, rate, label }: { text: string; t: Strings; rate: number; label?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported("speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  return (
    <button
      className="btn btn-quiet btn-small"
      aria-pressed={speaking}
      onClick={() => {
        const synth = window.speechSynthesis;
        synth.cancel();
        if (speaking) return setSpeaking(false);
        const u = new SpeechSynthesisUtterance(text);
        u.lang = t.locale;
        u.rate = rate;
        u.onend = u.onerror = () => setSpeaking(false);
        synth.speak(u);
        setSpeaking(true);
      }}
    >
      <Icon name="speaker" size={18} /> {speaking ? t.stopListening : (label ?? t.listen)}
    </button>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "ok"; children: ReactNode }) {
  return <p className={`notice notice-${kind}`} role={kind === "warn" ? "alert" : undefined}>{children}</p>;
}

export function errorText(t: Strings, e: unknown): string {
  return t.errors[e instanceof ApiError ? e.message : "unavailable"] ?? t.errors.unavailable;
}

export function daysUntil(isoDateTime: string): number {
  const due = new Date(isoDateTime);
  const now = new Date();
  return Math.round((Date.UTC(due.getFullYear(), due.getMonth(), due.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86_400_000);
}

export function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" });
}

// served as a real file so the calendar app opens it
export function openCalendar(ics: string, name: string) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "/api/calendar";
  for (const [key, value] of Object.entries({ ics, name })) {
    const field = document.createElement("textarea");
    field.name = key;
    field.value = value;
    form.appendChild(field);
  }
  form.hidden = true;
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

export function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
