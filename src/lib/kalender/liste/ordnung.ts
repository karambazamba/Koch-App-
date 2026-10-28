// Ordnung, damit es nicht voll wird: Importiert wird alles, angezeigt wird,
// was jetzt dran ist. Gibt es Listen (aus eingefügten To-do-Listen), steht
// oben die eine Liste (alles von heute, dazu aus den Listen nur, was einen Tag
// oder eine Frist hat oder dringend ist) und darunter jede Liste eingeklappt mit Anzahl
// („Haus · 14“). Ohne Listen bleibt die eine Liste, wie sie ist. Rein.

import { sortBy, TASK_LISTS } from "@/lib/core/sort";
import { isUrgent, type DayItem } from "@/lib/kalender/model";

export type ListenAnsicht = {
  /** Die eine Liste von heute (ohne Geparktes aus den Listen) */
  jetzt: DayItem[];
  /** Je Liste, was dort geparkt ist (ohne Tag und Frist, nicht dringend) */
  listen: { name: string; items: DayItem[] }[];
};

const geparkt = (i: DayItem): string | undefined => {
  if (i.entry.typ !== "aufgabe" || isUrgent(i)) return undefined;
  const a = i.entry.data;
  return a.liste && !a.date && !a.due && !a.repeat ? a.liste : undefined;
};

/** Geparkt in einer Liste (ohne Tag und Frist, nicht dringend)? Dann steht es nicht in der einen Liste */
export const inListe = (i: DayItem) => Boolean(geparkt(i));

export function listenAnsicht(heute: DayItem[]): ListenAnsicht {
  const byList = new Map<string, DayItem[]>();
  for (const item of heute) {
    const name = geparkt(item);
    if (name) byList.set(name, [...(byList.get(name) ?? []), item]);
  }
  return {
    jetzt: heute.filter((i) => !geparkt(i)),
    listen: sortBy(
      [...byList].map(([name, items]) => ({ name, items })),
      ...TASK_LISTS,
    ),
  };
}
