import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import webpush, { type PushSubscription } from "web-push";

// Reminders need a server: a phone only wakes a closed web app when a push arrives.
// To keep Clara's promise that the student's work is not stored here, this queue holds only the
// browser's push address, an opaque reminder id and a time. The push carries only the id; the
// service worker on the phone looks up the text (see public/sw.js).
//
// The queue is a JSON file, and the app re-sends its reminders every time it opens, so a redeploy
// that wipes the file heals itself the next time the student opens Clara.

export type Reminder = { id: string; at: number };
type Entry = { subscription: PushSubscription; reminders: Reminder[]; lang: string };

const FILE = path.join(process.env.CLARA_DATA_DIR || os.tmpdir(), "clara-push.json");
const TICK_MS = 30_000;
const TOO_LATE_MS = 12 * 60 * 60_000; // a reminder this late is noise: skip it
const MAX_SUBSCRIPTIONS = 5_000;
export const MAX_REMINDERS = 60;

// The browser hands us this address, and the server then calls it: only real push services are allowed.
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/];

export function validEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== "string" || endpoint.length > 1024) return false;
  try {
    const u = new URL(endpoint);
    return u.protocol === "https:" && PUSH_HOSTS.some((h) => h.test(u.hostname));
  } catch {
    return false;
  }
}

export function validSubscription(s: unknown): s is PushSubscription {
  const sub = s as PushSubscription | null;
  return !!sub && validEndpoint(sub.endpoint) && typeof sub.keys?.p256dh === "string" && typeof sub.keys?.auth === "string" && sub.keys.p256dh.length < 200 && sub.keys.auth.length < 100;
}

// Route handlers and instrumentation can be separate bundles: one queue per process, on globalThis.
type Shared = { queue: Map<string, Entry>; timer?: ReturnType<typeof setInterval>; loaded: boolean };
const g = globalThis as typeof globalThis & { __claraPush?: Shared };
const shared: Shared = (g.__claraPush ??= { queue: new Map(), loaded: false });

function loadOnce() {
  if (shared.loaded) return;
  shared.loaded = true;
  try {
    for (const e of JSON.parse(fs.readFileSync(FILE, "utf8")) as Entry[]) shared.queue.set(e.subscription.endpoint, e);
  } catch {
    /* first run, or the file was wiped: the app re-sends its reminders when it opens */
  }
}

function persist() {
  try {
    fs.writeFileSync(FILE, JSON.stringify([...shared.queue.values()]));
  } catch (e) {
    console.error("[clara] push queue not saved", e instanceof Error ? e.message.slice(0, 120) : "");
  }
}

export function pushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function publicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY || null;
}

/** Sends one push. Returns "gone" when the browser no longer wants pushes at this address. */
export async function sendPush(subscription: PushSubscription, id: string): Promise<"sent" | "gone" | "failed"> {
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "https://github.com/uwelOriginal/Spark-Challenge", process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ id }), { TTL: 6 * 60 * 60, urgency: "high" });
    return "sent";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[clara] push failed", status ?? "");
    return "failed";
  }
}

/** Replace everything scheduled for this browser. An empty list keeps the address for the test button. */
export function schedule(subscription: PushSubscription, reminders: Reminder[], lang: string) {
  loadOnce();
  if (!shared.queue.has(subscription.endpoint) && shared.queue.size >= MAX_SUBSCRIPTIONS) return false;
  shared.queue.set(subscription.endpoint, { subscription, reminders: reminders.slice(0, MAX_REMINDERS), lang });
  persist();
  startScheduler();
  return true;
}

export function unschedule(endpoint: string) {
  loadOnce();
  if (shared.queue.delete(endpoint)) persist();
}

export async function tick(now = Date.now()) {
  loadOnce();
  let changed = false;
  for (const [endpoint, entry] of shared.queue) {
    const due = entry.reminders.filter((r) => r.at <= now);
    if (due.length === 0) continue;
    changed = true;
    entry.reminders = entry.reminders.filter((r) => r.at > now);
    for (const r of due) {
      if (now - r.at > TOO_LATE_MS) continue;
      if ((await sendPush(entry.subscription, r.id)) === "gone") {
        shared.queue.delete(endpoint);
        break;
      }
    }
  }
  if (changed) persist();
}

export function startScheduler() {
  if (shared.timer || !pushConfigured()) return;
  loadOnce();
  shared.timer = setInterval(() => void tick().catch(() => {}), TICK_MS);
  shared.timer.unref?.();
}
