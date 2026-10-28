"use client";

import { useEffect, useState } from "react";
import { getAccessCode, setAccessCode } from "@/lib/api";
import { STRINGS } from "@/lib/i18n";
import { useClaraStore } from "@/lib/store";
import AssignmentView, { type Tab } from "./AssignmentView";
import { AssignmentList, NewAssignment, SettingsScreen, Today } from "./Screens";
import { Icon, Mark } from "./ui";

type View = { name: "today" | "list" | "new" | "settings" } | { name: "assignment"; id: string; tab: Tab };

/** App shell: a sidebar on wide screens, a bottom bar on phones. All state lives on the device. */
export default function ClaraApp() {
  const store = useClaraStore();
  const { settings } = store;
  const t = STRINGS[settings.lang];
  const [view, setView] = useState<View>({ name: "today" });
  const [code, setCode] = useState("");

  useEffect(() => {
    document.documentElement.lang = settings.lang;
  }, [settings.lang]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  const open = (id: string, tab: Tab = "summary") => setView({ name: "assignment", id, tab });
  const tab: Tab = view.name === "assignment" ? view.tab : "summary";
  const current = view.name === "assignment" ? store.assignments.find((a) => a.id === view.id) : undefined;
  const navItems = [
    { id: "today" as const, icon: "today", label: t.nav.today },
    { id: "list" as const, icon: "list", label: t.nav.list },
    { id: "new" as const, icon: "plus", label: t.nav.add },
    { id: "settings" as const, icon: "settings", label: t.nav.settings },
  ];
  const active = view.name === "assignment" ? "list" : view.name;

  let body: React.ReactNode = null;
  if (!store.ready) body = null;
  else if (view.name === "today")
    body = <Today t={t} lang={settings.lang} settings={settings} assignments={store.assignments} onOpen={open} onNew={() => setView({ name: "new" })} onCreate={store.upsert} />;
  else if (view.name === "list")
    body = <AssignmentList t={t} lang={settings.lang} assignments={store.assignments} onOpen={open} onNew={() => setView({ name: "new" })} />;
  else if (view.name === "new")
    body = <NewAssignment t={t} lang={settings.lang} settings={settings} onCanvasUrl={(u) => store.setSettings({ canvasFeedUrl: u })} onCreate={store.upsert} onOpen={open} />;
  else if (view.name === "settings")
    body = <SettingsScreen t={t} settings={settings} onSettings={store.setSettings} onWipe={() => { store.wipe(); setView({ name: "today" }); }} />;
  else if (current?.decode)
    body = (
      <>
        <button className="back" onClick={() => setView({ name: "list" })}><Icon name="back" /> {t.nav.list}</button>
        <AssignmentView
          a={current}
          settings={settings}
          t={t}
          lang={settings.lang}
          tab={tab}
          onTab={(tab) => setView({ name: "assignment", id: current.id, tab })}
          onUpdate={store.upsert}
          onDelete={(id) => { store.remove(id); setView({ name: "list" }); }}
          onCanvasUrl={(u) => store.setSettings({ canvasFeedUrl: u })}
          onStudentName={(n) => store.setSettings({ studentName: n })}
        />
      </>
    );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <Mark />
          <div>
            <span className="wordmark">Clara</span>
            <span className="brand-sub">{t.appTagline}</span>
          </div>
        </div>
        <nav aria-label="Clara">
          {navItems.map((n) => (
            <button key={n.id} className="nav-item" aria-current={active === n.id ? "page" : undefined} onClick={() => setView({ name: n.id })}>
              <Icon name={n.icon} /> {n.label}
            </button>
          ))}
        </nav>
      </aside>

      <header className="topbar">
        <Mark size={24} />
        <span className="wordmark">Clara</span>
      </header>

      <main className="canvas">
        <AccessCode t={t} code={code} setCode={setCode} />
        {body}
      </main>

      <nav className="bottombar" aria-label="Clara">
        {navItems.map((n) => (
          <button key={n.id} className="tabbar-item" aria-current={active === n.id ? "page" : undefined} onClick={() => setView({ name: n.id })}>
            <Icon name={n.icon} size={22} />
            <span>{n.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/** Shown only when the server asks for a demo access code (public deployments). */
function AccessCode({ t, code, setCode }: { t: (typeof STRINGS)["es"]; code: string; setCode: (c: string) => void }) {
  const [needed, setNeeded] = useState(false);
  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => setNeeded(Boolean(d?.accessCode) && !getAccessCode()))
      .catch(() => {});
  }, []);
  if (!needed) return null;
  return (
    <div className="panel access">
      <label htmlFor="code">{t.accessCodeLabel}</label>
      <div className="row">
        <input id="code" type="password" value={code} onChange={(e) => setCode(e.target.value)} />
        <button className="btn btn-primary" disabled={!code} onClick={() => { setAccessCode(code); setNeeded(false); }}>{t.accessCodeSave}</button>
      </div>
    </div>
  );
}
