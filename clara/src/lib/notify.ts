"use client";

import { getAccessCode } from "./api";
import { plannedNotifications } from "./calendar";
import type { Strings } from "./i18n";
import type { Assignment, Settings } from "./store";

// Reminder texts stay in a cache on the device. The server only gets ids and times.

export const REMINDER_CACHE = "clara-reminders-v1";
const REMINDER_KEY = "/__clara/reminders";

export type NotifyState = "unsupported" | "needs-install" | "denied" | "off" | "on" | "server-off";

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function headers(): HeadersInit {
  const code = getAccessCode();
  return { "Content-Type": "application/json", ...(code ? { "x-clara-code": code } : {}) };
}

async function post(body: unknown): Promise<Response> {
  return fetch("/api/push", { method: "POST", headers: headers(), body: JSON.stringify(body) });
}

async function config(): Promise<{ enabled: boolean; publicKey: string | null }> {
  const res = await fetch("/api/push", { headers: headers(), cache: "no-store" });
  return res.ok ? res.json() : { enabled: false, publicKey: null };
}

function keyBytes(key: string): Uint8Array<ArrayBuffer> {
  const raw = atob(key.replace(/-/g, "+").replace(/_/g, "/").padEnd(key.length + ((4 - (key.length % 4)) % 4), "="));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

async function currentSubscription(): Promise<PushSubscription | null> {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return null;
  const reg = await navigator.serviceWorker.getRegistration();
  return reg ? reg.pushManager.getSubscription() : null;
}

export async function notifyState(enabled: boolean): Promise<NotifyState> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  // iPhone only has these APIs in the installed app
  if (isIos() && !isStandalone()) return "needs-install";
  if (!supported) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  if (!(await config()).enabled) return "server-off";
  return enabled && Notification.permission === "granted" && (await currentSubscription()) ? "on" : "off";
}

// must run from a tap, browsers refuse otherwise
export async function enableNotifications(): Promise<boolean> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;
  const { publicKey } = await config();
  if (!publicKey) return false;
  const reg = await registration();
  const existing = await reg.pushManager.getSubscription();
  if (!existing) await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
  return true;
}

export async function disableNotifications(): Promise<void> {
  const sub = await currentSubscription();
  if (!sub) return;
  await post({ action: "remove", endpoint: sub.endpoint }).catch(() => null);
  await sub.unsubscribe().catch(() => false);
}

export async function syncNotifications(assignments: Assignment[], settings: Settings, t: Strings): Promise<number> {
  const sub = await currentSubscription();
  if (!sub) return 0;
  const planned = plannedNotifications(assignments, settings, t);
  const texts = Object.fromEntries(planned.map((p) => [p.id, { title: p.title, body: p.body, assignment: p.assignment }]));
  texts.test = { title: t.notifySampleTitle, body: t.notifySampleBody, assignment: "" };
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(REMINDER_KEY, new Response(JSON.stringify(texts), { headers: { "Content-Type": "application/json" } }));
  const res = await post({ action: "sync", subscription: sub.toJSON(), reminders: planned.map((p) => ({ id: p.id, at: p.at })), lang: settings.lang });
  return res.ok ? planned.length : 0;
}

export async function testNotification(): Promise<boolean> {
  const sub = await currentSubscription();
  if (!sub) return false;
  const res = await post({ action: "test", subscription: sub.toJSON() }).catch(() => null);
  return !!res?.ok;
}
