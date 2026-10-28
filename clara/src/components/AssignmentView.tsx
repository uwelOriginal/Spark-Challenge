"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { downloadIcs, planEvents } from "@/lib/calendar";
import { exampleNewVersion, nextSourceId } from "@/lib/example";
import type { Strings } from "@/lib/i18n";
import type { DecodeResult, Lang, SourceInput } from "@/lib/schemas";
import { nextDue, type Assignment, type Settings, type Source } from "@/lib/store";
import { mentorSummary, professorMessage } from "@/lib/templates";
import SourceBuilder, { errorText, SourceList } from "./SourceBuilder";
import { CopyButton, daysUntil, formatDue, Icon, ListenButton, Notice, Quote, SourceChip } from "./ui";

export type Tab = "summary" | "deliver" | "unclear" | "steps" | "chat" | "calendar" | "changes" | "mentor";
const TABS: Tab[] = ["summary", "deliver", "unclear", "steps", "chat", "calendar", "changes", "mentor"];

export const toInputs = (sources: Source[]): SourceInput[] => sources.map(({ id, kind, name, text }) => ({ id, kind, name, text }));
const combined = (t: Strings, sources: Source[]) => sources.map((s) => `${t.sourceKinds[s.kind]}: ${s.name}\n${s.text}`).join("\n\n");

export function summaryText(d: DecodeResult): string {
  return [
    d.title,
    ...d.literal_summary,
    ...d.deadlines.map((x) => `Deadline: ${x.item}: ${x.when}`),
    ...d.ambiguities.map((x) => `Open question (${x.kind}): ${x.issue}`),
  ].join("\n");
}

