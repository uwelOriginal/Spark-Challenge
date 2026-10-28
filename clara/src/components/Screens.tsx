"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { exampleSources, nextSourceId } from "@/lib/example";
import type { Strings } from "@/lib/i18n";
import type { Lang } from "@/lib/schemas";
import { newId, nextDue, sourcesKey, type Assignment, type Settings, type Source } from "@/lib/store";
import { toInputs } from "./AssignmentView";
import SourceBuilder, { errorText, SourceList } from "./SourceBuilder";
import { daysUntil, formatDue, Icon, Notice } from "./ui";

type Go = (id: string, tab?: "steps" | "summary" | "unclear") => void;

function blankAssignment(sources: Source[]): Assignment {
  const now = new Date().toISOString();
  return { id: newId(), createdAt: now, updatedAt: now, sources, decode: null, decodedSourcesKey: "", picked: [], done: [], chat: [], changes: [], profName: "", stuck: "", extraQuestions: [] };
}

/** Decode a set of sources into a new saved assignment. */
async function decodeNew(sources: Source[], lang: Lang): Promise<Assignment> {
  const decode = await api.decode(toInputs(sources), lang);
  return { ...blankAssignment(sources), decode, decodedSourcesKey: sourcesKey(sources), picked: decode.ambiguities.map((_, i) => i) };
}

// ---------- Today ----------

