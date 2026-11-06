"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { makeTheme, toggleStep } from "@/lib/actions";
import type { Voice } from "@/lib/api";
import type { Strings } from "@/lib/i18n";
import { changeToPatch, guessPack, isActive, packFor, PACKS, themeKey, undoFor, VOICE_RATES, type Pack } from "@/lib/personal";
import { isDone, type Assignment, type ChatTurn, type Settings } from "@/lib/store";
import { errorText, Icon, Notice } from "../ui";
import { Glyph } from "./Glyph";
import { Board, SceneView } from "./Scene";

// Personal layer on top of the literal tasks, which stay as they are.

type Base = { a: Assignment; t: Strings; settings: Settings };

// remake when interest, depth, pack or steps change
export function useTheme(a: Assignment, settings: Settings, voice: Voice, onUpdate: (a: Assignment) => void) {
  const want = isActive(settings) ? themeKey(settings, a.decode.steps) : null;
  const latest = useRef(a);
  latest.current = a;
  const tried = useRef<string | null>(null);
  const force = useRef(false); // "Rehacer" ignores the saved theme
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!want || tried.current === want) return;
    if (!force.current && latest.current.themed?.key === want) return;
    force.current = false;
    tried.current = want;
    let live = true;
    setBusy(true);
    setError(null);
    makeTheme(latest.current, settings, voice)
      // merge: steps may have been ticked meanwhile
      .then((themed) => live && onUpdate({ ...latest.current, themed }))
      .catch((e) => live && setError(e))
      .finally(() => live && setBusy(false));
    return () => {
      live = false;
      tried.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [want, attempt]);

  const current = !!want && a.themed?.key === want;
  return { active: !!want, current, busy, error, retry: () => { force.current = true; tried.current = null; setAttempt((n) => n + 1); } };
}

export type ThemeState = ReturnType<typeof useTheme>;

const packName = (p: Pack, t: Strings) => p.label[t.locale.startsWith("en") ? "en" : "es"];

// a chosen pack wins over older interest text
const themeName = (s: Settings, pack: Pack, t: Strings) =>
  s.pack !== "auto" && s.pack !== "generic" && guessPack(s.interest) !== s.pack ? packName(pack, t) : s.interest.trim() || packName(pack, t);

export function InterestCard({ t, onSettings }: { t: Strings; onSettings: (p: Partial<Settings>) => void }) {
  const [text, setText] = useState("");
  const use = (interest: string) => interest.trim() && onSettings({ interest: interest.trim().slice(0, 80), interestAsked: true });
  return (
    <form className="interest-card" onSubmit={(e) => { e.preventDefault(); use(text); }}>
      <p className="strong"><Glyph name="star" size={20} /> {t.interestCardTitle}</p>
      <p className="small muted">{t.interestCardHelp}</p>
      <div className="row">
        {t.interestExamples.map((x) => <button key={x} type="button" className="btn btn-small" onClick={() => use(x)}>{x}</button>)}
      </div>
      <div className="composer">
        <label htmlFor="interest-quick" className="sr-only">{t.interestLabel}</label>
        <input id="interest-quick" type="text" maxLength={80} value={text} placeholder={t.interestPlaceholder} onChange={(e) => setText(e.target.value)} />
        <button className="btn btn-primary" type="submit" disabled={!text.trim()}>{t.interestUse}</button>
      </div>
      <button type="button" className="btn btn-quiet btn-small" onClick={() => onSettings({ interestAsked: true })}>{t.interestLater}</button>
    </form>
  );
}

