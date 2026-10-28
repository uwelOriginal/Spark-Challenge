import { buildIcs, googleCalendarLink, localDate, type CalEvent } from "./ics";
import type { Strings } from "./i18n";
import type { Assignment, Settings } from "./store";

// Turns one assignment into calendar events: each due date, a reminder N days before it at the
// student's chosen time, and a short block tomorrow for the first step.

export type PlannedEvent = CalEvent & { kind: "due" | "reminder" | "first-step"; google: string };

export function planEvents(a: Assignment, settings: Settings, t: Strings): PlannedEvent[] {
  const d = a.decode;
  if (!d) return [];
  const events: PlannedEvent[] = [];
  const now = new Date();
  const [rh, rm] = settings.reminderTime.split(":").map(Number);

  d.deadlines.forEach((dl, i) => {
    if (!dl.date) return;
    const due = localDate(dl.date, dl.time);
    const allDay = !dl.time;
    const end = allDay ? new Date(due.getFullYear(), due.getMonth(), due.getDate() + 1) : new Date(due.getTime() + 15 * 60_000);
    const title = `${t.dueEvent}: ${d.title}${d.deadlines.length > 1 ? ` (${dl.item})` : ""}`;
    const description = `${dl.when}\n${dl.item}\n— Clara`;
    events.push(withLink({ uid: `${a.id}-due-${i}`, title, description, start: due, end, allDay, kind: "due" }));

    for (const days of settings.reminderDays) {
      const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - days, rh || 9, rm || 0);
      if (at <= now) continue;
      events.push(
        withLink({
          uid: `${a.id}-rem-${i}-${days}`,
          title: `${t.reminderEvent(days)}: ${d.title}`,
          description: `${dl.when}\n— Clara`,
          start: at,
          end: new Date(at.getTime() + 10 * 60_000),
          allDay: false,
          kind: "reminder",
        }),
      );
    }
  });

  const firstOpen = d.steps.findIndex((_, i) => !a.done.includes(i));
  if (firstOpen >= 0) {
    const step = d.steps[firstOpen];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, rh || 9, rm || 0);
    events.push(
      withLink({
        uid: `${a.id}-step-${firstOpen}`,
        title: `${t.firstStepEvent}: ${step.action}`,
        description: `${t.doneWhen}: ${step.done_when}\n${d.title}\n— Clara`,
        start,
        end: new Date(start.getTime() + Math.max(10, step.minutes) * 60_000),
        allDay: false,
        kind: "first-step",
      }),
    );
  }
  return events.sort((x, y) => x.start.getTime() - y.start.getTime());
}

function withLink(e: Omit<PlannedEvent, "google">): PlannedEvent {
  return { ...e, google: googleCalendarLink(e) };
}

export function downloadIcs(events: CalEvent[], filename: string) {
  const blob = new Blob([buildIcs(events)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
