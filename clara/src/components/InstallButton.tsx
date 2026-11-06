"use client";

import { useEffect, useState } from "react";
import type { Strings } from "@/lib/i18n";
import { Icon } from "./ui";

// Chromium browsers get the native prompt, but it can come late or never, so Android phones
// show the menu steps until it's ready. iPhones have no prompt at all, so always the steps.
// Never opens by itself.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
type InstallWindow = Window & { __claraInstall?: InstallEvent | null };
type Mode = "hidden" | "prompt" | "ios" | "menu" | "inapp";

const UA = () => navigator.userAgent;
const isAndroid = () => /Android/i.test(UA());
function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(UA()) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
// in-app browsers can't install
function isInAppBrowser(): boolean {
  return /FBAN|FBAV|FB_IAB|Instagram|Line\/|TikTok|musical_ly|Snapchat|MicroMessenger|; wv\)/i.test(UA());
}
function isInstalled(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function fallbackMode(): Mode {
  if (isInAppBrowser()) return "inapp";
  if (isIos()) return "ios";
  return isAndroid() ? "menu" : "hidden";
}

export function InstallButton({ t }: { t: Strings }) {
  const [mode, setMode] = useState<Mode>("hidden");
  const [help, setHelp] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isInstalled()) return;
    // layout.tsx keeps the event if it fired before React loaded
    setMode((window as InstallWindow).__claraInstall ? "prompt" : fallbackMode());
    const ready = () => {
      setMode("prompt");
      setHelp(false);
    };
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
    if (mode !== "prompt") return setHelp(!help);
    const w = window as InstallWindow;
    const event = w.__claraInstall;
    if (!event) return setMode(fallbackMode());
    await event.prompt();
    const choice = await event.userChoice.catch(() => null);
    w.__claraInstall = null; // single use
    setMode(choice?.outcome === "accepted" ? "hidden" : fallbackMode());
  }

  async function copy() {
    await navigator.clipboard?.writeText(location.origin).catch(() => {});
    setCopied(true);
  }

  // Android can jump to Chrome from another app
  const chromeLink = `intent://${location.host}/#Intent;scheme=https;package=com.android.chrome;end`;

  return (
    <>
      <button className="btn btn-quiet" aria-expanded={mode === "prompt" ? undefined : help} onClick={() => void install()}>
        <Icon name="install" /> <span>{t.installShort}</span>
      </button>
      {help && (
        <div className="panel install-help" role="region" aria-label={t.installApp}>
          {mode === "inapp" ? (
            <>
              <p>{t.installInApp}</p>
              <div className="row">
                {isAndroid() && <a className="btn btn-primary btn-small" href={chromeLink}>{t.installOpenChrome}</a>}
                <button className="btn btn-small" onClick={() => void copy()}>{t.installCopyLink}</button>
              </div>
              <div aria-live="polite">{copied && <p className="muted small">{t.installCopied}</p>}</div>
            </>
          ) : (
            <>
              <p className="small">{t.installIntro}</p>
              <ol>
                <li>{mode === "ios" ? t.installIosShare : t.installMenuOpen}</li>
                <li>{mode === "ios" ? t.installIosAdd : t.installMenuAdd}</li>
              </ol>
              {mode === "ios" && <p className="muted small">{t.installIosSafari}</p>}
            </>
          )}
          <button className="btn btn-small" onClick={() => setHelp(false)}>{t.close}</button>
        </div>
      )}
    </>
  );
}
