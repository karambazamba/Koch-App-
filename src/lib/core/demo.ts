// Beispiel-Tag beim ersten Start: neutrale Beispiele auf der Startseite
// (Termine, Aufgaben, Pinnwand, Einkauf, Essen mit Beispielgericht), damit nichts leer aussieht. Die
// Beispiele liegen NICHT in den echten Speichern – nur die Startseite zeigt
// sie, nie Sicherung, Kalender, Push oder KI. Uhrzeiten werden beim Öffnen
// aus einem festen Tagesplan passend zum Wochentag (`demoDay`: Werktag,
// Samstag, Sonntag/Feiertag; nur was noch kommt; kommen heute weniger als 2,
// Beispiele für morgen). Eine
// Kachel verliert ihre Beispiele beim ersten eigenen Eintrag, alle nach 3
// Tagen oder mit "Jetzt leeren".

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays, todayIso } from "@/lib/core/now";
import { weekdayIndex, type CalendarEntry } from "@/lib/kalender/model";
import { istFeiertag } from "@/lib/core/feiertage";
import type { Haushalt } from "@/lib/core/haushalt";

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

/** Art des Beispiel-Tags: Werktag, Samstag oder Sonntag (Feiertage wie Sonntag) */
export type DemoArt = "werktag" | "samstag" | "sonntag";

export function demoArt(date: string): DemoArt {
  const w = weekdayIndex(date);
  if (w === 6 || istFeiertag(date)) return "sonntag";
  return w === 5 ? "samstag" : "werktag";
}

type DemoTermin = { id: string; title: string; at: number };
const h = (std: number, min = 0) => std * 60 + min;

/** Feste Beispiel-Tagespläne einer Familie (Minuten ab Mitternacht) – echte
 *  Termine, keine Mahlzeiten (v0.64, Tafel 51); passend zum Wochentag (v0.100) */
const DEMO_DAYS: Record<DemoArt, DemoTermin[]> = {
  werktag: [
    { id: "t2", title: "Kita bringen", at: h(8) },
    { id: "t3", title: "Telefonat Versicherung", at: h(10, 30) },
    { id: "t5", title: "Mathis Fußball", at: h(15) },
    { id: "t6", title: "Zahnarzt Jonne", at: h(16) },
    { id: "t8", title: "Elternabend", at: h(19, 30) },
    { id: "t9", title: "Lieblingsserie", at: h(20, 15) },
  ],
  samstag: [
    { id: "s1", title: "Brötchen holen", at: h(9) },
    { id: "s2", title: "Wochenmarkt", at: h(10) },
    { id: "s3", title: "Fußballspiel Mathis", at: h(11, 30) },
    { id: "s4", title: "Kindergeburtstag Ben", at: h(15) },
    { id: "s5", title: "Grillen mit Nachbarn", at: h(18, 30) },
  ],
  sonntag: [
    { id: "o1", title: "Familienfrühstück", at: h(9, 30) },
    { id: "o2", title: "Spaziergang am See", at: h(11) },
    { id: "o3", title: "Kaffee bei Oma", at: h(15) },
    { id: "o4", title: "Pizza backen", at: h(18) },
    { id: "o5", title: "Tatort", at: h(20, 15) },
  ],
};

