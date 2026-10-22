// Erinnerungen, solange es noch keine Push gibt: Eine fällige Erinnerung
// erscheint als Thema der Jetzt-Karte oben auf "Heute" ("In 30 Minuten: Jonne
// abholen."). Ab dem Erinnerungszeitpunkt bis zum Beginn, einmal "Okay" =
// gesehen. Vorabend = am Tag davor ab 19 Uhr.

import { addDays } from "@/lib/core/now";
import { itemsForDay, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";

const minutesOf = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

type DueReminder = { key: string; item: DayItem; text: string };

/** Fällige Erinnerung jetzt (die nächste zuerst), sonst null */
export function dueReminder(entries: CalendarEntry[], today: string, minutesNow: number, seen: string[]): DueReminder | null {
  const due: DueReminder[] = [];
  for (const item of itemsForDay(entries, today, today)) {
    if (item.done || !item.time || item.reminder === "aus" || item.reminder === "vorabend" || seen.includes(item.key)) continue;
    const start = minutesOf(item.time);
    const before = Number(item.reminder);
    if (minutesNow >= start - before && minutesNow < start) {
      const left = start - minutesNow;
      const when = left <= 1 ? "Gleich" : left < 60 ? `In ${left} Minuten` : left === 60 ? "In einer Stunde" : `Um ${item.time}`;
      due.push({ key: item.key, item, text: `${when}: ${item.title}.` });
    }
  }
  // Vorabend: Einträge von morgen ab 19 Uhr
  if (minutesNow >= 19 * 60) {
    const tomorrow = addDays(today, 1);
    for (const item of itemsForDay(entries, tomorrow, today)) {
      if (item.done || item.reminder !== "vorabend" || seen.includes(item.key)) continue;
      due.push({ key: item.key, item, text: `Morgen (${weekdayShort(item.date)})${item.time ? ` um ${item.time}` : ""}: ${item.title}.` });
    }
  }
  return due.sort((a, b) => (a.item.date + (a.item.time ?? "")).localeCompare(b.item.date + (b.item.time ?? "")))[0] ?? null;
}
