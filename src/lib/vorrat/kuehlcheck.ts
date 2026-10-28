// Kurz-Check „Im Haus“ (Tafel 102, Punkt 3): einmal pro Woche, Sonntag ab
// 17 Uhr, fragt die Jetzt-Karte „Kurzer Kühlschrank-Check?“ · „20 Sekunden.“
// Das Angebot läuft als Karte von „Mia denkt mit“ (`mia/denktmit/auswahl.ts`,
// Art „kuehlcheck“) und zählt damit als der EINE ungefragte Hinweis des Tages;
// es gelten dieselben Regeln (nie 22–7 Uhr, nicht in Pause/Ruhe, nicht im
// Beispiel-Tag, „Ruhig“ = kein Check). Nur mit Baustein „Im Haus“ und wenn
// dort etwas steht. Die Seite /vorrat/check zeigt alle Sachen als Kacheln,
// Antippen = weg (durchgestrichen), „Fertig · 3 weg“ = aufgebraucht (wie
// Antippen auf „Im Haus“, mit Rückgängig), „Heute nicht“ = nichts ändern.
// Beides legt die Woche weg (`wasgibts.kuehlcheck`, nur auf diesem Gerät).

import { createLocalStore } from "@/lib/core/localStore";
import { addDays } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { weekdayIndex } from "@/lib/kalender/model";
import { houseGroups } from "@/lib/vorrat/imHaus";
import { loadPantryAll, replacePantry, type PantryItem } from "@/lib/vorrat/pantry";
import type { JetztTopic } from "@/lib/heute/jetztTopics";

export const KUEHLCHECK_TITEL = "Kurzer Kühlschrank-Check?";
export const KUEHLCHECK_DETAIL = "20 Sekunden.";
const KUEHLCHECK_HREF = "/vorrat/check";
/** Ab dieser Uhrzeit am Sonntag (Minuten) */
const KUEHLCHECK_AB = 17 * 60;

/** Sonntag ab 17 Uhr: die Woche (ISO-Datum dieses Sonntags) – sonst null */
export function kuehlCheckWoche(today: string, minutes: number): string | null {
  return weekdayIndex(today) === 6 && minutes >= KUEHLCHECK_AB ? today : null;
}

/** Woche, die die Seite erledigt: der Sonntag heute bzw. der letzte davor */
export const sonntagVon = (today: string) => addDays(today, -((weekdayIndex(today) + 1) % 7));

/** Als Thema der Jetzt-Karte (tagsüber unter den Themen, abends vor „Morgen ist ruhig.“) */
export const kuehlThema = (woche: string): JetztTopic => ({ id: `kuehlcheck:${woche}`, kind: "kuehlcheck", title: KUEHLCHECK_TITEL, detail: KUEHLCHECK_DETAIL, score: 48, target: { href: KUEHLCHECK_HREF }, button: "Öffnen" });

/**
 * Steht der Check zur Wahl? Liefert die Woche oder null. Die Ruhe-Regeln
 * (Nacht, Pause, Ruhe, Regler, Beispiel-Tag, ein Hinweis am Tag) prüft
 * `heutigeKarte` – hier nur: Sonntagabend, Baustein an, etwas im Haus, diese
 * Woche noch nicht erledigt.
 */
export function kuehlCheckFaellig(o: { today: string; minutes: number; vorratOn: boolean; sachen: number; erledigt: string | null }): string | null {
  const woche = kuehlCheckWoche(o.today, o.minutes);
  if (!woche || !o.vorratOn || o.sachen <= 0 || o.erledigt === woche) return null;
  return woche;
}

// --- Speicher: welche Woche schon erledigt ist ---------------------------------

export type KuehlCheckState = { version: 1; woche: string | null };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Gespeichertes lesen (v1); Unlesbares = noch nichts erledigt */
export function migrateKuehlCheck(raw: unknown): KuehlCheckState | null {
  if (!raw || typeof raw !== "object" || (raw as KuehlCheckState).version !== 1) return null;
  const woche = (raw as KuehlCheckState).woche;
  return { version: 1, woche: typeof woche === "string" && ISO.test(woche) ? woche : null };
}

const store = createLocalStore("wasgibts.kuehlcheck", migrateKuehlCheck);

/** Zuletzt erledigte Woche (Sonntag) oder null */
export const loadKuehlCheck = (): string | null => store.load()?.woche ?? null;

export function useKuehlCheck(): string | null | undefined {
  return useExternalStore(store.subscribe, loadKuehlCheck, () => undefined);
}

/** „Fertig“ oder „Heute nicht“: diese Woche nicht mehr anbieten */
export const kuehlCheckErledigt = (woche: string) => store.save({ version: 1, woche });

// --- Seite ------------------------------------------------------------------------

/** Alle Sachen, die gerade da sind – „Bald aufbrauchen“ zuerst, dann die Gruppen (Kühlschrank → Vorrat → Obst & Gemüse → Brot → Tiefkühl) */
export function checkSachen(items: PantryItem[], today: string): PantryItem[] {
  const all = houseGroups(items, today).groups.flatMap((g) => g.items);
  return [...all.filter((x) => x.soon), ...all.filter((x) => !x.soon)].map((x) => x.item);
}

/** Antippen: weg ↔ wieder da */
export const wegUmschalten = (weg: readonly string[], id: string): string[] => (weg.includes(id) ? weg.filter((x) => x !== id) : [...weg, id]);

/** Hauptknopf: „Fertig“ bzw. „Fertig · 3 weg“ */
export const fertigText = (n: number) => (n > 0 ? `Fertig · ${n} weg` : "Fertig");

/**
 * „Fertig“: die markierten Sachen sind aufgebraucht (wie Antippen auf „Im
 * Haus“: 3 Tage blass, nochmal antippen = wieder auf die Liste). Liefert die
 * Namen und das Zurücknehmen.
 */
export function wegRaeumen(ids: readonly string[], today: string): { names: string[]; undo: () => void } {
  const before = loadPantryAll();
  const names: string[] = [];
  const next = before.map((p) => {
    if (p.usedAt || !ids.includes(p.id)) return p;
    names.push(p.name);
    return { ...p, usedAt: today };
  });
  if (names.length) replacePantry(next);
  return { names, undo: () => replacePantry(before) };
}
