"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessCode, setAccessCode } from "@/lib/api";
import { strings, type Strings } from "@/lib/i18n";
import { useClaraStore, type Settings } from "@/lib/store";
import { Home, Upload } from "./Home";
import SettingsScreen from "./Settings";
import { isActive, packFor } from "@/lib/personal";
import { Decor } from "./studio/Decor";
import { Icon, Mark } from "./ui";
import Workspace from "./Workspace";
import { Finish, Teacher } from "./Wrapup";

// The whole app is one small state machine:
//
//   home ──new──▶ upload ──read──▶ work ◀──back── teacher
//     ▲                             │  └──────────▶ finish ──delete──▶ home
//     └──────────── header ─────────┘
//
// A first-time student (no assignments) lands on upload instead of an empty home.

type View =
  | { name: "home" }
  | { name: "upload" }
  | { name: "settings" }
  | { name: "work" | "teacher" | "finish"; id: string };

/** Mirror display preferences onto <html> so CSS can theme everything from data attributes. */
export function applyDisplay(s: Settings) {
  const el = document.documentElement;
  el.lang = s.dialect;
  Object.assign(el.dataset, { theme: s.theme, accent: s.accent, font: s.font, text: s.textSize, control: s.controlSize, spacing: s.spacing, motion: s.motion });
}

export default function ClaraApp() {
  const store = useClaraStore();
  const { settings } = store;
  const t = strings(settings.lang, settings.dialect);
  const voice = { lang: settings.lang, dialect: settings.dialect };
  const [view, setView] = useState<View>({ name: "home" });
  const main = useRef<HTMLElement>(null);

  useEffect(() => {
    if (store.ready) applyDisplay(settings);
  }, [store.ready, settings]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // On every screen change, move focus to the new heading so screen readers announce it.
  useEffect(() => {
    main.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [view.name, view.name !== "home" && "id" in view ? view.id : null]);

  const current = "id" in view ? store.assignments.find((a) => a.id === view.id) : undefined;
  const go = (name: "work" | "teacher" | "finish") => current && setView({ name, id: current.id });

  let body: React.ReactNode = null;
  if (!store.ready) body = null;
  else if (view.name === "settings") body = <SettingsScreen t={t} settings={settings} onSettings={store.setSettings} onWipe={() => { store.wipe(); setView({ name: "home" }); }} />;
  else if (view.name === "upload" || (view.name === "home" && store.assignments.length === 0))
    body = <Upload t={t} voice={voice} first={store.assignments.length === 0} onCreated={(a) => { store.upsert(a); setView({ name: "work", id: a.id }); }} />;
  else if (view.name === "home" || !current) body = <Home t={t} assignments={store.assignments} onOpen={(id) => setView({ name: "work", id })} onNew={() => setView({ name: "upload" })} />;
  else if (view.name === "work") body = <Workspace a={current} t={t} settings={settings} voice={voice} onUpdate={store.upsert} onSettings={store.setSettings} onOpenSettings={() => setView({ name: "settings" })} onTeacher={() => go("teacher")} onFinish={() => go("finish")} />;
  else if (view.name === "teacher")
    body = <Teacher a={current} t={t} settings={settings} onUpdate={store.upsert} onBack={() => go("work")} onStudentName={(studentName) => store.setSettings({ studentName })} />;
  else body = <Finish a={current} t={t} settings={settings} onUpdate={store.upsert} onBack={() => go("work")} onDelete={() => { store.remove(current.id); setView({ name: "home" }); }} />;

  const onHome = view.name === "home";
  const decor = store.ready && settings.decor && isActive(settings) ? packFor(settings, current?.themed) : null;
  return (
    <div className="app">
      {decor && <Decor pack={decor} />}
      <a className="skip" href="#main">{t.skip}</a>
      <header className="topbar">
        <button className="brand" onClick={() => setView({ name: "home" })} aria-label={`Clara · ${t.home}`}>
          <Mark size={26} />
          <span className="wordmark">Clara</span>
        </button>
        <nav className="topnav" aria-label="Clara">
          <button className="btn btn-quiet" aria-current={onHome ? "page" : undefined} onClick={() => setView({ name: "home" })}>
            <Icon name="home" /> <span className="hide-narrow">{t.home}</span>
          </button>
          <button className="btn btn-quiet" aria-current={view.name === "settings" ? "page" : undefined} onClick={() => setView({ name: "settings" })}>
            <Icon name="settings" /> <span className="hide-narrow">{t.settings}</span>
          </button>
        </nav>
      </header>
      <main id="main" ref={main} className="main">
        <AccessCode t={t} />
        {body}
      </main>
    </div>
  );
}

/** Shown only when the server asks for a demo access code (public deployments). */
function AccessCode({ t }: { t: Strings }) {
  const [needed, setNeeded] = useState(false);
  const [code, setCode] = useState("");
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setNeeded(Boolean(d?.accessCode) && !getAccessCode()))
      .catch(() => {});
  }, []);
  if (!needed) return null;
  return (
    <form className="panel access" onSubmit={(e) => { e.preventDefault(); setAccessCode(code); setNeeded(false); }}>
      <label htmlFor="code">{t.accessCodeLabel}</label>
      <div className="row">
        <input id="code" type="password" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn btn-primary" disabled={!code}>{t.accessCodeSave}</button>
      </div>
    </form>
  );
}
