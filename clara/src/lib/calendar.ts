import { buildIcs, googleCalendarLink, localDate, type CalEvent } from "./ics";
import type { Strings } from "./i18n";
import { nextStep, type Assignment, type Settings } from "./store";

// Turns one assignment into calendar events: each due date, a reminder N days before it at the
// student's chosen time, and a short block tomorrow for the first step.

export type PlannedEvent = CalEvent & { kind: "due" | "reminder" | "first-step" };

export function planEvents(a: Assignment, settings: Settings, t: Strings): PlannedEvent[] {
  const d = a.decode;
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
    events.push({ uid: `${a.id}-due-${i}`, title, description, start: due, end, allDay, kind: "due" });

    for (const days of settings.reminderDays) {
      const at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - days, rh || 9, rm || 0);
      if (at <= now) continue;
      events.push({
          uid: `${a.id}-rem-${i}-${days}`,
          title: `${t.reminderEvent(days)}: ${d.title}`,
          description: `${dl.when}\n— Clara`,
          start: at,
          end: new Date(at.getTime() + 10 * 60_000),
          allDay: false,
          kind: "reminder",
        });
    }
  });

  const firstOpen = nextStep(a);
  if (firstOpen >= 0) {
    const step = d.steps[firstOpen];
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, rh || 9, rm || 0);
    events.push({
        uid: `${a.id}-step-${firstOpen}`,
        title: `${t.firstStepEvent}: ${step.action}`,
        description: `${t.doneWhen}: ${step.done_when}\n${d.title}\n— Clara`,
        start,
        end: new Date(start.getTime() + Math.max(10, step.minutes) * 60_000),
        allDay: false,
        kind: "first-step",
      });
  }
  return events.sort((x, y) => x.start.getTime() - y.start.getTime());
}

/** The .ics file for one assignment, or null when no deadline has a date. */
export function calendarFile(a: Assignment, settings: Settings, t: Strings): string | null {
  const events = planEvents(a, settings, t);
  return events.some((e) => e.kind === "due") ? buildIcs(events) : null;
}

/** Google Calendar link for the first due date (a link carries one event, so no reminders), or null. */
export function calendarLink(a: Assignment, settings: Settings, t: Strings): string | null {
  const due = planEvents(a, settings, t).find((e) => e.kind === "due");
  return due ? googleCalendarLink(due) : null;
}
