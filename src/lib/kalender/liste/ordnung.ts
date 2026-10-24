// Ordnung, damit es nicht voll wird: Importiert wird alles, angezeigt wird,
// was jetzt dran ist. Gibt es Listen (aus eingefügten To-do-Listen), zeigt die
// Aufgaben-Seite oben „Jetzt dran“ (heute, von gestern, diese Woche) und
// darunter jede Liste eingeklappt mit Anzahl („Haus · 14“). Ohne Listen
// bleibt alles wie gehabt. Rein.

import { sortBy, TASK_LISTS } from "@/lib/core/sort";
import type { DayItem, taskOverview } from "@/lib/kalender/model";

type Groups = ReturnType<typeof taskOverview>;

export type ListenAnsicht = {
  /** Heute dran + diese Woche (alle Listen) */
  jetzt: DayItem[];
  /** Später / Irgendwann ohne Liste – wie bisher */
  spaeter: DayItem[];
  irgendwann: DayItem[];
  /** Je Liste alles, was nicht jetzt dran ist */
  listen: { name: string; items: DayItem[] }[];
};

const listeOf = (i: DayItem) => (i.entry.typ === "aufgabe" ? i.entry.data.liste : undefined);

/** null = keine Listen (Seite bleibt wie bisher) */
export function listenAnsicht(groups: Groups): ListenAnsicht | null {
  const later = [...groups.spaeter, ...groups.irgendwann];
  if (![...groups.heute, ...groups.woche, ...later].some(listeOf)) return null;
  const byList = new Map<string, DayItem[]>();
  for (const item of later) {
    const name = listeOf(item);
    if (name) byList.set(name, [...(byList.get(name) ?? []), item]);
  }
  return {
    jetzt: [...groups.heute, ...groups.woche],
    spaeter: groups.spaeter.filter((i) => !listeOf(i)),
    irgendwann: groups.irgendwann.filter((i) => !listeOf(i)),
    listen: sortBy(
      [...byList].map(([name, items]) => ({ name, items })),
      ...TASK_LISTS,
    ),
  };
}
