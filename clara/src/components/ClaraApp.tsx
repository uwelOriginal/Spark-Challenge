"use client";

import { useEffect, useRef, useState } from "react";
import { getAccessCode, setAccessCode } from "@/lib/api";
import { strings, type Strings } from "@/lib/i18n";
import { useClaraStore, type Settings } from "@/lib/store";
import { Home, Upload } from "./Home";
import SettingsScreen from "./Settings";
import { disableNotifications, syncNotifications } from "@/lib/notify";
import { isActive, packFor } from "@/lib/personal";
import { Decor } from "./studio/Decor";
import { InstallButton } from "./InstallButton";
import { Icon, Mark } from "./ui";
import Workspace from "./Workspace";
import { Finish, Teacher } from "./Wrapup";

// Views: home -> upload -> work -> teacher | finish. First visit with no assignments starts on upload.

type View =
  | { name: "home" }
  | { name: "upload" }
  | { name: "settings" }
  | { name: "work" | "teacher" | "finish"; id: string };

// CSS themes everything from these data attributes
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
  const access = useAccess();

  useEffect(() => {
    if (store.ready) applyDisplay(settings);
  }, [store.ready, settings]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  // /?open=<id> comes from the service worker
  useEffect(() => {
    if (!store.ready) return;
    const url = new URL(window.location.href);
    const open = url.searchParams.get("open");
    if (!open) return;
    url.searchParams.delete("open");
    window.history.replaceState(null, "", url);
    setView({ name: "work", id: open });
  }, [store.ready]);

  // reschedule when dates or finished work change
  useEffect(() => {
    if (!store.ready || access.state !== "open" || !("serviceWorker" in navigator)) return;
    const wait = setTimeout(() => {
      if (settings.notifications) void syncNotifications(store.assignments, settings, t).catch(() => {});
      else void disableNotifications().catch(() => {}); // also runs after deleting all data
    }, 800);
    return () => clearTimeout(wait);
  }, [store.ready, access.state, store.assignments, settings.notifications, settings.reminderDays, settings.reminderTime, settings.lang]);

  // move focus so screen readers announce the new screen
  useEffect(() => {
    main.current?.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  }, [view.name, view.name !== "home" && "id" in view ? view.id : null, access.state]);

  const current = "id" in view ? store.assignments.find((a) => a.id === view.id) : undefined;
  const go = (name: "work" | "teacher" | "finish") => current && setView({ name, id: current.id });

  let body: React.ReactNode = null;
  if (!store.ready) body = null;
  else if (view.name === "settings") body = <SettingsScreen t={t} assignments={store.assignments} settings={settings} onSettings={store.setSettings} onWipe={() => { store.wipe(); setView({ name: "home" }); }} />;
  else if (view.name === "upload" || (view.name === "home" && store.assignments.length === 0))
    body = <Upload t={t} voice={voice} settings={settings} onSettings={store.setSettings} first={store.assignments.length === 0} onCreated={(a) => { store.upsert(a); setView({ name: "work", id: a.id }); }} />;
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
        {access.state === "open" && (
          <nav className="topnav" aria-label="Clara">
            <InstallButton t={t} />
            <button className="btn btn-quiet" aria-current={onHome ? "page" : undefined} onClick={() => setView({ name: "home" })}>
              <Icon name="home" /> <span className="hide-narrow">{t.home}</span>
            </button>
            <button className="btn btn-quiet" aria-current={view.name === "settings" ? "page" : undefined} onClick={() => setView({ name: "settings" })}>
              <Icon name="settings" /> <span className="hide-narrow">{t.settings}</span>
            </button>
          </nav>
        )}
      </header>
      <main id="main" ref={main} className="main">
        {access.state === "open" && body}
        {access.state === "locked" && <AccessScreen t={t} access={access} />}
      </main>
    </div>
  );
}

// UI check only, guard() on the server is what actually protects the API
async function codeAccepted(code: string): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { headers: code ? { "x-clara-code": code } : {}, cache: "no-store" });
    return (await res.json()).authorized !== false;
  } catch {
    return true; // offline: saved work still readable
  }
}

function useAccess() {
  const [state, setState] = useState<"checking" | "locked" | "open">("checking");
  const [wrong, setWrong] = useState(false);

  async function tryCode(code: string) {
    const accepted = await codeAccepted(code);
    if (accepted) setAccessCode(code);
    setWrong(!accepted && Boolean(code));
    setState(accepted ? "open" : "locked");
  }

  useEffect(() => {
    // a shared link or QR can carry ?code=
    const url = new URL(window.location.href);
    const shared = url.searchParams.get("code");
    if (shared) {
      url.searchParams.delete("code");
      window.history.replaceState(null, "", url);
    }
    void tryCode(shared ?? getAccessCode());
  }, []);

  return { state, wrong, tryCode };
}

function AccessScreen({ t, access }: { t: Strings; access: ReturnType<typeof useAccess> }) {
  const [code, setCode] = useState("");
  return (
    <form className="panel access" onSubmit={(e) => { e.preventDefault(); void access.tryCode(code.trim()); }}>
      <h1 className="h1" tabIndex={-1}>{t.accessCodeTitle}</h1>
      <p className="muted">{t.accessCodeHelp}</p>
      <label htmlFor="code">{t.accessCodeLabel}</label>
      <div className="row">
        <input id="code" type="password" autoComplete="off" autoCapitalize="none" autoCorrect="off" aria-describedby={access.wrong ? "code-wrong" : undefined} value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn btn-primary" disabled={!code.trim()}>{t.accessCodeSave}</button>
      </div>
      <div aria-live="polite">{access.wrong && <p id="code-wrong" className="notice notice-warn">{t.accessCodeWrong}</p>}</div>
    </form>
  );
}
