// „Passt gerade“ (A-051, Tafel 138): eine Übung nach Tageszeit – morgens
// Fokus, nachmittags Augen, abends (und nachts) Atmen. Lieblinge kommen öfter
// dran, jede Übung bleibt frei wählbar. Rein und fest je Tag und Tagesabschnitt
// (gleicher Vorschlag im Kreis, im Fenster und in der Jetzt-Karte).

import { berlinTime } from "@/lib/core/now";
import { UEBUNGEN, dauerText, type Sorte, type Uebung } from "@/lib/durchatmen/uebungen";

/** Welche Sorte passt zur Uhrzeit (Minuten seit Mitternacht)? */
export function tageszeitSorte(minuten: number): Sorte {
  if (minuten >= 5 * 60 && minuten < 11 * 60) return "fokus";
  if (minuten >= 11 * 60 && minuten < 17 * 60) return "augen";
  return "atmen";
}

/** Gewicht: die erste Übung der Sorte 2, die anderen 1; Lieblinge +3 (auch aus anderen Sorten) */
function gewichte(sorte: Sorte, lieblinge: readonly string[]): { u: Uebung; w: number }[] {
  const erste = UEBUNGEN.find((u) => u.sorte === sorte)?.id;
  return UEBUNGEN.map((u) => ({ u, w: (u.sorte === sorte ? (u.id === erste ? 2 : 1) : 0) + (lieblinge.includes(u.id) ? 3 : 0) })).filter((x) => x.w > 0);
}

/** Kleiner fester Zufall aus Text (FNV-1a) */
function streuwert(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967296;
}

/** Der Vorschlag für jetzt – fest je Tag und Abschnitt (90 Minuten) */
export function vorschlag(jetzt: Date, lieblinge: readonly string[] = []): Uebung {
  const { iso, minutes } = berlinTime(jetzt);
  const liste = gewichte(tageszeitSorte(minutes), lieblinge);
  const summe = liste.reduce((s, x) => s + x.w, 0);
  let ziel = streuwert(`${iso}:${Math.floor(minutes / 90)}`) * summe;
  for (const x of liste) {
    ziel -= x.w;
    if (ziel < 0) return x.u;
  }
  return liste[liste.length - 1].u;
}

/** Zwei Zeilen unter dem Kreis (Paket A): „1 Min“ / „Handy-Pause“ */
export const kreisText = (u: Uebung): [string, string] => [dauerText(u.dauer), u.titel];