export function StudioHero({ a, t, settings, theme, onUpdate, onSettings, onOpenSettings }: Base & { theme: ThemeState; onUpdate: (a: Assignment) => void; onSettings: (p: Partial<Settings>) => void; onOpenSettings: () => void }) {
  const d = a.decode;
  const pack = packFor(settings, theme.current ? a.themed : null);
  const themed = theme.current ? a.themed : undefined;
  const done = d.steps.filter((_, i) => isDone(a, i)).length;
  const groupIcon = (i: number) => themed?.groups.find((g) => g.steps.includes(i))?.icon;
  const steps = d.steps.map((s, i) => ({
    label: themed?.step_labels[i] || s.action,
    glyph: groupIcon(i) ?? pack.glyphs[i % pack.glyphs.length],
    done: isDone(a, i),
  }));
  return (
    <section className="studio pack-scope" aria-labelledby="studio-h" style={{ "--pack-h": pack.hue } as CSSProperties}>
      <div className="studio-head">
        <h3 id="studio-h" className="h3"><span className="bubble"><Glyph name={pack.glyphs[0]} size={18} /></span> {t.studioTitle(packName(pack, t))}</h3>
        <div className="row tight">
          {theme.current && <button className="btn btn-quiet btn-small" onClick={theme.retry} disabled={theme.busy}>{t.studioRemake}</button>}
          <button className="btn btn-quiet btn-small" aria-pressed={settings.decor} onClick={() => onSettings({ decor: !settings.decor })}>{settings.decor ? t.decorOff : t.decorOn}</button>
          <button className="btn btn-quiet btn-small" onClick={onOpenSettings}>{t.studioChange}</button>
        </div>
      </div>
      <div aria-live="polite">
        {theme.busy && <Notice>{t.studioPreparing}</Notice>}
        {!!theme.error && !theme.busy && (
          <Notice kind="warn">
            {t.studioFailed} {errorText(t, theme.error)}{" "}
            <button className="btn btn-small" onClick={theme.retry}>{t.studioRetry}</button>
          </Notice>
        )}
      </div>
      {themed?.intro && <p className="studio-intro">{themed.intro}</p>}
      <Board pack={pack} steps={steps} title={t.boardTitle} doneLabel={t.stepDoneShort} onToggle={(i) => onUpdate(toggleStep(a, i))} />
      <div className="score" aria-label={t.progressScore(done, d.steps.length)}>
        <span className="score-tokens" aria-hidden="true">
          {d.steps.map((_, i) => <span key={i} className="token" data-on={isDone(a, i) || undefined}><Glyph name={pack.glyphs[0]} size={16} /></span>)}
        </span>
        <span className="num strong">{t.progressScore(done, d.steps.length)}</span>
      </div>
    </section>
  );
}