/** Mia für alle: Beispiel-Tage für allein und zu zweit (Familie = DEMO_DAYS) */
const DEMO_DAYS_FOR: Record<Exclude<Haushalt, "familie">, Record<DemoArt, DemoTermin[]>> = {
  allein: {
    werktag: [
      { id: "t2", title: "Laufen", at: h(7, 30) },
      { id: "t3", title: "Meeting", at: h(10) },
      { id: "t5", title: "Mittag mit Jana", at: h(12, 30) },
      { id: "t6", title: "Yoga", at: h(18) },
      { id: "t9", title: "Serie", at: h(20, 15) },
    ],
    samstag: [
      { id: "s1", title: "Brunch", at: h(10, 30) },
      { id: "s2", title: "Freunde treffen", at: h(15) },
      { id: "s3", title: "Kino", at: h(20) },
    ],
    sonntag: [
      { id: "o1", title: "Ausschlafen", at: h(9, 30) },
      { id: "o2", title: "Brunch mit Freunden", at: h(11) },
      { id: "o3", title: "Kino", at: h(19, 30) },
    ],
  },
  paar: {
    werktag: [
      { id: "t2", title: "Arbeit", at: h(8, 30) },
      { id: "t3", title: "Telefonat Vermieter", at: h(12) },
      { id: "t5", title: "Wocheneinkauf", at: h(17, 30) },
      { id: "t6", title: "Zusammen kochen", at: h(19) },
      { id: "t9", title: "Kino", at: h(20, 30) },
    ],
    samstag: [
      { id: "s1", title: "Frühstück", at: h(9, 30) },
      { id: "s2", title: "Ausflug an die Ostsee", at: h(11) },
      { id: "s3", title: "Essen gehen", at: h(19) },
    ],
    sonntag: [
      { id: "o1", title: "Langes Frühstück", at: h(10) },
      { id: "o2", title: "Spaziergang am See", at: h(14) },
      { id: "o3", title: "Tatort", at: h(20, 15) },
    ],
  },
};

/** Beispiel-Termine eines Tages je Haushaltsart (Elternabend nur Di bis Do) */
export function demoDay(date: string, haushalt: Haushalt = "familie"): DemoTermin[] {
  const art = demoArt(date);
  const w = weekdayIndex(date);
  if (haushalt !== "familie") return DEMO_DAYS_FOR[haushalt][art];
  return DEMO_DAYS[art].filter((t) => t.id !== "t8" || (w >= 1 && w <= 3));
}

/**
 * Beispiel-Termine und -Aufgaben: aus dem Tagesplan nur, was heute noch kommt
 * (sortiert; die Kachel zeigt davon so viele, wie ihre Größe erlaubt). Kommen
 * heute weniger als 2, gilt der Beispiel-Tag für morgen ab dem Morgen
 * ("Morgen · Do") – mit dem Plan dieses Tages, die Aufgaben wechseln mit.
 * Am Wochenende und an Feiertagen kein „heute dran“: alle Aufgaben für die
 * Woche, keine dringend.
 */
export function demoEntries(today: string, minutes: number, helper: string, haushalt: Haushalt = "familie"): { date: string; tomorrow: boolean; entries: CalendarEntry[] } {
  const tomorrow = demoDay(today, haushalt).filter((t) => t.at > minutes).length < 2;
  const date = tomorrow ? addDays(today, 1) : today;
  const termine = demoDay(date, haushalt)
    .filter((t) => tomorrow || t.at > minutes)
    .map((t) => entry(t.id, "termin", { title: t.title, date, start: clock(t.at) }));
  const monday = addDays(date, -weekdayIndex(date));
  const frei = demoArt(date) !== "werktag";
  const wann = frei ? { week: monday } : { date };
  const aufgaben = [
    entry("a1", "aufgabe", { title: "App kennenlernen", ...wann }),
    entry("a2", "aufgabe", { title: `${helper} etwas fragen`, ...wann, ...(frei ? {} : { dringend: true }) }),
    entry("a3", "aufgabe", { title: "Ersten Termin eintragen", ...wann }),
    entry("a4", "aufgabe", { title: "Kachel verschieben", week: monday }),
    ...(haushalt === "allein" ? [] : [entry("a5", "aufgabe", { title: "Pinnwand ausprobieren", week: monday })]),
  ];
  return { date, tomorrow, entries: [...termine, ...aufgaben] };
}

/** Beispiel-Einkauf nach Läden (Reihenfolge = Zeilen der Einkauf-Kachel) */
export const DEMO_SHOPS: { shop: string; names: string[] }[] = [
  { shop: "Edeka", names: ["Äpfel", "Eier", "Käse"] },
  { shop: "Rewe", names: ["Milch", "Brot", "Butter"] },
  { shop: "Lidl", names: ["Bananen", "Nudeln"] },
  { shop: "Rossmann", names: ["Zahnpasta", "Küchenrolle"] },
];
