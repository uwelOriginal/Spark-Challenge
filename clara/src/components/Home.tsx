"use client";

import { useState } from "react";
import { createAssignment, withId } from "@/lib/actions";
import type { Voice } from "@/lib/api";
import { exampleSources } from "@/lib/example";
import type { Strings } from "@/lib/i18n";
import { byDue, nextDue, type Assignment, type Source } from "@/lib/store";
import MaterialInput from "./MaterialInput";
import { daysUntil, errorText, FlowSteps, formatDate, Icon, Notice } from "./ui";

// Home lists the assignments (next due first). Step 1 of the flow, Upload, is its own screen,
// and it is also what a first-time student sees instead of an empty list.

export function Home({ t, assignments, onOpen, onNew }: { t: Strings; assignments: Assignment[]; onOpen: (id: string) => void; onNew: () => void }) {
  const active = byDue(assignments.filter((a) => !a.finishedAt));
  const finished = assignments.filter((a) => a.finishedAt);
  return (
    <div className="screen">
      <header className="title-row">
        <h1 className="h1" tabIndex={-1}>{t.homeTitle}</h1>
        <button className="btn btn-primary" onClick={onNew}><Icon name="plus" /> {t.newTask}</button>
      </header>
      <ul className="rows">
        {active.map((a) => <Row key={a.id} a={a} t={t} onOpen={onOpen} />)}
      </ul>
      {finished.length > 0 && (
        <details className="finished">
          <summary>{t.finishedList(finished.length)}</summary>
          <ul className="rows">{finished.map((a) => <Row key={a.id} a={a} t={t} onOpen={onOpen} />)}</ul>
        </details>
      )}
      <p className="muted small">{t.privacyShort}</p>
    </div>
  );
}

function Row({ a, t, onOpen }: { a: Assignment; t: Strings; onOpen: (id: string) => void }) {
  const d = a.decode;
  const due = nextDue(a);
  return (
    <li>
      <button className="row-card" onClick={() => onOpen(a.id)}>
        <span className="row-main">
          <span className="row-title">{d.title}</span>
          <span className="muted small">
            {t.stepsProgress(a.done.length, d.steps.length)} · {t.openQuestions(d.ambiguities.length)}
          </span>
        </span>
        <span className="row-meta">
          <span className="num">{due ? formatDate(due, t.locale) : t.noDate}</span>
          {due && !a.finishedAt && <span className="muted small">{t.daysLeft(daysUntil(due))}</span>}
        </span>
      </button>
    </li>
  );
}

/** Step 1: gather the material, then let Clara read it. */
export function Upload({ t, voice, first, onCreated }: { t: Strings; voice: Voice; first: boolean; onCreated: (a: Assignment) => void }) {
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function read(list: Source[]) {
    setBusy(true);
    setError(null);
    try {
      onCreated(await createAssignment(list, voice));
    } catch (e) {
      setError(errorText(t, e));
      setBusy(false);
    }
  }

  return (
    <div className="screen narrow">
      <FlowSteps t={t} current={0} />
      <header>
        <h1 className="h1" tabIndex={-1}>{first ? t.uploadFirstTitle : t.uploadTitle}</h1>
        <p className="muted">{t.uploadHelp}</p>
      </header>

      <section className="panel">
        <MaterialInput t={t} defaultKind={sources.length === 0 ? "brief" : "other"} onAdd={(s) => setSources((prev) => [...prev, withId(prev, s)])} />
      </section>

      {sources.length > 0 && (
        <section className="panel" aria-labelledby="material-h">
          <h2 id="material-h" className="h2">{t.material(sources.length)}</h2>
          <ul className="rows">
            {sources.map((s) => (
              <li key={s.id} className="row-card static">
                <span className="row-main">
                  <span className="row-title">{s.name}</span>
                  <span className="muted small">{t.sourceKinds[s.kind]} · {s.text.slice(0, 90).replace(/\s+/g, " ")}…</span>
                </span>
                <button className="icon-btn" aria-label={`${t.remove}: ${s.name}`} onClick={() => setSources((prev) => prev.filter((x) => x.id !== s.id))} disabled={busy}>
                  <Icon name="close" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        <button className="btn btn-primary btn-wide" disabled={busy || sources.length === 0} onClick={() => read(sources)}>{t.readWithClara}</button>
        {sources.length === 0 && <button className="btn btn-quiet" disabled={busy} onClick={() => read(exampleSources(voice.lang))}>{t.tryExample}</button>}
      </div>
      <div aria-live="polite">
        {busy && <Notice>{t.reading}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
    </div>
  );
}
