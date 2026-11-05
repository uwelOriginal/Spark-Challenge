"use client";

import { useEffect, useState } from "react";
import { calendarAll } from "@/lib/calendar";
import { disableNotifications, enableNotifications, notifyState, syncNotifications, testNotification, type NotifyState } from "@/lib/notify";
import { defaultDialect, DIALECTS } from "@/lib/dialects";
import type { Strings } from "@/lib/i18n";
import type { Lang } from "@/lib/schemas";
import { guessPack, PACK_IDS, PACKS, VOICE_RATES, type Depth, type Motion, type PackId } from "@/lib/personal";
import { DEFAULT_SETTINGS, type Assignment, type Accent, type Font, type Layout, type Settings, type TextSize, type Theme } from "@/lib/store";
import { Board } from "./studio/Scene";
import { Choice, Icon, ListenButton, Notice, openCalendar } from "./ui";

// Every preference applies at once (ClaraApp mirrors them onto <html data-*>) and stays on the device.

const RATES = VOICE_RATES;
type Rate = keyof typeof RATES;

/** Turn push reminders on or off and send a real one to see how it looks. */
function Notifications({ t, assignments, settings, onSettings }: { t: Strings; assignments: Assignment[]; settings: Settings; onSettings: (p: Partial<Settings>) => void }) {
  const [state, setState] = useState<NotifyState | null>(null);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "warn"; text: string } | null>(null);

  useEffect(() => {
    void notifyState(settings.notifications).then(setState).catch(() => setState("unsupported"));
    if (settings.notifications) void syncNotifications(assignments, settings, t).then(setCount).catch(() => {});
  }, [settings.notifications, settings.reminderDays, settings.reminderTime, assignments]);

  async function on() {
    setBusy(true);
    setNote(null);
    try {
      if (await enableNotifications()) {
        setCount(await syncNotifications(assignments, settings, t));
        onSettings({ notifications: true });
      } else {
        setState(await notifyState(false));
      }
    } catch {
      setNote({ kind: "warn", text: t.notifyFailed });
    }
    setBusy(false);
  }

  async function off() {
    setBusy(true);
    setNote(null);
    await disableNotifications().catch(() => {});
    onSettings({ notifications: false });
    setBusy(false);
  }

  async function test() {
    setBusy(true);
    setNote({ kind: "ok", text: t.notifyTestHelp });
    const sent = await testNotification();
    setNote(sent ? { kind: "ok", text: t.notifyTestSent } : { kind: "warn", text: t.notifyFailed });
    setBusy(false);
  }

  if (!state) return null;
  const blocked: Partial<Record<NotifyState, string>> = { unsupported: t.notifyUnsupported, "needs-install": t.notifyNeedsInstall, denied: t.notifyDenied, "server-off": t.notifyServerOff };
  return (
    <div className="field">
      <h3 className="h3">{t.notifyTitle}</h3>
      {blocked[state] ? (
        <Notice kind="warn">{blocked[state]}</Notice>
      ) : state === "on" ? (
        <>
          <p className="small">{t.notifyActive(count)}</p>
          <div className="row">
            <button className="btn" disabled={busy} onClick={() => void test()}>{t.notifyTest}</button>
            <button className="btn btn-quiet" disabled={busy} onClick={() => void off()}>{t.notifyOff}</button>
          </div>
        </>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={() => void on()}>{t.notifyOn}</button>
      )}
      <div aria-live="polite">{note && <Notice kind={note.kind}>{note.text}</Notice>}</div>
    </div>
  );
}

