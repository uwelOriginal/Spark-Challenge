import { buildIcs, googleCalendarLink, localDate, type CalEvent } from "./ics.ts";
import type { Strings } from "./i18n";
import { nextStep, type Assignment, type Settings } from "./store.ts";

// Events per assignment: due dates, reminders, and a short block tomorrow for the first step.

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
    const description = `${dl.when}\n${dl.item}\n(Clara)`;
    events.push({ uid: `${a.id}-due-${i}`, title, description, start: due, end, allDay, kind: "due" });

    // day 0 is the due day
    for (const days of [...settings.reminderDays, 0]) {
      let at = new Date(due.getFullYear(), due.getMonth(), due.getDate() - days, rh || 9, rm || 0);
      if (days === 0 && !allDay && at >= due) at = new Date(due.getTime() - 60 * 60_000);
      if (at <= now) continue;
      events.push({
          uid: `${a.id}-rem-${i}-${days}`,
          title: `${t.reminderEvent(days)}: ${d.title}`,
          description: `${dl.when}\n(Clara)`,
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
        description: `${t.doneWhen}: ${step.done_when}\n${d.title}\n(Clara)`,
        start,
        end: new Date(start.getTime() + Math.max(10, step.minutes) * 60_000),
        allDay: false,
        kind: "first-step",
      });
  }
  return events.sort((x, y) => x.start.getTime() - y.start.getTime());
}

// all-day events would otherwise notify at midnight
export function plannedNotifications(list: Assignment[], settings: Settings, t: Strings) {
  const now = Date.now();
  return list
    .filter((a) => !a.finishedAt)
    .flatMap((a) =>
      planEvents(a, settings, t)
        .filter((e) => e.start.getTime() > now && (e.kind !== "due" || !e.allDay))
        .map((e) => ({ id: e.uid, at: e.start.getTime(), title: e.title, body: e.description.replace(/\n\(Clara\)$/, ""), assignment: a.id })),
    )
    .sort((x, y) => x.at - y.at)
    .slice(0, 60);
}

export function calendarAll(list: Assignment[], settings: Settings, t: Strings): string | null {
  const events = list.filter((a) => !a.finishedAt).flatMap((a) => planEvents(a, settings, t));
  return events.some((e) => e.kind === "due") ? buildIcs(events) : null;
}

export function calendarFile(a: Assignment, settings: Settings, t: Strings): string | null {
  const events = planEvents(a, settings, t);
  return events.some((e) => e.kind === "due") ? buildIcs(events) : null;
}

// a link holds one event, so no reminders
export function calendarLink(a: Assignment, settings: Settings, t: Strings): string | null {
  const due = planEvents(a, settings, t).find((e) => e.kind === "due");
  return due ? googleCalendarLink(due) : null;
}