export function GroupedSteps({ a, t, settings, onUpdate }: Base & { onUpdate: (a: Assignment) => void }) {
  const d = a.decode;
  const themed = a.themed!;
  return (
    <div className="groups pack-scope" style={{ "--pack-h": packFor(settings, themed).hue } as CSSProperties}>
      {themed.groups.map((g, gi) => (
        <div key={gi} className="group">
          {g.label && <p className="group-label"><span className="bubble"><Glyph name={g.icon} size={16} /></span> {g.label}</p>}
          <ul className="checklist">
            {g.steps.map((i) => (
              <li key={i} className="check">
                <input id={`st-${i}`} type="checkbox" checked={isDone(a, i)} onChange={() => onUpdate(toggleStep(a, i))} />
                <label htmlFor={`st-${i}`}>
                  <span className={isDone(a, i) ? "done" : undefined}>{d.steps[i].action}</span> <span className="muted small num">({t.minutes(d.steps[i].minutes)})</span>
                  {themed.step_labels[i] && <span className="themed-name small">{themed.step_labels[i]}</span>}
                </label>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export function StudioExtras({ a, t, settings }: Base) {
  const themed = a.themed!;
  const pack = packFor(settings, themed);
  const d = a.decode;
  return (
    <>
      {themed.analogies.length > 0 && (
        <section className="studio-block" aria-labelledby="analogies-h">
          <h3 id="analogies-h" className="h3">{t.inTermsOf(themeName(settings, pack, t))}</h3>
          <ul className="analogies pack-scope" style={{ "--pack-h": pack.hue } as CSSProperties}>
            {themed.analogies.map((x, i) => (
              <li key={i} className="analogy" data-anim="rise" style={{ "--i": i } as CSSProperties}>
                <span className="bubble"><Glyph name={x.icon} /></span>
                <div>
                  <p className="label">{t.analogyLabel} · {x.concept}</p>
                  <p>{x.analogy}</p>
                  <p className="small muted"><span className="strong">{t.whereItBreaks}:</span> {x.where_it_breaks}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {themed.scenes.length > 0 && (
        <section className="studio-block" aria-labelledby="scenes-h">
          <h3 id="scenes-h" className="h3">{t.visualMap}</h3>
          {themed.scenes.map((s, i) => (
            <SceneView key={i} scene={s} pack={pack} doneLabel={t.stepDoneShort} stepDone={(n) => isDone(a, n)} deadlineWhen={(n) => d.deadlines[n]?.when ?? null} />
          ))}
        </section>
      )}
    </>
  );
}

// Settings proposals

function valueLabel(t: Strings, key: keyof Settings, v: unknown): string {
  const lists: Partial<Record<keyof Settings, Record<string, string>>> = {
    theme: t.themes, accent: t.accents, font: t.fonts, textSize: t.textSizes, controlSize: t.controlSizes,
    spacing: t.spacings, layout: t.layouts, motion: t.motions, depth: t.depths,
  };
  if (key === "voiceRate") {
    const rate = (Object.keys(VOICE_RATES) as (keyof typeof VOICE_RATES)[]).reduce((b, r) => (Math.abs(VOICE_RATES[r] - Number(v)) < Math.abs(VOICE_RATES[b] - Number(v)) ? r : b), "normal");
    return t.voiceRates[rate];
  }
  if (key === "pack") return v === "auto" ? t.packAuto : packName(PACKS[v as keyof typeof PACKS], t);
  if (key === "interest") return String(v || "-");
  return lists[key]?.[String(v)] ?? String(v);
}

// nothing changes until the student applies it
export function ChangeCard({ m, t, settings, onDecide }: { m: ChatTurn; t: Strings; settings: Settings; onDecide: (turn: ChatTurn, patch: Partial<Settings>) => void }) {
  const patch = changeToPatch(m.result?.settings_change, settings.lang);
  const keys = Object.keys(patch) as (keyof Settings)[];
  if (keys.length === 0) return null;
  const rows = keys.map((k) => ({ k, from: m.decision === "applied" ? m.undo?.[k] : settings[k], to: patch[k] }));
  return (
    <div className="change-card" aria-live="polite">
      <p className="label">{t.suggestTitle}</p>
      <ul className="plain">
        {rows.map(({ k, from, to }) => (
          <li key={k}><span className="strong">{t.settingNames[k as keyof typeof t.settingNames] ?? k}:</span> {valueLabel(t, k, from)} → {valueLabel(t, k, to)}</li>
        ))}
      </ul>
      {!m.decision && (
        <div className="row">
          <button className="btn btn-primary btn-small" onClick={() => onDecide({ ...m, decision: "applied", undo: undoFor(patch, settings) }, patch)}><Icon name="check" size={16} /> {t.apply}</button>
          <button className="btn btn-small" onClick={() => onDecide({ ...m, decision: "declined" }, {})}>{t.decline}</button>
        </div>
      )}
      {m.decision === "applied" && (
        <p className="small"><span className="ok">{t.applied}</span> <button className="btn btn-quiet btn-small" onClick={() => onDecide({ ...m, decision: "undone" }, m.undo ?? {})}>{t.undo}</button></p>
      )}
      {m.decision === "declined" && <p className="small muted">{t.declined}</p>}
      {m.decision === "undone" && <p className="small muted">{t.undone}</p>}
    </div>
  );
}
