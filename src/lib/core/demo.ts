// Beispiel-Tag beim ersten Start: neutrale Beispiele auf der Startseite
// (Termine, Aufgaben, Pinnwand, Einkauf, Essen mit Beispielgericht), damit nichts leer aussieht. Die
// Beispiele liegen NICHT in den echten Speichern – nur die Startseite zeigt
// sie, nie Sicherung, Kalender, Push oder KI. Uhrzeiten werden beim Öffnen
// aus einem festen Tagesplan (`DEMO_DAY`, nur was noch kommt; kommen
// heute weniger als 2, Beispiele für morgen). Eine
// Kachel verliert ihre Beispiele beim ersten eigenen Eintrag, alle nach 3
// Tagen oder mit "Jetzt leeren".

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays, todayIso } from "@/lib/core/now";
import { weekdayIndex, type CalendarEntry } from "@/lib/kalender/model";

export type DemoTile = "termine" | "aufgaben" | "pinnwand" | "einkauf" | "essen";
const TILES: DemoTile[] = ["termine", "aufgaben", "pinnwand", "einkauf", "essen"];
const DAYS = 3;

export type DemoState = {
  version: 1;
  since: string;
  cleared: DemoTile[];
  /** Abgehakt angezeigt (App kennenlernen ✓) */
  done: string[];
  /** Abgehakt und weich verschwunden */
  gone: string[];
  /** Schon gefragt: "Alle Beispiele entfernen?" */
  asked: boolean;
};

const store = createLocalStore("wasgibts.beispiel", (raw: unknown): DemoState | null => {
  if (!raw || typeof raw !== "object" || (raw as DemoState).version !== 1) return null;
  const d = raw as DemoState;
  if (typeof d.since !== "string") return null;
  return {
    version: 1,
    since: d.since,
    cleared: Array.isArray(d.cleared) ? d.cleared.filter((t): t is DemoTile => TILES.includes(t)) : [],
    done: Array.isArray(d.done) ? d.done.filter((x) => typeof x === "string") : [],
    gone: Array.isArray(d.gone) ? d.gone.filter((x) => typeof x === "string") : [],
    asked: d.asked === true,
  };
});

/** Beim allerersten Start (nach "Los geht's") */
export function startDemo() {
  store.save({ version: 1, since: todayIso(), cleared: [], done: ["beispiel:a1"], gone: [], asked: false });
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

/** Beispiel abgehakt: verschwindet (wie echte Einträge); gibt das Zurücknehmen zurück */
export function hideDemoItem(key: string): () => void {
  const s = store.load();
  if (!s) return () => {};
  store.save({ ...s, gone: [...new Set([...s.gone, key])] });
  return () => {
    const now = store.load();
    if (now) store.save({ ...now, gone: now.gone.filter((k) => k !== key) });
  };
}

/** Nach dem ersten eigenen Termin/der ersten eigenen Aufgabe: gefragt (ja oder nein) */
export function markDemoAsked() {
  const s = store.load();
  if (s && !s.asked) store.save({ ...s, asked: true });
}

/** Frage "Alle Beispiele entfernen?" zeigen: Termine oder Aufgaben haben Eigenes, andere Beispiele sind noch da */
export const askRemoveAll = (state: DemoState | null, tiles: DemoTile[]) =>
  Boolean(state && !state.asked && (state.cleared.includes("termine") || state.cleared.includes("aufgaben")) && tiles.length > 0);

export const clearDemoStore = () => store.clear();

export function useDemo(): DemoState | null {
  return useExternalStore(store.subscribe, store.load, () => null);
}

const clock = (m: number) => `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

const entry = (id: string, typ: "termin" | "aufgabe", data: Record<string, unknown>): CalendarEntry =>
  ({ id: `beispiel:${id}`, typ, raum: "familie", besitzer: "lokal", erstellt: `2000-01-01T00:0${id.slice(-1)}:00.000Z`, geaendert: "2000-01-01T00:00:00.000Z", data: { reminder: "aus", repeat: null, ...data } }) as CalendarEntry;

/** Fester Beispiel-Tagesplan einer Familie (Minuten ab Mitternacht) – echte
 *  Termine, keine Mahlzeiten (v0.64, Tafel 51) */
const DEMO_DAY: { id: string; title: string; at: number }[] = [
  { id: "t2", title: "Kita bringen", at: 8 * 60 },
  { id: "t3", title: "Telefonat Versicherung", at: 10 * 60 + 30 },
  { id: "t5", title: "Mathis Fußball", at: 15 * 60 },
  { id: "t6", title: "Zahnarzt Jonne", at: 16 * 60 },
  { id: "t8", title: "Elternabend", at: 19 * 60 + 30 },
  { id: "t9", title: "Lieblingsserie", at: 20 * 60 + 15 },
];

/**
 * Beispiel-Termine und -Aufgaben: aus dem festen Tagesplan nur, was heute noch
 * kommt (sortiert; die Kachel zeigt davon so viele, wie ihre Größe erlaubt).
 * Kommen heute weniger als 2, gilt der Beispiel-Tag für morgen ab dem Morgen
 * ("Morgen · Do") – die Aufgaben wechseln mit.
 */
export function demoEntries(today: string, minutes: number, helper: string): { date: string; tomorrow: boolean; entries: CalendarEntry[] } {
  const tomorrow = DEMO_DAY.filter((t) => t.at > minutes).length < 2;
  const date = tomorrow ? addDays(today, 1) : today;
  const termine = DEMO_DAY.filter((t) => tomorrow || t.at > minutes).map((t) => entry(t.id, "termin", { title: t.title, date, start: clock(t.at) }));
  const monday = addDays(date, -weekdayIndex(date));
  const aufgaben = [
    entry("a1", "aufgabe", { title: "App kennenlernen", date }),
    entry("a2", "aufgabe", { title: `${helper} etwas fragen`, date, dringend: true }),
    entry("a3", "aufgabe", { title: "Ersten Termin eintragen", date }),
    entry("a4", "aufgabe", { title: "Kachel verschieben", week: monday }),
    entry("a5", "aufgabe", { title: "Pinnwand ausprobieren", week: monday }),
  ];
  return { date, tomorrow, entries: [...termine, ...aufgaben] };
}

/** Beispiel-Einkauf nach Läden */
export const DEMO_SHOPS: { shop: string; names: string[] }[] = [
  { shop: "REWE", names: ["Milch", "Brot", "Butter"] },
  { shop: "EDEKA", names: ["Äpfel", "Eier"] },
  { shop: "Lidl", names: ["Zahnpasta", "Küchenrolle"] },
];