export default function SettingsScreen({ t, assignments, settings, onSettings, onWipe }: { t: Strings; assignments: Assignment[]; settings: Settings; onSettings: (p: Partial<Settings>) => void; onWipe: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const opts = <K extends string>(labels: Record<K, string>) => (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
  const rate = (Object.keys(RATES) as Rate[]).reduce((best, r) => (Math.abs(RATES[r] - settings.voiceRate) < Math.abs(RATES[best] - settings.voiceRate) ? r : best), "normal");
  const allDates = calendarAll(assignments, settings, t);
  const toggleDay = (d: number) =>
    onSettings({ reminderDays: settings.reminderDays.includes(d) ? settings.reminderDays.filter((x) => x !== d) : [...settings.reminderDays, d].sort((a, b) => b - a) });

  return (
    <div className="screen narrow">
      <header>
        <h1 className="h1" tabIndex={-1}>{t.settingsTitle}</h1>
      </header>

      <section className="panel settings" aria-labelledby="personal-h">
        <h2 id="personal-h" className="h2">{t.personalTitle}</h2>
        <p className="muted small">{t.personalHelp}</p>
        <div className="field">
          <label htmlFor="interest">{t.interestLabel}</label>
          <input id="interest" type="text" maxLength={80} value={settings.interest} placeholder={t.interestPlaceholder} onChange={(e) => onSettings({ interest: e.target.value, interestAsked: true })} />
        </div>
        <Choice<PackId | "auto">
          legend={t.packLabel}
          name="pack"
          value={settings.pack}
          options={[{ value: "auto" as const, label: `${t.packAuto} (${PACKS[guessPack(settings.interest)].label[settings.lang]})` }, ...PACK_IDS.map((p) => ({ value: p, label: PACKS[p].label[settings.lang] }))]}
          // Choosing a theme also updates the interest text, so analogies and chat follow the new theme.
          onChange={(pack) => onSettings(pack !== "auto" && pack !== "generic" && guessPack(settings.interest) !== pack ? { pack, interest: PACKS[pack].label[settings.lang] } : { pack })}
        />
        <Choice<Depth> legend={t.depthLabel} name="depth" value={settings.depth} options={opts(t.depths)} onChange={(depth) => onSettings({ depth })} wide />
        <Choice<"yes" | "no"> legend={t.decorLabel} name="decor" value={settings.decor ? "yes" : "no"} options={[{ value: "yes", label: t.decorYes }, { value: "no", label: t.decorNo }]} onChange={(v) => onSettings({ decor: v === "yes" })} help={t.decorHelp} />
        <Choice<Motion> legend={t.motionLabel} name="motion" value={settings.motion} options={opts(t.motions)} onChange={(motion) => onSettings({ motion })} help={t.motionHelp} />
        <Board
          pack={PACKS[settings.pack === "auto" ? guessPack(settings.interest) : settings.pack]}
          steps={t.previewSteps.map((label, i) => ({ label, glyph: PACKS[settings.pack === "auto" ? guessPack(settings.interest) : settings.pack].glyphs[i], done: i === 0 }))}
          title={t.boardTitle}
          doneLabel={t.stepDoneShort}
        />
      </section>

      <section className="panel settings" aria-labelledby="display-h">
        <h2 id="display-h" className="h2">{t.displayTitle}</h2>
        <p className="muted small">{t.displayHelp}</p>
        <Choice<Theme> legend={t.theme} name="theme" value={settings.theme} options={opts(t.themes)} onChange={(theme) => onSettings({ theme })} />
        <Choice<Accent>
          legend={t.accent}
          name="accent"
          value={settings.accent}
          options={opts(t.accents).map((o) => ({ ...o, swatch: o.value }))}
          onChange={(accent) => onSettings({ accent })}
        />
        <Choice<Font> legend={t.font} name="font" value={settings.font} options={opts(t.fonts)} onChange={(font) => onSettings({ font })} />
        <Choice<TextSize> legend={t.textSize} name="text" value={settings.textSize} options={opts(t.textSizes)} onChange={(textSize) => onSettings({ textSize })} />
        <Choice<Settings["controlSize"]> legend={t.controlSize} name="control" value={settings.controlSize} options={opts(t.controlSizes)} onChange={(controlSize) => onSettings({ controlSize })} />
        <Choice<Settings["spacing"]> legend={t.spacing} name="spacing" value={settings.spacing} options={opts(t.spacings)} onChange={(spacing) => onSettings({ spacing })} />
        <p className="preview-sample" aria-hidden="true">{t.previewSample}</p>
        <button
          className="btn btn-quiet"
          onClick={() => onSettings({ theme: DEFAULT_SETTINGS.theme, accent: DEFAULT_SETTINGS.accent, font: DEFAULT_SETTINGS.font, textSize: DEFAULT_SETTINGS.textSize, controlSize: DEFAULT_SETTINGS.controlSize, spacing: DEFAULT_SETTINGS.spacing })}
        >
          {t.resetDisplay}
        </button>
      </section>

      <section className="panel settings" aria-labelledby="layout-h">
        <h2 id="layout-h" className="h2">{t.layoutTitle}</h2>
        <Choice<Layout> legend={t.layoutTitle} name="layout" value={settings.layout} options={opts(t.layouts)} onChange={(layout) => onSettings({ layout })} help={t.layoutHelp} wide />
      </section>

      <section className="panel settings" aria-labelledby="lang-h">
        <h2 id="lang-h" className="h2">{t.languageTitle}</h2>
        <Choice<Lang>
          legend={t.language}
          name="lang"
          value={settings.lang}
          options={[{ value: "es", label: "Español" }, { value: "en", label: "English" }]}
          onChange={(lang) => onSettings({ lang, dialect: defaultDialect(lang) })}
        />
        <Choice<string>
          legend={t.dialect}
          name="dialect"
          value={settings.dialect}
          help={t.dialectHelp}
          options={DIALECTS[settings.lang].map((d) => ({ value: d.id, label: d.label }))}
          onChange={(dialect) => onSettings({ dialect })}
        />
      </section>

      <section className="panel settings" aria-labelledby="voice-h">
        <h2 id="voice-h" className="h2">{t.voiceTitle}</h2>
        <Choice<Rate> legend={t.voiceRate} name="rate" value={rate} options={opts(t.voiceRates)} onChange={(r) => onSettings({ voiceRate: RATES[r] })} />
        <ListenButton t={t} rate={settings.voiceRate} text={t.previewSample} label={t.voiceTest} />
      </section>

      <section className="panel settings" aria-labelledby="rem-h">
        <h2 id="rem-h" className="h2">{t.remindersTitle}</h2>
        <p className="muted small">{t.remindersHelp}</p>
        <fieldset className="choice">
          <legend>{t.daysBefore}</legend>
          <div className="choice-options">
            {[7, 3, 2, 1].map((d) => (
              <label key={d} className="choice-option">
                <input type="checkbox" checked={settings.reminderDays.includes(d)} onChange={() => toggleDay(d)} />
                <span className="num">{d}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="rtime">{t.atTime}</label>
          <input id="rtime" type="time" value={settings.reminderTime} onChange={(e) => onSettings({ reminderTime: e.target.value || "09:00" })} />
        </div>
        <Notifications t={t} assignments={assignments} settings={settings} onSettings={onSettings} />
      </section>

      <section className="panel settings" aria-labelledby="connect-h">
        <h2 id="connect-h" className="h2">{t.connectTitle}</h2>
        <div className="field">
          <h3 className="h3">{t.calendarAllTitle}</h3>
          <p className="muted small">{t.calendarAllHelp}</p>
          {allDates ? (
            <button className="btn" onClick={() => openCalendar(allDates, "clara")}><Icon name="calendar" /> {t.calendarAllButton}</button>
          ) : (
            <p className="muted small">{t.calendarAllEmpty}</p>
          )}
        </div>
        <div className="field">
          <h3 className="h3">{t.canvasTitle}</h3>
          <label htmlFor="feed">{t.canvasUrlLabel}</label>
          <input id="feed" type="url" inputMode="url" value={settings.canvasFeedUrl} placeholder="https://…/feeds/calendars/user_….ics" aria-describedby="feed-help" onChange={(e) => onSettings({ canvasFeedUrl: e.target.value.trim() })} />
          <p id="feed-help" className="muted small">{t.canvasUrlHelp}</p>
        </div>
      </section>

      <section className="panel settings" aria-labelledby="you-h">
        <h2 id="you-h" className="h2">{t.aboutYou}</h2>
        <div className="field">
          <label htmlFor="student">{t.yourName}</label>
          <input id="student" type="text" autoComplete="name" value={settings.studentName} onChange={(e) => onSettings({ studentName: e.target.value })} />
        </div>
      </section>

      <section className="panel settings" aria-labelledby="priv-h">
        <h2 id="priv-h" className="h2">{t.privacyTitle}</h2>
        <p className="small">{t.privacyBody}</p>
        {confirm ? (
          <button className="btn danger-solid" onClick={() => { onWipe(); setConfirm(false); }}>{t.wipeConfirm}</button>
        ) : (
          <button className="btn btn-quiet danger" onClick={() => setConfirm(true)}>{t.wipe}</button>
        )}
        <p className="muted small">{t.about}</p>
      </section>
    </div>
  );
}
