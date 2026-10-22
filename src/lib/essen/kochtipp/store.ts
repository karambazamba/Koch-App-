// Kochtipp (`wasgibts.kochtipp` v1, je Gerät): die Kochmütze erscheint ab dem
// 3. Nutzungstag (3 verschiedene Kalendertage mit geöffneter App), früher auf
// Nachfrage („Kochtipp“, „Was soll ich kochen?“) oder mit „Alles zeigen“.
// Wer die App schon länger als 2 Tage nutzt (Beispiel-Tag seit …), sieht sie
// sofort. Dazu die letzte Wahl (Vorrat/Reste/Einkauf, Personen, Art) und die
// zuletzt gezeigten Gerichte (keine Wiederholung der letzten 10).

import { createLocalStore, readRaw } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { addDays } from "@/lib/core/now";
import { markHintSeen } from "@/lib/core/hints";
import type { CookSource } from "@/lib/essen/kochtipp/pick";

type Last = { source: CookSource; persons: number | null; category: "fleisch" | "vegetarisch" | "fisch" | null };

export type KochtippState = {
  version: 1;
  /** Bis zu 3 verschiedene Tage, an denen die App offen war */
  days: string[];
  /** Früher freigeschaltet (Nachfrage) bzw. schon lange dabei */
  unlocked: boolean;
  /** Mütze ist schon einmal aufgeploppt */
  popped: boolean;
  last: Last | null;
  /** Zuletzt gezeigte Gerichte (höchstens 10) */
  shown: string[];
};

const SOURCES: CookSource[] = ["vorrat", "reste", "einkauf"];
const CATEGORIES = ["fleisch", "vegetarisch", "fisch"] as const;

function migrate(raw: unknown): KochtippState | null {
  if (!raw || typeof raw !== "object" || (raw as KochtippState).version !== 1) return null;
  const d = raw as Partial<KochtippState>;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const l = d.last as Partial<Last> | null | undefined;
  return {
    version: 1,
    days: strings(d.days).slice(-3),
    unlocked: d.unlocked === true,
    popped: d.popped === true,
    last:
      l && SOURCES.includes(l.source as CookSource)
        ? { source: l.source as CookSource, persons: typeof l.persons === "number" ? l.persons : null, category: CATEGORIES.includes(l.category as never) ? (l.category as Last["category"]) : null }
        : null,
    shown: strings(d.shown).slice(-10),
  };
}

const store = createLocalStore("wasgibts.kochtipp", migrate);
const EMPTY: KochtippState = { version: 1, days: [], unlocked: false, popped: false, last: null, shown: [] };

export const loadKochtipp = (): KochtippState => store.load() ?? EMPTY;

export function useKochtipp(): KochtippState | undefined {
  return useExternalStore(store.subscribe, () => store.load() ?? EMPTY, () => undefined);
}

/** Mütze sichtbar? */
export const hatVisible = (s: KochtippState, showAll: boolean) => showAll || s.unlocked || s.days.length >= 3;

/** Seit wann gibt es die App auf dem Gerät? (Beispiel-Tag „since“) */
function firstDay(): string | null {
  try {
    const since = (JSON.parse(readRaw("wasgibts.beispiel") ?? "null") as { since?: unknown } | null)?.since;
    return typeof since === "string" ? since : null;
  } catch {
    return null;
  }
}

/** App heute offen: Tag zählen (beim allerersten Mal: schon länger dabei → sofort frei) */
export function noteKochtippDay(today: string) {
  const s = store.load();
  if (!s) {
    const since = firstDay();
    store.save({ ...EMPTY, days: [today], unlocked: Boolean(since && since <= addDays(today, -2)) });
    return;
  }
  if (s.days.includes(today)) return;
  store.save({ ...s, days: [...s.days, today].slice(-3) });
}

/** Früher freischalten (Nachfrage an Mia) – der Hinweis entfällt dann */
export function unlockKochtipp() {
  const s = loadKochtipp();
  markHintSeen("kochtipp-muetze");
  if (!s.unlocked) store.save({ ...s, unlocked: true, popped: true });
}

export function markHatPopped() {
  const s = loadKochtipp();
  if (!s.popped) store.save({ ...s, popped: true });
}

/** Letzte Wahl merken („Wie letztes Mal aus dem Vorrat?“) */
export function rememberKochtipp(last: Last) {
  store.save({ ...loadKochtipp(), last });
}

/** Gezeigtes Gericht merken (keine Wiederholung der letzten 10) */
export function noteKochtippShown(title: string) {
  const s = loadKochtipp();
  store.save({ ...s, shown: [...s.shown.filter((t) => t !== title), title].slice(-10) });
}
