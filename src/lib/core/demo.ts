// Beispiel-Tag beim ersten Start: neutrale Beispiele auf der Startseite
// (Termine, Aufgaben, Pinnwand, Einkauf), damit nichts leer aussieht. Die
// Beispiele liegen NICHT in den echten Speichern – nur die Startseite zeigt
// sie, nie Sicherung, Kalender, Push oder KI. Uhrzeiten werden beim Öffnen
// berechnet (alle in der Zukunft; ab 21 Uhr Beispiele für morgen). Eine
// Kachel verliert ihre Beispiele beim ersten eigenen Eintrag, alle nach 3
// Tagen oder mit "Jetzt leeren".

import { createLocalStore } from "./localStore";
import { useExternalStore } from "./useExternalStore";
import { addDays, todayIso } from "./now";
import { weekdayIndex, type CalendarEntry } from "../aufgaben/model";

export type DemoTile = "termine" | "aufgaben" | "pinnwand" | "einkauf";
const TILES: DemoTile[] = ["termine", "aufgaben", "pinnwand", "einkauf"];
const DAYS = 3;

export type DemoState = { version: 1; since: string; cleared: DemoTile[]; done: string[] };

const store = createLocalStore("wasgibts.beispiel", (raw: unknown): DemoState | null => {
  if (!raw || typeof raw !== "object" || (raw as DemoState).version !== 1) return null;
  const d = raw as DemoState;
  if (typeof d.since !== "string") return null;
  return {
    version: 1,
    since: d.since,
    cleared: Array.isArray(d.cleared) ? d.cleared.filter((t): t is DemoTile => TILES.includes(t)) : [],
    done: Array.isArray(d.done) ? d.done.filter((x) => typeof x === "string") : [],
  };
});

/** Beim allerersten Start (nach "Los geht's") */
export function startDemo() {
  store.save({ version: 1, since: todayIso(), cleared: [], done: ["beispiel:a1"] });
}

/** Welche Kacheln gerade Beispiele zeigen (leer = keine) */
export function demoTiles(state: DemoState | null, today: string): DemoTile[] {
  if (!state || today >= addDays(state.since, DAYS)) return [];
  return TILES.filter((t) => !state.cleared.includes(t));
}

/** Eine Kachel hat jetzt Eigenes → ihre Beispiele verschwinden für immer */
export function clearDemoTile(tile: DemoTile) {
  const s = store.load();
  if (s && !s.cleared.includes(tile)) store.save({ ...s, cleared: [...s.cleared, tile] });
}

/** "Jetzt leeren": alle Beispiele weg */
export function clearDemo() {
  const s = store.load();
  if (s) store.save({ ...s, cleared: [...TILES] });
}

/** Beispiel-Aufgabe abhaken / doch nicht (nur auf der Startseite) */
export function toggleDemoDone(key: string) {
  const s = store.load();
  if (!s) return;
  store.save({ ...s, done: s.done.includes(key) ? s.done.filter((k) => k !== key) : [...s.done, key] });
}

export const clearDemoStore = () => store.clear();

export function useDemo(): DemoState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}

export const isDemoId = (id: string) => id.startsWith("beispiel:");

const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const entry = (id: string, typ: "termin" | "aufgabe", data: Record<string, unknown>): CalendarEntry =>
  ({ id: `beispiel:${id}`, typ, raum: "familie", besitzer: "lokal", erstellt: `2000-01-01T00:0${id.slice(-1)}:00.000Z`, geaendert: "2000-01-01T00:00:00.000Z", data: { reminder: "aus", repeat: null, ...data } }) as CalendarEntry;

/**
 * Beispiel-Termine und -Aufgaben für heute (ab 21 Uhr für morgen): Kaffeepause
 * in einer Stunde, Kochen 18:30, Lieblingsserie 20:15, Ins Bett 22:30 – nur
 * was noch kommt, sortiert.
 */
export function demoEntries(today: string, minutes: number, helper: string): { date: string; tomorrow: boolean; entries: CalendarEntry[] } {
  const tomorrow = minutes >= 21 * 60;
  const date = tomorrow ? addDays(today, 1) : today;
  const from = tomorrow ? 0 : minutes;
  const coffee = tomorrow ? 10 * 60 : Math.ceil((minutes + 60) / 15) * 15;
  const termine = [
    { id: "t1", title: "Kaffeepause ☕", at: coffee },
    { id: "t2", title: "Kochen 🍳", at: 18 * 60 + 30 },
    { id: "t3", title: "Lieblingsserie 📺", at: 20 * 60 + 15 },
    { id: "t4", title: "Ins Bett 😴", at: 22 * 60 + 30 },
  ]
    .filter((t) => t.at > from && t.at < 24 * 60 && (t.id === "t1" || t.at - coffee >= 30))
    .sort((a, b) => a.at - b.at)
    .map((t) => entry(t.id, "termin", { title: t.title, date, start: clock(t.at) }));
  const monday = addDays(date, -weekdayIndex(date));
  const aufgaben = [
    entry("a1", "aufgabe", { title: "App kennenlernen 👀", date }),
    entry("a2", "aufgabe", { title: `${helper} etwas fragen 🎙`, date, dringend: true }),
    entry("a3", "aufgabe", { title: "Ersten Termin eintragen", date }),
    entry("a4", "aufgabe", { title: "Kachel verschieben", week: monday }),
    entry("a5", "aufgabe", { title: "Pinnwand ausprobieren", week: monday }),
  ];
  return { date, tomorrow, entries: [...termine, ...aufgaben] };
}

export const DEMO_SHOPPING = ["Milch", "Brot", "Äpfel"];
