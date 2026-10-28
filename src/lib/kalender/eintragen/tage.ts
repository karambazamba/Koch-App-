// Tage und Uhrzeiten für die Fenster „Neue Aufgabe“ und „Neuer Termin“
// (Tafel 114): kurze Wörter für Chips und Zeilen. Rein.

import { WEEKDAYS_MO } from "@/lib/core/days";
import { addDays } from "@/lib/core/now";
import { headerDate } from "@/lib/heute/kopfDatum";
import { weekdayIndex } from "@/lib/kalender/model";

/** „Fr 30. Okt“ */
export const tagKurz = (iso: string) => headerDate(new Date(`${iso}T12:00:00Z`)).replace(",", "");

/** „Heute“, „Morgen“, „Freitag“ (nächste 6 Tage), sonst „Fr 6. Nov“ */
export function tagWort(iso: string, today: string): string {
  if (iso === today) return "Heute";
  if (iso === addDays(today, 1)) return "Morgen";
  if (iso > today && iso <= addDays(today, 6)) return WEEKDAYS_MO[weekdayIndex(iso)];
  return tagKurz(iso);
}

/** Tage zum Antippen: heute und die nächsten 13 */
export const tagWahl = (today: string, count = 14) => Array.from({ length: count }, (_, i) => ({ iso: addDays(today, i), label: tagWort(addDays(today, i), today) }));

/** „16:00“ → „16:00“, „08:00“ → „8:00“ */
export const uhr = (hhmm: string) => hhmm.replace(/^0(\d)/, "$1");

export const minutenVon = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
export const uhrVon = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
