"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addMaterial, answer, toggleStep, withQuestion } from "@/lib/actions";
import type { Voice } from "@/lib/api";
import { calendarFile, calendarLink } from "@/lib/calendar";
import type { Strings } from "@/lib/i18n";
import { isActive, packFor, PACKS } from "@/lib/personal";
import type { DecodeResult } from "@/lib/schemas";
import { isDone, nextDue, nextStep, teacherQuestions, type Assignment, type ChatTurn, type Settings, type Source } from "@/lib/store";
import MaterialInput from "./MaterialInput";
import { PanelMotif } from "./studio/Decor";
import { SceneView } from "./studio/Scene";
import { ChangeCard, GroupedSteps, InterestCard, StudioExtras, StudioHero, useTheme } from "./studio/Studio";
import { daysUntil, errorText, FlowSteps, formatDate, Icon, ListenButton, Notice, openCalendar, Quote } from "./ui";

// Step 2: the tasks and the conversation about them, on one screen. Where each panel sits
// comes from Settings → Workspace (data-layout); on narrow screens one shows at a time.
// With an interest set, the Studio (studio/Studio.tsx) adds the personal layer on top of the literal tasks.

type Props = {
  a: Assignment;
  t: Strings;
  settings: Settings;
  voice: Voice;
  onUpdate: (a: Assignment) => void;
  onSettings: (p: Partial<Settings>) => void;
  onOpenSettings: () => void;
  onTeacher: () => void;
  onFinish: () => void;
};

export default function Workspace(props: Props) {
  const { a, t, settings } = props;
  const d = a.decode;
  const due = nextDue(a);
  const [show, setShow] = useState<"tasks" | "chat">("tasks");
  const [calendarNote, setCalendarNote] = useState(false);
  const ics = calendarFile(a, settings, t);
  const googleLink = calendarLink(a, settings, t);
  const questions = teacherQuestions(a).length;

  return (
    <article className="screen wide">
      <FlowSteps t={t} current={1} />
      <header className="work-head">
        <div>
          <h1 className="h1" tabIndex={-1}>{d.title}</h1>
          <p className="muted">
            {d.course ? `${d.course} · ` : ""}
            {due ? `${t.dueOn} ${formatDate(due, t.locale)} · ${t.daysLeft(daysUntil(due))}` : t.noDate}
          </p>
        </div>
        {ics && (
          <button className="btn btn-small" onClick={() => { openCalendar(ics, `clara-${d.title.slice(0, 30)}`); setCalendarNote(true); }}>
            <Icon name="calendar" /> {t.addToCalendar}
          </button>
        )}
      </header>
      <div aria-live="polite">{calendarNote && (
        <Notice kind="ok">
          {t.calendarDone}
          {googleLink && <> <a href={googleLink} target="_blank" rel="noopener noreferrer">{t.calendarGoogle}</a></>}
        </Notice>
      )}</div>
      {d.injected_instructions_ignored && <Notice kind="warn">{t.injectionNote}</Notice>}

      <div className="switch" role="group" aria-label={`${t.showTasks} / ${t.showChat}`}>
        {(["tasks", "chat"] as const).map((p) => (
          <button key={p} className="switch-item" aria-pressed={show === p} onClick={() => setShow(p)}>
            {p === "tasks" ? t.showTasks : t.showChat}
          </button>
        ))}
      </div>

      <div className="work" data-layout={settings.layout} data-show={show}>
        <Tasks {...props} />
        <Chat {...props} />
      </div>

      <footer className="work-foot">
        <button className="btn" onClick={props.onTeacher}>
          <Icon name="mail" /> {t.askTeacher}{questions > 0 && <span className="count num">{questions}</span>}
        </button>
        <button className="btn btn-primary" onClick={props.onFinish}><Icon name="flag" /> {t.finish}</button>
      </footer>
    </article>
  );
}

// ---------- Tasks: summary, next step, checklist, details on demand ----------

