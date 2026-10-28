"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Strings } from "@/lib/i18n";
import type { SourceKind } from "@/lib/schemas";
import type { Source } from "@/lib/store";

// Small shared pieces. Icons are 1.5px outline, one set, grey by default.

const paths: Record<string, ReactNode> = {
  today: <path d="M4 7h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9 2 2 4-4" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
  plus: <path d="M12 5v14M5 12h14" />,
  settings: <path d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Zm7.4 3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7.5 7.5 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7.5 7.5 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.07-.4.1-.8.1-1.2Z" />,
  back: <path d="M15 5l-7 7 7 7" />,
  paste: <path d="M9 4h6v3H9zM7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1M9 12h6M9 16h4" />,
  file: <path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7l-4-4Zm0 0v4h4M9 13h6M9 17h6" />,
  mic: <path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Zm-7 9a7 7 0 0 0 14 0M12 19v3" />,
  transcript: <path d="M4 5h16v11H8l-4 4V5Zm4 4h8M8 12h5" />,
  canvas: <path d="M4 4h16v16H4zM4 9h16M9 9v11" />,
  send: <path d="M4 12l16-8-6 16-2-7-8-1Z" />,
  check: <path d="M5 12l4 4 10-10" />,
  calendar: <path d="M4 7h16M7 3v4m10-4v4M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
};

export function Icon({ name, size = 18 }: { name: keyof typeof paths | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/** Clara's mark: the Neurosurfer's yellow circle holding a wave, from the partner's own diagram. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="16" fill="#FFC700" />
      <path d="M5 19c3.2-4.4 6.4-4.4 9.6 0s6.4 4.4 9.6 0c1-1.4 1.9-2.3 2.8-2.7" fill="none" stroke="#1E4FA3" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function SourceChip({ kind, t, name }: { kind: SourceKind; t: Strings; name?: string }) {
  return (
    <span className={`chip src-${kind}`}>
      {t.sourceKinds[kind]}
      {name ? <span className="chip-name"> · {name}</span> : null}
    </span>
  );
}

/** "See where it says this": the verbatim quote, which source it came from, and whether code found it. */
export function Quote({ quote, sourceId, verified, sources, t, label }: {
  quote: string | null;
  sourceId: string | null;
  verified: boolean;
  sources: Source[];
  t: Strings;
  label?: string;
}) {
  if (!quote) return null;
  const src = sources.find((s) => s.id === sourceId);
  return (
    <details className="quote">
      <summary>
        <span className={verified ? "ok mark-icon" : "warn mark-icon"} aria-hidden="true">{verified ? <Icon name="check" size={15} /> : "!"}</span> {label ?? t.seeSource}
        {src ? <span className="quote-src"> · {t.from} {t.sourceKinds[src.kind].toLowerCase()}</span> : null}
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
          /* clipboard blocked: the text stays selectable in the box */
        }
      }}
    >
      {copied ? t.copied : t.copy}
    </button>
  );
}

/**
 * Read aloud with the device's own voice (Web Speech API): free, offline-capable, no server.
 * Hidden when the browser has no speech synthesis.
 */
export function ListenButton({ text, t }: { text: string; t: Strings }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);
  if (!supported) return null;
  return (
    <button
      className="btn btn-small"
      aria-pressed={speaking}
      onClick={() => {
        const synth = window.speechSynthesis;
        if (speaking) {
          synth.cancel();
          setSpeaking(false);
          return;
        }
        const u = new SpeechSynthesisUtterance(text);
        u.lang = t.locale;
        u.rate = 0.95;
        u.onend = () => setSpeaking(false);
        u.onerror = () => setSpeaking(false);
        synth.cancel();
        synth.speak(u);
        setSpeaking(true);
      }}
    >
      {speaking ? t.stopListening : t.listen}
    </button>
  );
}

export function Notice({ kind = "info", children }: { kind?: "info" | "warn" | "ok"; children: ReactNode }) {
  return <p className={`notice notice-${kind}`} role={kind === "warn" ? "alert" : undefined}>{children}</p>;
}

export function daysUntil(isoDateTime: string): number {
  const due = new Date(isoDateTime);
  const now = new Date();
  const a = Date.UTC(due.getFullYear(), due.getMonth(), due.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((a - b) / 86_400_000);
}

export function formatDue(isoDateTime: string, lang: "es" | "en"): string {
  const d = new Date(isoDateTime);
  return d.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "short", day: "numeric", month: "short" });
}