export function Today({ t, lang, settings, assignments, onOpen, onNew, onCreate }: {
  t: Strings;
  lang: Lang;
  settings: Settings;
  assignments: Assignment[];
  onOpen: Go;
  onNew: () => void;
  onCreate: (a: Assignment) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const decoded = assignments.filter((a) => a.decode && !a.decode.not_an_assignment);
  const byDue = [...decoded].sort((x, y) => (nextDue(x) ?? "9999").localeCompare(nextDue(y) ?? "9999"));
  const focus = byDue.find((a) => a.decode!.steps.some((_, i) => !a.done.includes(i)));
  const step = focus ? focus.decode!.steps.findIndex((_, i) => !focus.done.includes(i)) : -1;
  const open = decoded.reduce((n, a) => n + a.decode!.ambiguities.length, 0);
  // The questions that matter most: those of the assignment due first, contradictions first.
  const asks = byDue
    .flatMap((a) => a.decode!.ambiguities.map((x) => ({ id: a.id, question: x.question, kind: x.kind })))
    .sort((x, y) => Number(y.kind === "contradiction") - Number(x.kind === "contradiction"))
    .slice(0, 3);
  const firstDue = byDue.find((a) => nextDue(a));
  const today = new Date().toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { weekday: "long", day: "numeric", month: "long" });
  const name = settings.studentName ? `, ${settings.studentName}` : "";

  async function tryExample() {
    setBusy(true);
    setError(null);
    try {
      const a = await decodeNew(exampleSources(lang), lang);
      onCreate(a);
      onOpen(a.id, "summary");
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  // The greeting carries today's one fact, from the data.
  const fact = firstDue
    ? lang === "es"
      ? `Tu siguiente entrega: ${firstDue.decode!.title}, ${t.daysLeft(daysUntil(nextDue(firstDue)!)).toLowerCase()}.`
      : `Next due: ${firstDue.decode!.title}, ${t.daysLeft(daysUntil(nextDue(firstDue)!)).toLowerCase()}.`
    : null;

  return (
    <div className="screen">
      <header className="greeting">
        <h1 className="h1">{lang === "es" ? `Hoy${name}` : `Today${name}`}</h1>
        <p className="muted">{today}{fact ? ` · ${fact}` : ""}</p>
      </header>

      {decoded.length === 0 ? (
        <div className="home-grid">
          <div className="panel panel-student empty-first">
            <h2 className="h2">{t.emptyTitle}</h2>
            <p>{t.emptyBody}</p>
            <div className="row">
              <button className="btn btn-primary" onClick={onNew}><Icon name="plus" /> {t.addFirst}</button>
              <button className="btn" onClick={tryExample} disabled={busy}>{t.tryExample}</button>
            </div>
            <div aria-live="polite">
              {busy && <Notice>{t.exampleLoading}</Notice>}
              {error && <Notice kind="warn">{error}</Notice>}
            </div>
          </div>
          <section className="panel" aria-labelledby="value-h">
            <h2 id="value-h" className="h2">{t.valueTitle}</h2>
            <ul className="value-list">
              {t.valuePoints.map(([title, body]) => (
                <li key={title}>
                  <strong>{title}</strong>
                  <span className="muted small">{body}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : (
        <div className="home-grid">
          <section className="panel panel-student next-step" aria-labelledby="next-h">
            <h2 id="next-h" className="h2">{t.nextStep}</h2>
            {focus && step >= 0 ? (
              <>
                <p className="lead strong">{focus.decode!.steps[step].action}</p>
                <p className="muted">
                  {t.doneWhen}: {focus.decode!.steps[step].done_when} · <span className="num">{t.minutes(focus.decode!.steps[step].minutes)}</span>
                </p>
                <p className="small">{focus.decode!.title}</p>
                <div className="row">
                  <button className="btn btn-primary" onClick={() => onOpen(focus.id, "steps")}>{t.open}</button>
                </div>
              </>
            ) : (
              <p>{t.allStepsDone}</p>
            )}
          </section>

          <div className="stack">
          <section className="panel upcoming" aria-labelledby="up-h">
            <h2 id="up-h" className="h2">{t.upcoming}</h2>
            <ul className="rows">
              {byDue.slice(0, 5).map((a) => {
                const due = nextDue(a);
                return (
                  <li key={a.id}>
                    <button className="row-card" onClick={() => onOpen(a.id, "summary")}>
                      <span className="row-title">{a.decode!.title}</span>
                      <span className="row-meta">
                        <span className="num">{due ? formatDue(due, lang) : t.noDate}</span>
                        {due && <span className="muted small">{t.daysLeft(daysUntil(due))}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
          {asks.length > 0 && (
            <section className="panel" aria-labelledby="ask-h">
              <h2 id="ask-h" className="h2">{t.askTitle}</h2>
              <p className="muted small">{t.openQuestions(open)}</p>
              <ul className="plain ask-list">
                {asks.map((q, i) => <li key={i}>{q.question}</li>)}
              </ul>
              <button className="btn btn-small" onClick={() => onOpen(asks[0].id, "unclear")}>{t.seeMessage}</button>
            </section>
          )}
          </div>
        </div>
      )}
      <p className="muted small foot-note">{t.privacyShort}</p>
    </div>
  );
}

// ---------- Assignment list ----------

export function AssignmentList({ t, lang, assignments, onOpen, onNew }: { t: Strings; lang: Lang; assignments: Assignment[]; onOpen: Go; onNew: () => void }) {
  const items = [...assignments].filter((a) => a.decode).sort((x, y) => (nextDue(x) ?? "9999").localeCompare(nextDue(y) ?? "9999"));
  return (
    <div className="screen">
      <header className="title-row">
        <h1 className="h1">{t.listTitle}</h1>
        <button className="btn btn-primary" onClick={onNew}><Icon name="plus" /> {t.nav.add}</button>
      </header>
      {items.length === 0 ? (
        <div className="panel"><p className="muted">{t.emptyTitle}</p></div>
      ) : (
        <ul className="rows list-rows">
          {items.map((a) => {
            const d = a.decode!;
            const due = nextDue(a);
            return (
              <li key={a.id}>
                <button className="row-card tall" onClick={() => onOpen(a.id, "summary")}>
                  <span className="row-main">
                    <span className="row-title">{d.title}</span>
                    <span className="muted small">
                      {d.course ? `${d.course} · ` : ""}
                      {t.stepsProgress(a.done.length, d.steps.length)} · {t.openQuestions(d.ambiguities.length)}
                    </span>
                  </span>
                  <span className="row-meta">
                    <span className="num">{due ? formatDue(due, lang) : t.noDate}</span>
                    {due && <span className="muted small">{t.daysLeft(daysUntil(due))}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ---------- New assignment ----------

export function NewAssignment({ t, lang, settings, onCanvasUrl, onCreate, onOpen }: {
  t: Strings;
  lang: Lang;
  settings: Settings;
  onCanvasUrl: (u: string) => void;
  onCreate: (a: Assignment) => void;
  onOpen: Go;
}) {
  const [sources, setSources] = useState<Source[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function decode() {
    setBusy(true);
    setError(null);
    try {
      const a = await decodeNew(sources, lang);
      onCreate(a);
      onOpen(a.id, "summary");
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <header className="title-row">
        <h1 className="h1">{t.newTitle}</h1>
      </header>
      <p className="muted">{t.newHelp}</p>
      <div className="panel">
        <h2 className="h2">{t.addSource}</h2>
        <SourceBuilder
          t={t}
          canvasFeedUrl={settings.canvasFeedUrl}
          onCanvasUrl={onCanvasUrl}
          defaultKind={sources.length === 0 ? "brief" : "rubric"}
          onAdd={(s) => setSources((prev) => [...prev, { ...s, id: nextSourceId(prev), addedAt: new Date().toISOString() }])}
        />
        {sources.length === 0 && (
          <button className="btn btn-quiet example-link" onClick={() => setSources(exampleSources(lang))}>{t.useFullExample}</button>
        )}
      </div>
      <div className="panel">
        <h2 className="h2">{t.sourcesAdded}</h2>
        <SourceList t={t} sources={sources} onRemove={(id) => setSources((prev) => prev.filter((s) => s.id !== id))} />
        <div className="row">
          <button className="btn btn-primary btn-wide" disabled={busy || sources.length === 0} onClick={decode}>{t.decode}</button>
        </div>
        <div aria-live="polite">
          {busy && <Notice>{t.decoding}</Notice>}
          {error && <Notice kind="warn">{error}</Notice>}
        </div>
      </div>
    </div>
  );
}

// ---------- Settings ----------

type InstallPrompt = Event & { prompt: () => Promise<void> };

export function SettingsScreen({ t, settings, onSettings, onWipe }: { t: Strings; settings: Settings; onSettings: (p: Partial<Settings>) => void; onWipe: () => void }) {
  const [install, setInstall] = useState<InstallPrompt | null>(null);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const toggleDay = (d: number) =>
    onSettings({ reminderDays: settings.reminderDays.includes(d) ? settings.reminderDays.filter((x) => x !== d) : [...settings.reminderDays, d].sort((a, b) => b - a) });

  return (
    <div className="screen">
      <header className="title-row"><h1 className="h1">{t.settingsTitle}</h1></header>

      <section className="settings-row">
        <div className="settings-label"><h2 className="h2">{t.language}</h2></div>
        <div className="panel">
          <div className="seg" role="radiogroup" aria-label={t.language}>
            {(["es", "en"] as const).map((l) => (
              <button key={l} role="radio" aria-checked={settings.lang === l} className="seg-item" onClick={() => onSettings({ lang: l })}>
                {l === "es" ? "Español" : "English"}
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="student">{t.yourName}</label>
            <input id="student" type="text" value={settings.studentName} onChange={(e) => onSettings({ studentName: e.target.value })} />
          </div>
        </div>
      </section>

      <section className="settings-row">
        <div className="settings-label">
          <h2 className="h2">{t.reminders}</h2>
          <p className="muted small">{t.reminderPrefs(settings.reminderDays, settings.reminderTime)}</p>
        </div>
        <div className="panel">
          <p className="label-strong">{t.daysBefore}</p>
          <div className="seg" role="group" aria-label={t.daysBefore}>
            {[7, 3, 2, 1].map((d) => (
              <button key={d} className="seg-item" aria-pressed={settings.reminderDays.includes(d)} onClick={() => toggleDay(d)}>
                <span className="num">{d}</span>
              </button>
            ))}
          </div>
          <div className="field">
            <label htmlFor="rtime">{t.atTime}</label>
            <input id="rtime" type="time" value={settings.reminderTime} onChange={(e) => onSettings({ reminderTime: e.target.value || "09:00" })} />
          </div>
          <h3 className="h3">{t.notificationsTitle}</h3>
          <p className="small">{t.notificationsBody}</p>
        </div>
      </section>

      <section className="settings-row">
        <div className="settings-label"><h2 className="h2">{t.canvasTitle}</h2><p className="muted small">{t.canvasUrlHelp}</p></div>
        <div className="panel">
          <div className="field">
            <label htmlFor="feed">{t.canvasUrlLabel}</label>
            <input id="feed" type="url" inputMode="url" value={settings.canvasFeedUrl} placeholder="https://…/feeds/calendars/user_….ics" onChange={(e) => onSettings({ canvasFeedUrl: e.target.value.trim() })} />
          </div>
        </div>
      </section>

      <section className="settings-row">
        <div className="settings-label"><h2 className="h2">{t.installTitle}</h2></div>
        <div className="panel">
          <p>{t.installBody}</p>
          {install ? (
            <button className="btn btn-primary" onClick={() => install.prompt()}>{t.installButton}</button>
          ) : (
            <p className="muted small">{t.installManual}</p>
          )}
        </div>
      </section>

      <section className="settings-row">
        <div className="settings-label"><h2 className="h2">{t.privacyTitle}</h2></div>
        <div className="panel">
          <p className="small">{t.privacyBody}</p>
          {!confirm ? (
            <button className="btn btn-quiet danger" onClick={() => setConfirm(true)}>{t.wipe}</button>
          ) : (
            <button className="btn danger-solid" onClick={() => { onWipe(); setConfirm(false); }}>{t.wipeConfirm}</button>
          )}
          <p className="muted small">{t.about}</p>
        </div>
      </section>
    </div>
  );
}
