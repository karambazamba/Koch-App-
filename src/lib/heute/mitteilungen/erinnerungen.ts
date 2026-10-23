// Erinnerungen wie bei Termin-Apps (Tafel 77): eine Erinnerung ist eine
// Uhrzeit an einem Termin oder einer Aufgabe – keine eigene Kachel. Hier die
// reine Rechnung, wann was erinnert und mit welchem Text (für Mitteilungen
// auf dem Gerät und später den Server). Termine: n Min vorher (Standard aus
// den Mitteilungs-Einstellungen), ganztägig um 8:00, „Am Vorabend“ = 19:00 am
// Tag davor. Aufgaben mit Uhrzeit: genau dann.

import { addDays } from "@/lib/core/now";
import { itemsForDay, weekdayShort, type CalendarEntry, type DayItem, type Reminder } from "@/lib/kalender/model";

export type ReminderMoment = {
  /** "<eintrag>@<tag>" – je Termin und Tag einmal */
  key: string;
  /** Tag und Minute (Europe/Berlin), an dem erinnert wird */
  date: string;
  minute: number;
  title: string;
  body: string;
  /** Antippen öffnet genau diesen Eintrag (Tag-Ansicht) */
  href: string;
  kind: "termin-familie" | "termin-arbeit" | "aufgabe";
};

const toMin = (clock: string) => Number(clock.slice(0, 2)) * 60 + Number(clock.slice(3, 5));
const clockLabel = (clock: string) => clock.replace(/^0(\d)/, "$1");
const ALL_DAY_MINUTE = 8 * 60;
const EVE_MINUTE = 19 * 60;

/** „In 30 Min: Zahnarzt Jonne · 16:00 · Praxis Dr. Krüger“ */
function body(item: DayItem, lead: string): string {
  const place = item.entry.typ === "termin" ? (item.entry.data as { place?: string }).place?.trim() : undefined;
  return [`${lead}: ${item.title}`, item.time ? clockLabel(item.time) : null, place || null].filter(Boolean).join(" · ");
}

function moment(item: DayItem, date: string, minute: number, lead: string): ReminderMoment {
  const kind = item.entry.typ === "aufgabe" ? "aufgabe" : item.room === "arbeit" ? "termin-arbeit" : "termin-familie";
  return { key: item.key, date, minute, title: item.title, body: body(item, lead), href: `/tag?datum=${item.date}`, kind };
}

/** Wann (und wie) ein Eintrag an seinem Tag erinnert – null = gar nicht */
export function reminderFor(item: DayItem): ReminderMoment | null {
  if (item.done || item.reminder === "aus") return null;
  if (item.reminder === "vorabend") return moment(item, addDays(item.date, -1), EVE_MINUTE, `Morgen (${weekdayShort(item.date)})`);
  if (item.entry.typ === "aufgabe") return item.time ? moment(item, item.date, toMin(item.time), "Jetzt") : null;
  if (!item.time) return moment(item, item.date, ALL_DAY_MINUTE, "Heute");
  const before = Number(item.reminder);
  const start = toMin(item.time);
  const at = start - before;
  const lead = before >= 60 && before % 60 === 0 ? `In ${before / 60} Std` : `In ${before} Min`;
  // Über Mitternacht zurück: am Vortag
  return at >= 0 ? moment(item, item.date, at, lead) : moment(item, addDays(item.date, -1), at + 24 * 60, lead);
}

/** Alle Erinnerungen von `from` (Tag, Minute) bis einschließlich `untilDate` */
export function remindersBetween(entries: CalendarEntry[], today: string, from: { date: string; minute: number }, untilDate: string): ReminderMoment[] {
  const out: ReminderMoment[] = [];
  // einen Tag weiter schauen – „Am Vorabend“ liegt am Tag davor
  for (let d = from.date; d <= addDays(untilDate, 1); d = addDays(d, 1)) {
    for (const item of itemsForDay(entries, d, today)) {
      const m = reminderFor(item);
      if (!m || m.date > untilDate) continue;
      if (m.date < from.date || (m.date === from.date && m.minute < from.minute)) continue;
      out.push(m);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.minute - b.minute);
}

/** Jetzt fällig (in den letzten `windowMin` Minuten), noch nicht gemeldet */
export function dueNow(entries: CalendarEntry[], today: string, minuteNow: number, sent: string[], windowMin = 5): ReminderMoment[] {
  const fromMinute = minuteNow - windowMin;
  const from = fromMinute >= 0 ? { date: today, minute: fromMinute } : { date: addDays(today, -1), minute: fromMinute + 24 * 60 };
  return remindersBetween(entries, today, from, today).filter((m) => !(m.date === today && m.minute > minuteNow) && !sent.includes(`${m.key}#${m.date}`));
}

/** Was jetzt als Mitteilung raus darf – Regeln aus `pushAllowed` (Pause = Ruhe, Ruhe nach Feierabend) */
export function remindersToSend(
  entries: CalendarEntry[],
  ctx: { today: string; minute: number; sent: string[]; on: boolean; paused: boolean; allowed: (m: ReminderMoment) => boolean },
): ReminderMoment[] {
  if (!ctx.on || ctx.paused) return [];
  return dueNow(entries, ctx.today, ctx.minute, ctx.sent).filter(ctx.allowed);
}

/** Pause aktiv an diesem Tag? */
export const pauseOn = (pause: { from: string; until: string | null } | null | undefined, today: string) => Boolean(pause && pause.from <= today && (!pause.until || today <= pause.until));

/** Chip in der Schnelleingabe: „17:00 erinnern“ (Termin: Standard vor Beginn, Aufgabe: genau dann) */
export function quickReminderLabel(kind: "termin" | "aufgabe", time: string | null | undefined, reminder: Reminder, on: boolean): string | null {
  if (!time) return null;
  if (!on || reminder === "aus") return "Nicht erinnern";
  if (kind === "aufgabe") return `${clockLabel(time)} erinnern`;
  if (reminder === "vorabend") return "Am Vorabend erinnern";
  const at = (toMin(time) - Number(reminder) + 24 * 60) % (24 * 60);
  return `${Math.floor(at / 60)}:${String(at % 60).padStart(2, "0")} erinnern`;
}