export default function AssignmentView(props: {
  a: Assignment;
  settings: Settings;
  t: Strings;
  lang: Lang;
  tab: Tab;
  onTab: (t: Tab) => void;
  onUpdate: (a: Assignment) => void;
  onDelete: (id: string) => void;
  onCanvasUrl: (u: string) => void;
  onStudentName: (n: string) => void;
}) {
  const { a, t, lang, tab } = props;
  const d = a.decode!;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const due = nextDue(a);
  const questions = [...d.ambiguities.filter((_, i) => a.picked.includes(i)).map((x) => x.question), ...(a.extraQuestions ?? [])];

  /** A new source re-decodes the assignment and records what changed, in one step. */
  async function addSource(s: Omit<Source, "id" | "addedAt">) {
    const src: Source = { ...s, id: nextSourceId(a.sources), addedAt: new Date().toISOString() };
    const sources = [...a.sources, src];
    setBusy(true);
    setError(null);
    try {
      const [decode, changes] = await Promise.all([
        api.decode(toInputs(sources), lang),
        api.changes(combined(t, a.sources), combined(t, sources), lang),
      ]);
      props.onUpdate({
        ...a,
        sources,
        decode,
        picked: decode.ambiguities.map((_, i) => i),
        done: [],
        changes: [{ at: new Date().toISOString(), result: changes }, ...a.changes],
      });
      props.onTab("changes");
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  const panels: Record<Tab, React.ReactNode> = {
    summary: <Summary {...props} questions={questions} onAddSource={addSource} busy={busy} error={error} />,
    deliver: <Deliver d={d} sources={a.sources} t={t} />,
    unclear: <Unclear {...props} questions={questions} />,
    steps: <Steps {...props} />,
    chat: <Chat {...props} />,
    calendar: <Calendar {...props} />,
    changes: <Changes {...props} onAddSource={addSource} busy={busy} error={error} />,
    mentor: <Mentor {...props} questions={questions} />,
  };

  return (
    <article className="detail">
      <header className="detail-head">
        <h1 className="h1">{d.title}</h1>
        <p className="muted">
          {d.course ? `${d.course} · ` : ""}
          {due ? `${t.dueEvent} ${formatDue(due, lang)} · ${t.daysLeft(daysUntil(due))}` : t.noDate}
        </p>
      </header>
      {d.ambiguities.some((x) => x.kind === "contradiction") && (
        <button className="pill pill-contradiction pill-button" onClick={() => props.onTab("unclear")}>
          {t.sourcesDisagree} ›
        </button>
      )}
      {d.injected_instructions_ignored && <Notice kind="warn">{t.injectionNote}</Notice>}
      <nav className="tabs" aria-label={d.title}>
        {TABS.map((id) => (
          <button key={id} className="tab" aria-current={tab === id ? "page" : undefined} onClick={() => props.onTab(id)}>
            {t.tabs[id]}
            {id === "unclear" && d.ambiguities.length > 0 ? <span className="count num">{d.ambiguities.length}</span> : null}
          </button>
        ))}
      </nav>
      <section className="tab-panel" aria-label={t.tabs[tab]}>{panels[tab]}</section>
    </article>
  );
}

// ---------- Summary: the literal summary and the source cross-check ----------

function Summary(props: Parameters<typeof AssignmentView>[0] & { questions: string[]; onAddSource: (s: Omit<Source, "id" | "addedAt">) => void; busy: boolean; error: string | null }) {
  const { a, t } = props;
  const d = a.decode!;
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const facts = [...d.deliverables, ...d.deadlines, ...d.format_requirements, ...d.grading_criteria];
  return (
    <div className="stack">
      <div className="panel">
        {d.literal_summary.map((s, i) => (
          <p key={i} className={i === 0 ? "lead" : undefined}>{s}</p>
        ))}
        <p className="verified-line">
          <Icon name="check" /> {t.verifiedBadge(d.quote_check.verified, d.quote_check.total)}
        </p>
        <ListenButton text={d.literal_summary.join(" ")} t={t} />
        {d.ambiguities.length > 0 && (
          <button className="row-card link-row" onClick={() => props.onTab("unclear")}>
            <span className="row-title">{t.notGuessed(d.ambiguities.length)}</span>
            <span className="link">{t.seeUnclear} ›</span>
          </button>
        )}
      </div>

      <div className="panel">
        <h2 className="h2">{t.sourcesTitle}</h2>
        <ul className="xcheck">
          {a.sources.map((s) => {
            const backed = facts.filter((f) => f.source_id === s.id && f.verified).length;
            const conflicts = d.ambiguities.filter((x) => x.kind === "contradiction" && x.source_id === s.id);
            return (
              <li key={s.id} className={`xcheck-row src-edge-${s.kind}`}>
                <div className="xcheck-main">
                  <SourceChip kind={s.kind} t={t} />
                  <span className="row-title">{s.name}</span>
                </div>
                <div className="xcheck-facts">
                  <span className="num">{backed}</span> <span className="muted small">{t.factsBacked}</span>
                  {conflicts.length > 0 && <span className="pill pill-contradiction">{t.kind.contradiction}</span>}
                </div>
                <details className="quote">
                  <summary>{t.showText}</summary>
                  <pre className="transcript-preview">{s.text}</pre>
                </details>
              </li>
            );
          })}
        </ul>
        {!adding ? (
          <button className="row-card link-row" onClick={() => setAdding(true)} disabled={props.busy}>
            <span className="row-main">
              <span className="row-title">{t.addSource}</span>
              <span className="muted small">{t.addMoreSourcesHelp}</span>
            </span>
            <Icon name="plus" />
          </button>
        ) : (
          <SourceBuilder t={t} canvasFeedUrl={props.settings.canvasFeedUrl} onCanvasUrl={props.onCanvasUrl} defaultKind="announcement" onAdd={(s) => { setAdding(false); props.onAddSource(s); }} />
        )}
        <div aria-live="polite">
          {props.busy && <Notice>{t.redecoding}</Notice>}
          {props.error && <Notice kind="warn">{props.error}</Notice>}
        </div>
      </div>

      <div className="danger-zone">
        {!confirmDelete ? (
          <button className="btn btn-quiet danger" onClick={() => setConfirmDelete(true)}>{t.deleteAssignment}</button>
        ) : (
          <button className="btn danger-solid" onClick={() => props.onDelete(a.id)}>{t.confirmDelete}: {d.title}</button>
        )}
      </div>
    </div>
  );
}

// ---------- What to hand in ----------

function Deliver({ d, sources, t }: { d: DecodeResult; sources: Source[]; t: Strings }) {
  const group = (title: string, items: { main: string; sub?: string | null; quote: string; sid: string; verified: boolean; warn?: boolean }[]) => (
    <div className="panel">
      <h2 className="h2">{title}</h2>
      {items.length === 0 ? (
        <p className="muted">{t.noneFound}</p>
      ) : (
        <ul className="items">
          {items.map((it, i) => (
            <li key={i}>
              <div className="item-main">{it.main}</div>
              {it.sub && <div className="muted small">{it.sub}</div>}
              {it.warn && <p className="warn small">{t.dateMismatch}</p>}
              <Quote quote={it.quote} sourceId={it.sid} verified={it.verified} sources={sources} t={t} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
  return (
    <div className="stack">
      {group(t.deadlines, d.deadlines.map((x) => ({ main: `${x.item}: ${x.when}`, quote: x.quote, sid: x.source_id, verified: x.verified, warn: x.date_check === "mismatch" })))}
      {group(t.deliverables, d.deliverables.map((x) => ({ main: x.item, sub: x.details, quote: x.quote, sid: x.source_id, verified: x.verified })))}
      {group(t.format, d.format_requirements.map((x) => ({ main: x.item, quote: x.quote, sid: x.source_id, verified: x.verified })))}
      {group(t.grading, d.grading_criteria.map((x) => ({ main: x.weight ? `${x.item} · ${x.weight}` : x.item, quote: x.quote, sid: x.source_id, verified: x.verified })))}
    </div>
  );
}

// ---------- Ask, don't guess ----------

function Unclear(props: Parameters<typeof AssignmentView>[0] & { questions: string[] }) {
  const { a, t, lang, settings } = props;
  const d = a.decode!;
  const draft = professorMessage(lang, { title: d.title, questions: props.questions, profName: a.profName, studentName: settings.studentName });
  const [message, setMessage] = useState(draft);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setMessage(draft);
  }, [draft, edited]);
  const [subject, ...bodyLines] = message.split("\n");
  const mailto = `mailto:?subject=${encodeURIComponent(subject.replace(/^(Asunto|Subject):\s*/, ""))}&body=${encodeURIComponent(bodyLines.join("\n").trim())}`;

  return (
    <div className="stack">
      {d.ambiguities.length === 0 ? (
        <Notice kind="ok">{t.noAmbiguities}</Notice>
      ) : (
        <div className="panel">
          <ul className="items">
            {d.ambiguities.map((x, i) => (
              <li key={i}>
                <div className="item-head">
                  <span className={`pill pill-${x.kind}`}>{t.kind[x.kind]}</span>
                  <strong>{x.issue}</strong>
                </div>
                <p className="small"><span className="muted">{t.whyItMatters}: </span>{x.why_it_matters}</p>
                <div className="check">
                  <input
                    id={`q-${i}`}
                    type="checkbox"
                    checked={a.picked.includes(i)}
                    onChange={() => props.onUpdate({ ...a, picked: a.picked.includes(i) ? a.picked.filter((p) => p !== i) : [...a.picked, i] })}
                  />
                  <label htmlFor={`q-${i}`}><span className="muted">{t.askProfessor}: </span>{x.question}</label>
                </div>
                <Quote quote={x.quote} sourceId={x.source_id} verified={x.verified} sources={a.sources} t={t} />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="panel">
        <h2 className="h2">{t.messageTitle}</h2>
        <p className="muted small">{t.messageHelp}</p>
        <div className="two">
          <div className="field">
            <label htmlFor="prof">{t.profName}</label>
            <input id="prof" type="text" value={a.profName} onChange={(e) => props.onUpdate({ ...a, profName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="me">{t.yourName}</label>
            <input id="me" type="text" value={settings.studentName} onChange={(e) => props.onStudentName(e.target.value)} />
          </div>
        </div>
        <textarea className="message" aria-label={t.messageTitle} value={message} onChange={(e) => { setMessage(e.target.value); setEdited(true); }} />
        <div className="row">
          <a className="btn btn-primary" href={mailto}>{t.openEmail}</a>
          <CopyButton text={message} t={t} />
        </div>
      </div>
    </div>
  );
}

// ---------- Where to start ----------

function Steps(props: Parameters<typeof AssignmentView>[0]) {
  const { a, t } = props;
  const d = a.decode!;
  if (d.steps.length === 0) return <p className="muted">{t.noneFound}</p>;
  const toggle = (i: number) => props.onUpdate({ ...a, done: a.done.includes(i) ? a.done.filter((x) => x !== i) : [...a.done, i] });
  const next = d.steps.findIndex((_, i) => !a.done.includes(i));
  return (
    <div className="stack">
      {next >= 0 ? (
        <div className="panel panel-student">
          <p className="label">{next === 0 ? t.firstStep : t.nextStep} · <span className="num">{t.minutes(d.steps[next].minutes)}</span></p>
          <p className="lead strong">{d.steps[next].action}</p>
          <p className="muted">{t.doneWhen}: {d.steps[next].done_when}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => toggle(next)}><Icon name="check" /> {t.markDone}</button>
            <ListenButton text={`${d.steps[next].action}. ${t.doneWhen}: ${d.steps[next].done_when}`} t={t} />
          </div>
        </div>
      ) : (
        <Notice kind="ok">{t.allStepsDone}</Notice>
      )}
      <div className="panel">
        <ul className="items">
          {d.steps.map((s, i) => (
            <li key={i} className="check">
              <input id={`st-${i}`} type="checkbox" checked={a.done.includes(i)} onChange={() => toggle(i)} />
              <label htmlFor={`st-${i}`}>
                <span className={a.done.includes(i) ? "done" : undefined}>{s.action}</span> <span className="muted num">({t.minutes(s.minutes)})</span>
                <span className="muted small block">{t.doneWhen}: {s.done_when}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ---------- Grounded chat ----------

function Chat(props: Parameters<typeof AssignmentView>[0]) {
  const { a, t, lang } = props;
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup function.
    void end.current?.scrollIntoView({ block: "end" });
  }, [a.chat.length, busy]);

  async function send(message: string) {
    const msg = message.trim();
    if (!msg) return;
    const history = a.chat.map((c) => ({ role: c.role, text: c.text }));
    const withUser = { ...a, chat: [...a.chat, { role: "user" as const, text: msg, at: new Date().toISOString() }] };
    props.onUpdate(withUser);
    setText("");
    setBusy(true);
    setError(null);
    try {
      const r = await api.chat(toInputs(a.sources), summaryText(a.decode!), history, msg, lang);
      props.onUpdate({ ...withUser, chat: [...withUser.chat, { role: "assistant", text: r.answer, at: new Date().toISOString(), result: r }] });
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      <p className="muted small">{t.chatHelp}</p>
      <ol className="messages">
        {a.chat.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>
            <p>{m.text}</p>
            {m.result?.citations.map((c, j) => (
              <Quote key={j} quote={c.quote} sourceId={c.source_id} verified={c.verified} sources={a.sources} t={t} />
            ))}
            {m.result?.not_in_sources && <p className="small muted">{t.notInSources}</p>}
            {m.result?.safety === "distress" && <Notice>{t.distressNote}</Notice>}
            {m.result?.question_for_professor && (
              <button
                className="btn btn-small"
                disabled={(a.extraQuestions ?? []).includes(m.result.question_for_professor)}
                onClick={() => props.onUpdate({ ...a, extraQuestions: [...(a.extraQuestions ?? []), m.result!.question_for_professor!] })}
              >
                {(a.extraQuestions ?? []).includes(m.result.question_for_professor) ? t.addedToMessage : t.addToMessage}
              </button>
            )}
          </li>
        ))}
        {busy && <li className="msg msg-assistant"><p className="muted">{t.thinking}</p></li>}
      </ol>
      <div ref={end} />
      {error && <Notice kind="warn">{error}</Notice>}
      {a.chat.length === 0 && (
        <div className="row suggestions">
          {t.chatSuggestions.map((s) => (
            <button key={s} className="btn btn-small" onClick={() => send(s)} disabled={busy}>{s}</button>
          ))}
        </div>
      )}
      <form className="composer" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
        <label htmlFor="chat-input" className="sr-only">{t.chatPlaceholder}</label>
        <input id="chat-input" type="text" value={text} placeholder={t.chatPlaceholder} onChange={(e) => setText(e.target.value)} disabled={busy} />
        <button className="btn btn-primary" type="submit" disabled={busy || !text.trim()} aria-label={t.send}><Icon name="send" /></button>
      </form>
    </div>
  );
}

// ---------- Calendar export ----------

function Calendar(props: Parameters<typeof AssignmentView>[0]) {
  const { a, t, lang, settings } = props;
  const events = planEvents(a, settings, t);
  const fmt = (dt: Date, allDay: boolean) =>
    dt.toLocaleString(lang === "es" ? "es-MX" : "en-US", allDay ? { weekday: "short", day: "numeric", month: "short" } : { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="stack">
      <div className="panel">
        <p>{t.calendarHelp}</p>
        <p className="muted small">{t.reminderPrefs(settings.reminderDays, settings.reminderTime)}</p>
      </div>
      {events.length === 0 ? (
        <Notice kind="warn">{t.noDates}</Notice>
      ) : (
        <div className="panel">
          <h2 className="h2">{t.calendarEvents}</h2>
          <ul className="items">
            {events.map((e) => (
              <li key={e.uid} className="event-row">
                <span className={`event-kind event-${e.kind}`} aria-hidden="true" />
                <div className="event-main">
                  <span>{e.title}</span>
                  <span className="muted small num">{fmt(e.start, e.allDay)}</span>
                </div>
                <a className="link small" href={e.google} target="_blank" rel="noopener noreferrer">{t.googleLink}</a>
              </li>
            ))}
          </ul>
          <div className="row">
            <button className="btn btn-primary" onClick={() => downloadIcs(events, `clara-${a.decode!.title.slice(0, 30).replace(/[^\w-]+/g, "-")}.ics`)}>
              <Icon name="calendar" /> {t.downloadIcs}
            </button>
          </div>
          <p className="muted small">{t.icsHelp}</p>
        </div>
      )}
    </div>
  );
}

// ---------- What changed ----------

function Changes(props: Parameters<typeof AssignmentView>[0] & { onAddSource: (s: Omit<Source, "id" | "addedAt">) => void; busy: boolean; error: string | null }) {
  const { a, t } = props;
  const [text, setText] = useState("");
  const isExample = a.sources.some((s) => s.method === "example");
  return (
    <div className="stack">
      <div className="panel">
        <p>{t.changesHelp}</p>
        <label htmlFor="new-version" className="label-strong">{t.pasteNewVersion}</label>
        <textarea id="new-version" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="row">
          {isExample && <button className="btn" onClick={() => setText(exampleNewVersion())}>{t.useExampleV2}</button>}
          <button
            className="btn btn-primary"
            disabled={props.busy || text.trim().length < 20}
            onClick={() => {
              props.onAddSource({ kind: "announcement", name: t.sourceKinds.announcement, text, method: "paste" });
              setText("");
            }}
          >
            {t.compareNow}
          </button>
        </div>
        <div aria-live="polite">
          {props.busy && <Notice>{t.redecoding}</Notice>}
          {props.error && <Notice kind="warn">{props.error}</Notice>}
        </div>
      </div>
      {a.changes.length === 0 && <p className="muted empty-line">{t.noChangesYet}</p>}
      {a.changes.map((c) => (
        <div className="panel" key={c.at}>
          <p className="muted small num">{new Date(c.at).toLocaleString(props.lang === "es" ? "es-MX" : "en-US")}</p>
          {!c.result.has_changes || c.result.changes.length === 0 ? (
            <Notice kind="ok">{t.noChanges}</Notice>
          ) : (
            <>
              <h2 className="h2">{t.whatChanged}</h2>
              <ul className="items">
                {c.result.changes.map((ch, i) => (
                  <li key={i}>
                    <div className="item-head">
                      <span className={`pill pill-change-${ch.kind}`}>{t.changeKind[ch.kind]}</span>
                      <span>{ch.what}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <h3 className="h3">{t.whatToDo}</h3>
              {c.result.what_to_do.length === 0 ? <p>{t.nothingToDo}</p> : <ul className="plain">{c.result.what_to_do.map((w, i) => <li key={i}>{w}</li>)}</ul>}
              {c.result.unchanged.length > 0 && (
                <>
                  <h3 className="h3">{t.whatStays}</h3>
                  <ul className="plain muted">{c.result.unchanged.map((u, i) => <li key={i}>{u}</li>)}</ul>
                </>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}

// ---------- Share with the mentor ----------

function Mentor(props: Parameters<typeof AssignmentView>[0] & { questions: string[] }) {
  const { a, t, lang } = props;
  const d = a.decode!;
  const draft = mentorSummary(lang, { decode: d, questions: props.questions, doneSteps: d.steps.filter((_, i) => a.done.includes(i)).map((s) => s.action), note: a.stuck });
  const [text, setText] = useState(draft);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setText(draft);
  }, [draft, edited]);
  return (
    <div className="stack">
      <div className="panel">
        <p className="muted small">{t.mentorHelp}</p>
        <div className="field">
          <label htmlFor="stuck">{t.mentorNoteLabel}</label>
          <textarea id="stuck" className="short" value={a.stuck} onChange={(e) => props.onUpdate({ ...a, stuck: e.target.value })} />
        </div>
        <h2 className="h2">{t.mentorTitle}</h2>
        <textarea className="message" aria-label={t.mentorTitle} value={text} onChange={(e) => { setText(e.target.value); setEdited(true); }} />
        <div className="row">
          <a className="btn btn-primary" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">{t.shareWhatsApp}</a>
          <CopyButton text={text} t={t} />
        </div>
      </div>
    </div>
  );
}
