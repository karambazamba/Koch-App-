// Sport planen (rein): ein Training als Termin mit Etikett „Sport“ anlegen
// oder ändern (nur diesmal / jede Woche), Überschneidung mit anderen
// Terminen erkennen (nur Hinweis, trotzdem erlaubt), zuletzt genutzte Zeit je
// Sportart, die Zeile „Als Nächstes“ auf der Kachel.

import { createEntry, type Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import { clockLabel } from "@/lib/kalender/answers";
import { itemsForDay, removeItem, sanitizeEntry, tomorrowLabel, upsertEntry, weekdayShort, type CalendarEntry, type DayItem, type Termin } from "@/lib/kalender/model";
import { endOf, guessSport, sportById } from "@/lib/sport/model";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Sportart eines geplanten Termins: erkannt aus dem Titel, sonst der Titel selbst (eigene Sportart) */
export const sportOfTitle = (title: string) => guessSport(title) ?? title;

/** Titel eines geplanten Trainings: bekannte Sportart → „Laufen“, eigene → wie eingegeben */
const sportTitle = (sport: string) => sportById(sport).label;

/** Anderer Termin, der sich mit dem Training überschneidet (ohne Luft; Termine ohne Ende = 60 Min) */
export function clashWith(entries: CalendarEntry[], date: string, today: string, start: string, minutes: number, ignoreId?: string): DayItem | null {
  const from = toMin(start);
  const to = from + minutes;
  return (
    itemsForDay(entries, date, today).find((i) => {
      if (!i.time || i.entry.id === ignoreId || i.entry.typ !== "termin") return false;
      const s = toMin(i.time);
      const e = i.end && toMin(i.end) > s ? toMin(i.end) : s + 60;
      return from < e && to > s;
    }) ?? null
  );
}

/** Satz unter „Wann?“: frei oder Überschneidung */
export const clashText = (clash: DayItem | null) => (clash ? `Überschneidet sich mit ${clash.title} ${clockLabel(clash.time!)}` : "Frei – nichts im Kalender");

/** Zuletzt genutzte Uhrzeit für diese Sportart (aus geplanten Sport-Terminen) */
export function lastTimeFor(entries: CalendarEntry[], sport: string): string | null {
  const hits = entries.filter((e): e is Termin => e.typ === "termin" && (e.data.label ?? "").toLowerCase() === "sport" && Boolean(e.data.start) && sportOfTitle(e.data.title) === sport);
  hits.sort((a, b) => b.data.date.localeCompare(a.data.date) || b.geaendert.localeCompare(a.geaendert));
  return hits[0]?.data.start ?? null;
}

/** Dauer eines geplanten Trainings in Minuten (ohne Ende: null) */
export const plannedMinutes = (item: Pick<DayItem, "time" | "end">) => (item.time && item.end && toMin(item.end) > toMin(item.time) ? toMin(item.end) - toMin(item.time) : null);

/** Kachel-Zeile „Als Nächstes“: „Sa 18:00 · Laufen · 45 Min“ (heute: „Heute“, morgen: „Morgen · Do“) */
export function nextLine(item: Pick<DayItem, "date" | "time" | "end" | "title">, today: string): string {
  const minutes = plannedMinutes(item);
  return [whenLabel(item, today), item.title, minutes ? `${minutes} Min` : null].filter(Boolean).join(" · ");
}

/** „Sa 18:00“ / „Heute 18:00“ / „Morgen · Do 18:30“ */
function whenLabel(item: Pick<DayItem, "date" | "time">, today: string): string {
  const day = item.date === today ? "Heute" : item.date === addDays(today, 1) ? tomorrowLabel(item.date) : weekdayShort(item.date);
  return `${day}${item.time ? ` ${clockLabel(item.time)}` : ""}`;
}

export type SportPlan = { sport: string; date: string; start: string; minutes: number; weekly: boolean };

/** Neues geplantes Training (Termin mit Etikett Sport, Erinnerung 30 Min vorher); `raum` = Familie (Standard) oder „Ich“ (Sport-Fenster der Startseite, A-050) */
export function plannedEntry(plan: SportPlan, me: string | null, raum: Room = "familie"): CalendarEntry | null {
  const data = {
    title: sportTitle(plan.sport),
    date: plan.date,
    start: plan.start,
    end: endOf(plan.start, plan.minutes),
    reminder: "30",
    repeat: plan.weekly ? { kind: "woechentlich" } : null,
    label: "Sport",
    ...(me ? { who: [me] } : {}),
  };
  return sanitizeEntry(createEntry("termin", data, { raum }));
}

/**
 * Geplantes Training ändern. Bei einer Serie „nur diesmal“: dieser Tag fällt in
 * der Serie aus, dafür ein einzelner Termin mit den neuen Werten. „Jede
 * Woche“ (oder ohne Serie): der Termin selbst ändert sich.
 */
export function changePlanned(entries: CalendarEntry[], item: Pick<DayItem, "entry" | "date">, plan: SportPlan, scope: "diesmal" | "serie", stamp: string, me: string | null): CalendarEntry[] {
  const e = item.entry;
  if (e.typ !== "termin") return entries;
  if (e.data.repeat && scope === "diesmal") {
    const single = plannedEntry({ ...plan, weekly: false }, me);
    const without = removeItem(entries, e.id, stamp, item.date);
    return single ? upsertEntry(without, single) : without;
  }
  // Serie: ab dem ursprünglichen Startdatum, nur Wochentag/Uhrzeit/Sportart ändern sich
  const date = e.data.repeat && plan.weekly ? addDays(e.data.date, dayShift(item.date, plan.date)) : plan.date;
  const data = { ...e.data, title: sportTitle(plan.sport), date, start: plan.start, end: endOf(plan.start, plan.minutes), repeat: plan.weekly ? (e.data.repeat ?? { kind: "woechentlich" }) : null };
  const next = sanitizeEntry({ ...e, geaendert: stamp, data });
  return next ? upsertEntry(entries, next) : entries;
}

const dayShift = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
