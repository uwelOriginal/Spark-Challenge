// .ics files, no OAuth. Reminders are separate short events because some apps ignore VALARM.

export type CalEvent = { uid: string; title: string; description: string; start: Date; end: Date; allDay: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

// floating time: the device's time zone
function icsLocal(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}
function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}
// RFC 5545 folding, approximated by characters
function fold(line: string): string {
  const out: string[] = [];
  for (let i = 0; i < line.length; i += 73) out.push((i ? " " : "") + line.slice(i, i + 73));
  return out.join("\r\n");
}

export function googleCalendarLink(e: CalEvent): string {
  const stamp = e.allDay ? icsDate : icsLocal;
  const q = new URLSearchParams({ action: "TEMPLATE", text: e.title, dates: `${stamp(e.start)}/${stamp(e.end)}`, details: e.description });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function buildIcs(events: CalEvent[]): string {
  const now = icsLocal(new Date());
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Clara//Spark Challenge//ES", "CALSCALE:GREGORIAN"];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@clara`,
      `DTSTAMP:${now}`,
      e.allDay ? `DTSTART;VALUE=DATE:${icsDate(e.start)}` : `DTSTART:${icsLocal(e.start)}`,
      e.allDay ? `DTEND;VALUE=DATE:${icsDate(e.end)}` : `DTEND:${icsLocal(e.end)}`,
      fold(`SUMMARY:${esc(e.title)}`),
      fold(`DESCRIPTION:${esc(e.description)}`),
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      fold(`DESCRIPTION:${esc(e.title)}`),
      "TRIGGER:-PT0M",
      "END:VALARM",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function localDate(date: string, time: string | null): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = (time ?? "00:00").split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mm || 0);
}

// Parsing

export type FeedItem = { uid: string; title: string; description: string; start: string; url: string | null };

function unescapeIcs(s: string): string {
  return s.replace(/\\n/gi, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string): string {
  // 20261113T235900Z | 20261113T235900 | 20261113
  const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?/);
  if (!m) return value;
  const [, y, mo, d, h, mi, s, z] = m;
  if (!h) return `${y}-${mo}-${d}`;
  return `${y}-${mo}-${d}T${h}:${mi}:${s}${z ? "Z" : ""}`;
}

export function parseIcs(raw: string): FeedItem[] {
  const unfolded = raw.replace(/\r/g, "").replace(/\n[ \t]/g, "");
  const items: FeedItem[] = [];
  for (const block of unfolded.split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const get = (key: string) => {
      const line = body.split("\n").find((l) => l.startsWith(key + ":") || l.startsWith(key + ";"));
      return line ? unescapeIcs(line.slice(line.indexOf(":") + 1)) : "";
    };
    const uid = get("UID");
    const description = get("DESCRIPTION")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/[ \t]+/g, " ")
      .trim();
    items.push({
      uid,
      title: get("SUMMARY"),
      description,
      start: parseIcsDate(get("DTSTART")),
      url: get("URL") || null,
    });
  }
  return items;
}
