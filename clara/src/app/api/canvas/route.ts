import fs from "node:fs/promises";
import path from "node:path";
import { guard, json } from "@/lib/guard";
import { parseIcs } from "@/lib/ics";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST { url } -> upcoming assignments from a Canvas calendar feed
// (Canvas > Calendar > "Calendar Feed": https://<canvas-host>/feeds/calendars/user_<token>.ics).
// No Canvas login or API token. The feed URL stays on the student's device; we only read it.
// url = "demo" reads a synthetic feed bundled with the app.
export async function POST(req: Request) {
  const blocked = guard(req);
  if (blocked) return blocked;

  let url = "";
  try {
    url = String((await req.json()).url ?? "").trim();
  } catch {
    return json({ error: "bad_request" }, 400);
  }

  let raw: string;
  try {
    if (url === "demo") {
      raw = await fs.readFile(path.join(process.cwd(), "public", "samples", "canvas-demo.ics"), "utf8");
    } else {
      const u = new URL(url);
      // Only Canvas-style calendar feeds over HTTPS (limits what this endpoint can be used to fetch).
      if (u.protocol !== "https:" || !/\/feeds\/calendars\/[^/]+\.ics$/i.test(u.pathname)) {
        return json({ error: "bad_feed_url" }, 400);
      }
      const res = await fetch(u, { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!res.ok) return json({ error: "feed_unavailable" }, 502);
      raw = (await res.text()).slice(0, 2_000_000);
    }
  } catch {
    return json({ error: "feed_unavailable" }, 502);
  }

  const now = Date.now();
  const horizon = now + 60 * 24 * 3600 * 1000;
  const items = parseIcs(raw)
    .filter((i) => {
      const t = Date.parse(i.start.length === 10 ? i.start + "T23:59:00" : i.start);
      return url === "demo" || (Number.isFinite(t) && t >= now - 24 * 3600 * 1000 && t <= horizon);
    })
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 30);
  return json({ items });
}
