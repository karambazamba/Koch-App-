"use client";

// Beispiel-Tag auf "Heute": welche Kacheln Beispiele zeigen und die
// Beispiel-Termine/-Aufgaben selbst. Hat eine Kachel Eigenes, verschwinden
// ihre Beispiele für immer (auch wenn man das Eigene später löscht).

import { useEffect } from "react";
import { itemsForDay, taskOverview, tomorrowLabel, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import type { Haushalt } from "@/lib/core/haushalt";
import { askRemoveAll, clearDemoTile, demoEntries, demoTiles, useDemo, type DemoTile } from "@/lib/core/demo";

export type DemoDay = {
  tiles: DemoTile[];
  /** Beispiel-Termine (null = echte zeigen) */
  termine: DayItem[] | null;
  tasks: DayItem[] | null;
  /** Abgehakte Beispiel-Aufgaben */
  done: string[];
  /** Weniger als 2 Beispiel-Termine heute: Beispiele für morgen ("Morgen · Mi") */
  label: string | null;
  /** Dezent fragen: "Alle Beispiele entfernen?" */
  ask: boolean;
};

export function useDemoDay(entries: CalendarEntry[], today: string, minutes: number, helper: string, ownDish = false, haushalt: Haushalt = "familie"): DemoDay {
  const demo = useDemo();
  const tiles = demoTiles(demo, today);
  const ownTermine = entries.some((e) => e.typ === "termin");
  const ownTasks = entries.some((e) => e.typ === "aufgabe");
  useEffect(() => {
    if (!tiles.length) return;
    if (ownTermine && tiles.includes("termine")) clearDemoTile("termine");
    if (ownTasks && tiles.includes("aufgaben")) clearDemoTile("aufgaben");
    if (ownDish && tiles.includes("essen")) clearDemoTile("essen");
  }, [tiles, ownTermine, ownTasks, ownDish]);
  const showTermine = tiles.includes("termine") && !ownTermine;
  const showTasks = tiles.includes("aufgaben") && !ownTasks;
  const demoData = showTermine || showTasks ? demoEntries(today, minutes, helper, haushalt) : null;
  const gone = new Set(demo?.gone ?? []);
  return {
    tiles: tiles.filter((t) => (t === "termine" ? showTermine : t === "aufgaben" ? showTasks : t === "essen" ? !ownDish : true)),
    termine: showTermine && demoData ? itemsForDay(demoData.entries, demoData.date, today).filter((i) => i.entry.typ === "termin" && !gone.has(i.entry.id)) : null,
    tasks: showTasks && demoData ? taskOverview(demoData.entries, demoData.date).heute.filter((i) => !gone.has(i.entry.id)) : null,
    done: demo?.done ?? [],
    label: demoData?.tomorrow ? tomorrowLabel(demoData.date) : null,
    ask: askRemoveAll(demo, tiles),
  };
}
