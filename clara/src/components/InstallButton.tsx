"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";
import { Icon } from "./ui";

// "Install Clara". Android and desktop Chrome/Edge get the browser's own install dialog. iOS has no
// such dialog, so it gets the two steps instead. Hidden once installed or when the browser can't
// install. It never opens by itself: a surprise popup is exactly what Clara avoids.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type InstallWindow = Window & { __claraInstall?: InstallEvent | null };

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function InstallButton({ t }: { t: Strings }) {
  const [mode, setMode] = useState<"hidden" | "prompt" | "ios">("hidden");
  const [help, setHelp] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    if (isIos()) return setMode("ios");
    // The event can fire before React loads: the inline script in layout.tsx keeps it for us.
    if ((window as InstallWindow).__claraInstall) setMode("prompt");
    const ready = () => setMode("prompt");
    const installed = () => setMode("hidden");
    window.addEventListener("clara-install-ready", ready);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("clara-install-ready", ready);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (mode === "hidden") return null;

  async function install() {
    if (mode === "ios") return setHelp(!help);
    const w = window as InstallWindow;
    const event = w.__claraInstall;
    if (!event) return setMode("hidden");
    await event.prompt();
    await event.userChoice.catch(() => null);
    w.__claraInstall = null; // a prompt event can only be used once
    setMode("hidden");
  }

  return (
    <>
      <button className="btn btn-quiet" aria-expanded={mode === "ios" ? help : undefined} onClick={() => void install()}>
        <Icon name="install" /> <span className="hide-narrow">{t.installApp}</span>
      </button>
      {help && (
        <div className="panel install-help" role="region" aria-label={t.installApp}>
          <ol>
            <li>{t.installIosShare}</li>
            <li>{t.installIosAdd}</li>
          </ol>
          <p className="muted small">{t.installIosSafari}</p>
          <button className="btn btn-small" onClick={() => setHelp(false)}>{t.close}</button>
        </div>
      )}
    </>
  );
}
