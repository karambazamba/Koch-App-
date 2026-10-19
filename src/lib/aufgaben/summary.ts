// Lottes EIN Satz oben auf "Heute": kurz, ruhig, als Überblick – nie als
// Aufgaben-Stapel ("Ruhiger Tag: 2 Termine, eine Aufgabe, abends
// Gemüsepfanne."). Rein, damit es testbar ist.

import type { DayItem } from "./model";

/** "Guten Morgen" (bis 11 Uhr), "Hallo" (bis 18 Uhr), sonst "Guten Abend" */
export function greeting(minutesNow: number): string {
  if (minutesNow < 11 * 60) return "Guten Morgen";
  if (minutesNow < 18 * 60) return "Hallo";
  return "Guten Abend";
}

const count = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);

/** "abends Gemüsepfanne" / "mittags Gulasch" */
function dishPart(dish: string, clock: string | null): string {
  const hour = clock ? Number(clock.slice(0, 2)) : 18;
  return `${hour < 15 ? "mittags" : "abends"} ${dish}`;
}

export function todaySentence({ items, dish, dishClock }: { items: DayItem[]; dish: string | null; dishClock: string | null }): string {
  const open = items.filter((i) => !i.done);
  const termine = open.filter((i) => i.entry.typ === "termin").length;
  const aufgaben = open.length - termine;
  const parts = [termine ? count(termine, "ein Termin", "Termine") : "", aufgaben ? count(aufgaben, "eine Aufgabe", "Aufgaben") : "", dish ? dishPart(dish, dishClock) : ""].filter(Boolean);
  if (!open.length) {
    if (items.length) return dish ? `Alles erledigt – ${dishPart(dish, dishClock)}.` : "Alles erledigt – jetzt ist Zeit für euch.";
    return dish ? `Ein freier Tag – ${dishPart(dish, dishClock)}.` : "Ein freier Tag – nichts eingetragen.";
  }
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}` : parts[0];
  return `${open.length <= 3 ? "Ruhiger Tag" : "Einiges los heute"}: ${list}.`;
}
