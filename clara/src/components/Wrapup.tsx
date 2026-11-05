"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";
import { isDone, teacherQuestions, type Assignment, type Settings } from "@/lib/store";
import { mentorSummary, professorMessage } from "@/lib/templates";
import { CopyButton, FlowSteps, Icon, Notice, Quote } from "./ui";

// Step 3: the two ways out of the work view. Nothing is ever sent for the student:
// email, WhatsApp and copy are always their own action.

type Props = { a: Assignment; t: Strings; settings: Settings; onUpdate: (a: Assignment) => void; onBack: () => void };

/** A draft that follows its inputs until the student edits it by hand. */
function useDraft(draft: string): [string, (s: string) => void] {
  const [text, setText] = useState(draft);
  const [edited, setEdited] = useState(false);
  useEffect(() => {
    if (!edited) setText(draft);
  }, [draft, edited]);
  return [text, (s) => { setText(s); setEdited(true); }];
}

function BackButton({ t, onBack }: { t: Strings; onBack: () => void }) {
  return <button className="btn btn-quiet back" onClick={onBack}><Icon name="back" /> {t.backToWork}</button>;
}

export function Teacher({ a, t, settings, onUpdate, onBack, onStudentName }: Props & { onStudentName: (n: string) => void }) {
  const d = a.decode;
  const draft = professorMessage(settings.lang, { title: d.title, questions: teacherQuestions(a), profName: a.profName, studentName: settings.studentName });
  const [message, setMessage] = useDraft(draft);
  const [subject, ...body] = message.split("\n");
  const mailto = `mailto:?subject=${encodeURIComponent(subject.replace(/^(Asunto|Subject):\s*/, ""))}&body=${encodeURIComponent(body.join("\n").trim())}`;
  const pick = (i: number) => onUpdate({ ...a, picked: a.picked.includes(i) ? a.picked.filter((p) => p !== i) : [...a.picked, i] });

  return (
    <div className="screen narrow">
      <FlowSteps t={t} current={2} />
      <BackButton t={t} onBack={onBack} />
      <header>
        <h1 className="h1" tabIndex={-1}>{t.teacherTitle}</h1>
        <p className="muted">{t.teacherHelp}</p>
      </header>

      {d.ambiguities.length === 0 && a.extraQuestions.length === 0 ? (
        <Notice kind="ok">{t.noAmbiguities}</Notice>
      ) : (
        <section className="panel">
          <ul className="items">
            {d.ambiguities.map((x, i) => (
              <li key={i}>
                <div className="check">
                  <input id={`q-${i}`} type="checkbox" checked={a.picked.includes(i)} onChange={() => pick(i)} />
                  <label htmlFor={`q-${i}`}>
                    <span className={`pill pill-${x.kind}`}>{t.kind[x.kind]}</span> <strong>{x.question}</strong>
                    <span className="muted small block">{t.whyItMatters}: {x.why_it_matters}</span>
                  </label>
                </div>
                <Quote quote={x.quote} sourceId={x.source_id} verified={x.verified} sources={a.sources} t={t} />
              </li>
            ))}
            {a.extraQuestions.map((q) => (
              <li key={q} className="check">
                <input id={`xq-${q}`} type="checkbox" checked onChange={() => onUpdate({ ...a, extraQuestions: a.extraQuestions.filter((x) => x !== q) })} />
                <label htmlFor={`xq-${q}`}><strong>{q}</strong></label>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="panel" aria-labelledby="msg-h">
        <h2 id="msg-h" className="h2">{t.messageTitle}</h2>
        <div className="two">
          <div className="field">
            <label htmlFor="prof">{t.profName}</label>
            <input id="prof" type="text" value={a.profName} onChange={(e) => onUpdate({ ...a, profName: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="me">{t.yourName}</label>
            <input id="me" type="text" value={settings.studentName} onChange={(e) => onStudentName(e.target.value)} />
          </div>
        </div>
        <textarea className="message" aria-label={t.messageTitle} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="row">
          <a className="btn btn-primary" href={mailto}><Icon name="mail" /> {t.openEmail}</a>
          <CopyButton text={message} t={t} />
        </div>
      </section>
    </div>
  );
}

export function Finish({ a, t, settings, onUpdate, onBack, onDelete }: Props & { onDelete: () => void }) {
  const d = a.decode;
  const draft = mentorSummary(settings.lang, { decode: d, questions: teacherQuestions(a), doneSteps: d.steps.filter((_, i) => isDone(a, i)).map((s) => s.action) });
  const [summary, setSummary] = useDraft(draft);
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="screen narrow">
      <FlowSteps t={t} current={2} />
      <BackButton t={t} onBack={onBack} />
      <header>
        <h1 className="h1" tabIndex={-1}>{t.finishTitle}</h1>
        <p className="muted">{t.finishHelp}</p>
      </header>

      <section className="panel">
        {a.finishedAt ? (
          <>
            <Notice kind="ok">{t.finishedOn(new Date(a.finishedAt).toLocaleDateString(t.locale, { day: "numeric", month: "long" }))}</Notice>
            <button className="btn" onClick={() => onUpdate({ ...a, finishedAt: null })}>{t.reopen}</button>
          </>
        ) : (
          <button className="btn btn-primary btn-wide" onClick={() => onUpdate({ ...a, finishedAt: new Date().toISOString() })}>
            <Icon name="check" /> {t.markFinished}
          </button>
        )}
      </section>

      <details className="panel more">
        <summary>{t.shareTitle}</summary>
        <p className="muted small">{t.shareHelp}</p>
        <textarea className="message" aria-label={t.shareTitle} value={summary} onChange={(e) => setSummary(e.target.value)} />
        <div className="row">
          <a className="btn" href={`https://wa.me/?text=${encodeURIComponent(summary)}`} target="_blank" rel="noopener noreferrer">{t.shareWhatsApp}</a>
          <CopyButton text={summary} t={t} />
        </div>
      </details>

      <div className="danger-zone">
        {confirm ? (
          <button className="btn danger-solid" onClick={onDelete}>{t.confirmDelete}: {d.title}</button>
        ) : (
          <button className="btn btn-quiet danger" onClick={() => setConfirm(true)}>{t.deleteTask}</button>
        )}
      </div>
    </div>
  );
}
