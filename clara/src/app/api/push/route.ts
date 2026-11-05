import { guard, json } from "@/lib/guard";
import { MAX_REMINDERS, publicKey, pushConfigured, schedule, sendPush, unschedule, validEndpoint, validSubscription, type Reminder } from "@/lib/pushServer";

export const runtime = "nodejs";
export const maxDuration = 30;

const TEST_DELAY_MS = 10_000;

// GET -> { enabled, publicKey }
export async function GET(req: Request) {
  const blocked = guard(req, { rateLimit: false });
  if (blocked) return blocked;
  return json({ enabled: pushConfigured(), publicKey: publicKey() });
}

// POST { action: "sync", subscription, reminders: [{id, at}], lang } -> replaces this browser's reminders
// POST { action: "test", subscription, id }                          -> one push, 10 seconds from now
// POST { action: "remove", endpoint }                                -> forgets this browser
// Reminder texts never reach this route: only opaque ids and times (see lib/pushServer.ts).
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;
  if (!pushConfigured()) return json({ error: "push_not_configured" }, 503);

  let body: { action?: unknown; subscription?: unknown; endpoint?: unknown; reminders?: unknown; lang?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  if (body.action === "remove") {
    if (!validEndpoint(body.endpoint)) return json({ error: "bad_request" }, 400);
    unschedule(body.endpoint);
    return json({ ok: true });
  }

  if (!validSubscription(body.subscription)) return json({ error: "bad_request" }, 400);

  if (body.action === "test") {
    await new Promise((r) => setTimeout(r, TEST_DELAY_MS));
    const result = await sendPush(body.subscription, "test");
    return json({ result }, result === "sent" ? 200 : 502);
  }

  if (body.action === "sync") {
    const raw = Array.isArray(body.reminders) ? body.reminders.slice(0, MAX_REMINDERS) : [];
    const reminders: Reminder[] = [];
    for (const r of raw as { id?: unknown; at?: unknown }[]) {
      if (typeof r?.id === "string" && r.id.length <= 80 && typeof r.at === "number" && Number.isFinite(r.at)) reminders.push({ id: r.id, at: r.at });
    }
    if (!schedule(body.subscription, reminders, body.lang === "en" ? "en" : "es")) return json({ error: "busy" }, 429);
    return json({ scheduled: reminders.length });
  }

  return json({ error: "bad_request" }, 400);
}