function Tasks({ a, t, settings, voice, onUpdate, onSettings, onOpenSettings, onTeacher }: Props) {
  const d = a.decode;
  const next = nextStep(a);
  const theme = useTheme(a, settings, voice, onUpdate);
  const themed = theme.current && a.themed ? a.themed : null;
  return (
    <section className="panel work-panel" data-panel="tasks" aria-labelledby="tasks-h">
      {theme.active && settings.decor && <PanelMotif pack={packFor(settings, a.themed)} />}
      <h2 id="tasks-h" className="h2">{t.tasksTitle}</h2>

      {theme.active ? (
        <StudioHero a={a} t={t} settings={settings} theme={theme} onUpdate={onUpdate} onSettings={onSettings} onOpenSettings={onOpenSettings} />
      ) : (
        !settings.interestAsked && <InterestCard t={t} onSettings={onSettings} />
      )}

      {next >= 0 ? (
        <div className="next">
          <p className="label">{t.nextStep} · <span className="num">{t.minutes(d.steps[next].minutes)}</span></p>
          <p className="lead strong">{d.steps[next].action}</p>
          {themed?.step_labels[next] && <p className="themed-name pack-scope" style={{ "--pack-h": packFor(settings, themed).hue } as CSSProperties}>{themed.step_labels[next]}</p>}
          <p className="muted small">{t.doneWhen}: {d.steps[next].done_when}</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => onUpdate(toggleStep(a, next))}><Icon name="check" /> {t.markDone}</button>
            <ListenButton t={t} rate={settings.voiceRate} text={`${d.steps[next].action}. ${t.doneWhen}: ${d.steps[next].done_when}`} />
          </div>
        </div>
      ) : (
        <Notice kind="ok">{t.allStepsDone}</Notice>
      )}

      {themed ? <GroupedSteps a={a} t={t} settings={settings} onUpdate={onUpdate} /> : <ul className="checklist">
        {d.steps.map((s, i) => (
          <li key={i} className="check">
            <input id={`st-${i}`} type="checkbox" checked={isDone(a, i)} onChange={() => onUpdate(toggleStep(a, i))} />
            <label htmlFor={`st-${i}`}>
              <span className={isDone(a, i) ? "done" : undefined}>{s.action}</span> <span className="muted small num">({t.minutes(s.minutes)})</span>
            </label>
          </li>
        ))}
      </ul>}

      {themed && <StudioExtras a={a} t={t} settings={settings} />}

      {d.ambiguities.some((x) => x.kind === "contradiction") && (
        <button className="notice notice-warn notice-button" onClick={onTeacher}>{t.sourcesDisagree}</button>
      )}

      <details className="more">
        <summary>{t.summaryTitle}</summary>
        {d.literal_summary.map((s, i) => <p key={i}>{s}</p>)}
        <p className="muted small"><Icon name="check" size={16} /> {t.verifiedBadge(d.quote_check.verified, d.quote_check.total)}</p>
        <ListenButton t={t} rate={settings.voiceRate} text={d.literal_summary.join(" ")} />
      </details>

      <details className="more">
        <summary>{t.details}</summary>
        <Details d={d} sources={a.sources} t={t} />
      </details>

      <details className="more">
        <summary>{t.yourMaterial(a.sources.length)}</summary>
        <ul className="plain">
          {a.sources.map((s) => (
            <li key={s.id}>
              <details className="quote">
                <summary>{s.name} <span className="muted">· {t.sourceKinds[s.kind]}</span></summary>
                <pre className="source-text">{s.text}</pre>
              </details>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Details({ d, sources, t }: { d: DecodeResult; sources: Source[]; t: Strings }) {
  const groups: [string, { main: string; sub?: string | null; quote: string; sid: string; verified: boolean; warn?: boolean }[]][] = [
    [t.deadlines, d.deadlines.map((x) => ({ main: `${x.item}: ${x.when}`, quote: x.quote, sid: x.source_id, verified: x.verified, warn: x.date_check === "mismatch" }))],
    [t.deliverables, d.deliverables.map((x) => ({ main: x.item, sub: x.details, quote: x.quote, sid: x.source_id, verified: x.verified }))],
    [t.format, d.format_requirements.map((x) => ({ main: x.item, quote: x.quote, sid: x.source_id, verified: x.verified }))],
    [t.grading, d.grading_criteria.map((x) => ({ main: x.weight ? `${x.item} · ${x.weight}` : x.item, quote: x.quote, sid: x.source_id, verified: x.verified }))],
  ];
  return (
    <>
      {groups.map(([title, items]) => (
        <div key={title} className="detail-group">
          <h3 className="h3">{title}</h3>
          {items.length === 0 ? (
            <p className="muted small">{t.noneFound}</p>
          ) : (
            <ul className="items">
              {items.map((it, i) => (
                <li key={i}>
                  <div>{it.main}</div>
                  {it.sub && <div className="muted small">{it.sub}</div>}
                  {it.warn && <p className="warn small">{t.dateMismatch}</p>}
                  <Quote quote={it.quote} sourceId={it.sid} verified={it.verified} sources={sources} t={t} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}

// ---------- Chat: grounded answers, plus Clara's notes when new material arrives ----------

function Chat({ a, t, voice, settings, onUpdate, onSettings }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState<string | null>(null); // what Clara is doing, for the live region
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Braces matter: newer browsers return a Promise from scrollIntoView, and an effect may only return a cleanup.
    void end.current?.scrollIntoView({ block: "nearest" });
  }, [a.chat.length, busy]);

  async function run(note: string, work: () => Promise<Assignment>) {
    setBusy(note);
    setError(null);
    try {
      onUpdate(await work());
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(null);
    }
  }

  function send(message: string) {
    const msg = message.trim();
    if (!msg || busy) return;
    const asked = withQuestion(a, msg);
    onUpdate(asked);
    setText("");
    void run(t.thinking, () => answer(asked, voice, settings));
  }

  return (
    <section className="panel work-panel chat" data-panel="chat" aria-labelledby="chat-h">
      {isActive(settings) && settings.decor && <PanelMotif pack={packFor(settings, a.themed)} />}
      <h2 id="chat-h" className="h2">{t.chatTitle}</h2>
      <p className="muted small">{t.chatHelp}</p>
      <ol className="messages">
        {a.chat.map((m, i) => (
          <Message
            key={i}
            m={m}
            a={a}
            t={t}
            settings={settings}
            onUpdate={onUpdate}
            onDecide={(turn, patch) => {
              onSettings(patch);
              onUpdate({ ...a, chat: a.chat.map((x, j) => (j === i ? turn : x)) });
            }}
          />
        ))}
      </ol>
      <div ref={end} />
      <div aria-live="polite">
        {busy && <Notice>{busy}</Notice>}
        {error && <Notice kind="warn">{error}</Notice>}
      </div>
      {a.chat.length === 0 && !busy && (
        <div className="row">
          {t.chatSuggestions.map((s) => <button key={s} className="btn btn-small" onClick={() => send(s)}>{s}</button>)}
        </div>
      )}
      {adding ? (
        <MaterialInput
          t={t}
          defaultKind="announcement"
          onCancel={() => setAdding(false)}
          onAdd={(s) => {
            setAdding(false);
            void run(t.updating, () => addMaterial(a, s, voice, (k) => t.sourceKinds[k]));
          }}
        />
      ) : (
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(text); }}>
          <button type="button" className="icon-btn" aria-label={t.addMaterial} title={t.addMaterial} onClick={() => setAdding(true)} disabled={!!busy}>
            <Icon name="plus" />
          </button>
          <label htmlFor="chat-input" className="sr-only">{t.chatPlaceholder}</label>
          <input id="chat-input" type="text" value={text} placeholder={t.chatPlaceholder} onChange={(e) => setText(e.target.value)} disabled={!!busy} />
          <button className="btn btn-primary" type="submit" disabled={!!busy || !text.trim()} aria-label={t.send}><Icon name="send" /></button>
        </form>
      )}
    </section>
  );
}

function Message({ m, a, t, settings, onUpdate, onDecide }: { m: ChatTurn; a: Assignment; t: Strings; settings: Settings; onUpdate: (a: Assignment) => void; onDecide: (turn: ChatTurn, patch: Partial<Settings>) => void }) {
  if (m.changes) {
    const c = m.changes;
    return (
      <li className="msg msg-assistant msg-update">
        <p className="strong">{t.materialAdded(m.text)}</p>
        {!c.has_changes || c.changes.length === 0 ? (
          <p>{t.noChanges}</p>
        ) : (
          <>
            <p className="label">{t.whatChanged}</p>
            <ul className="plain">
              {c.changes.map((ch, i) => <li key={i}><span className={`pill pill-${ch.kind}`}>{t.changeKind[ch.kind]}</span> {ch.what}</li>)}
            </ul>
            <p className="label">{t.whatToDo}</p>
            {c.what_to_do.length === 0 ? <p>{t.nothingToDo}</p> : <ul className="plain">{c.what_to_do.map((w, i) => <li key={i}>{w}</li>)}</ul>}
            {c.unchanged.length > 0 && (
              <details className="quote">
                <summary>{t.whatStays}</summary>
                <ul className="plain muted">{c.unchanged.map((u, i) => <li key={i}>{u}</li>)}</ul>
              </details>
            )}
          </>
        )}
      </li>
    );
  }
  const q = m.result?.question_for_professor;
  const added = !!q && a.extraQuestions.includes(q);
  return (
    <li className={`msg msg-${m.role}`}>
      <p>{m.text}</p>
      {m.result?.citations.map((c, j) => <Quote key={j} quote={c.quote} sourceId={c.source_id} verified={c.verified} sources={a.sources} t={t} />)}
      {m.result?.visuals?.slice(0, 1).map((s, j) => (
        <SceneView
          key={j}
          scene={s}
          pack={isActive(settings) ? packFor(settings, a.themed) : PACKS.generic}
          doneLabel={t.stepDoneShort}
          stepDone={(n) => isDone(a, n)}
          deadlineWhen={(n) => a.decode.deadlines[n]?.when ?? null}
        />
      ))}
      {m.result?.settings_change?.wanted && <ChangeCard m={m} t={t} settings={settings} onDecide={onDecide} />}
      {m.result?.not_in_sources && <p className="small muted">{t.notInSources}</p>}
      {m.result?.safety === "distress" && <Notice>{t.distressNote}</Notice>}
      {q && (
        <button className="btn btn-small" disabled={added} onClick={() => onUpdate({ ...a, extraQuestions: [...a.extraQuestions, q] })}>
          <Icon name={added ? "check" : "mail"} size={16} /> {added ? t.addedToMessage : t.addToMessage}
        </button>
      )}
    </li>
  );
}
