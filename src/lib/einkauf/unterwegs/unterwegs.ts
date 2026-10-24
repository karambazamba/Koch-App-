// Einkauf Teil 6 – „Familie Bescheid sagen“: Wer einen Einkaufsmodus öffnet,
// wird (nur mit Konto) einmal gefragt, ob der Haushalt Bescheid bekommt.
// Bei „Ja, immer“ wird der Einkauf als „unterwegs“ geteilt
// (`wasgibts.einkaufswege`, Abgleich-Typ „unterwegs“); der Server schickt den
// anderen „Felix ist gleich bei REWE. Braucht ihr noch was?“ mit
// Schnellknöpfen und am Ende „Eingekauft ✓ – 9 Sachen bei REWE“.
// Pro Gerät (`wasgibts.einkaufbescheid`): die Antwort und der laufende
// Einkauf (was schon auf der Liste bzw. im Korb war) – daraus wird gelb, was
// andere während des Einkaufs dazusetzen. Logik rein, Speicher klein.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { stapleInterval } from "@/lib/einkauf/staples";
import type { ListItem, Staple } from "@/lib/einkauf/listModel";

/** Ein geteilter Einkauf */
export type Trip = {
  id: string;
  shop: string;
  /** Anzeigename der Person, die einkauft */
  by: string;
  start: string;
  end: string | null;
  /** Wie viele Sachen am Ende im Korb lagen */
  count: number | null;
  /** Schnellknöpfe für die anderen („+ Butter“) – höchstens 2 */
  vorschlaege: string[];
  /** Konto der Person (kommt vom Abgleich, nicht hochgeladen) */
  von?: string;
};

export type TripsState = { version: 1; trips: Trip[] };

/** Ein Einkauf auf diesem Gerät (für das Gelb und das Zählen) */
export type ActiveTrip = { tripId: string | null; shop: string; since: string; known: string[]; doneBefore: string[] };

export type BescheidState = { version: 1; answer: "ja" | "nein" | null; active: ActiveTrip | null };

/** Geteilte Einkäufe bleiben 2 Tage, dann räumt der nächste Start sie weg */
const KEEP_MS = 2 * 86_400_000;
/** Ein Einkauf gilt 3 Stunden lang als „gerade“ */
const TRIP_MS = 3 * 3_600_000;

const isObj = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown, max = 500) => (Array.isArray(v) ? v.filter((s): s is string => typeof s === "string").slice(-max) : []);

export function migrateTrips(raw: unknown): TripsState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const trips = (Array.isArray(raw.trips) ? raw.trips : []).filter(isObj).flatMap((t): Trip[] =>
    typeof t.id === "string" && typeof t.shop === "string" && typeof t.start === "string"
      ? [
          {
            id: t.id,
            shop: t.shop,
            by: typeof t.by === "string" ? t.by : "",
            start: t.start,
            end: typeof t.end === "string" ? t.end : null,
            count: typeof t.count === "number" ? t.count : null,
            vorschlaege: strings(t.vorschlaege, 2),
            ...(typeof t.von === "string" ? { von: t.von } : {}),
          },
        ]
      : [],
  );
  return { version: 1, trips };
}

export function migrateBescheid(raw: unknown): BescheidState | null {
  if (!isObj(raw) || raw.version !== 1) return null;
  const a = isObj(raw.active) ? raw.active : null;
  const active: ActiveTrip | null =
    a && typeof a.shop === "string" && typeof a.since === "string"
      ? { tripId: typeof a.tripId === "string" ? a.tripId : null, shop: a.shop, since: a.since, known: strings(a.known), doneBefore: strings(a.doneBefore) }
      : null;
  return { version: 1, answer: raw.answer === "ja" || raw.answer === "nein" ? raw.answer : null, active };
}

/** Neuer Einkauf; alte (älter als 2 Tage) fallen raus */
export function addTrip(state: TripsState, trip: Trip, nowMs: number): TripsState {
  return { version: 1, trips: [...state.trips.filter((t) => t.id !== trip.id && nowMs - Date.parse(t.start) < KEEP_MS), trip] };
}

/** Einkauf beenden (nur einmal) */
export function finishTrip(state: TripsState, id: string, end: string, count: number): TripsState {
  return { version: 1, trips: state.trips.map((t) => (t.id === id && !t.end ? { ...t, end, count } : t)) };
}

/** Die 2 häufigsten fälligen Stammartikel (meiste Käufe, dann kürzester Rhythmus) */
export function tripSuggestions(due: Staple[]): string[] {
  return [...due]
    .sort((a, b) => b.purchases.length - a.purchases.length || (stapleInterval(a) ?? 99) - (stapleInterval(b) ?? 99))
    .slice(0, 2)
    .map((s) => s.name.trim())
    .filter(Boolean);
}

/** Läuft auf diesem Gerät gerade ein Einkauf in diesem Laden? */
export const sameTrip = (active: ActiveTrip | null, shop: string, nowMs: number): active is ActiveTrip =>
  Boolean(active) && active!.shop.toLowerCase() === shop.toLowerCase() && nowMs - Date.parse(active!.since) < TRIP_MS;

/** Was andere während des Einkaufs dazugesetzt haben (Schlüssel) */
export function newDuringTrip(items: ListItem[], active: ActiveTrip | null, me: string | null): Set<string> {
  if (!active || !me) return new Set();
  return new Set(items.filter((i) => i.von && i.von !== me && !i.checked && !active.known.includes(i.key)).map((i) => i.key));
}

/** Wie viele Sachen seit dem Start in den Korb kamen */
export const boughtCount = (items: ListItem[], active: ActiveTrip | null) =>
  items.filter((i) => i.checked && !i.hidden && !(active?.doneBefore ?? []).includes(i.key)).length;

/** Text der ersten Mitteilung */
export const startText = (trip: Pick<Trip, "by" | "shop">) => `${trip.by.trim() || "Jemand"} ist gleich bei ${trip.shop}. Braucht ihr noch was?`;

/** Text am Ende */
export const endText = (trip: Pick<Trip, "by" | "shop" | "count">) =>
  trip.count ? `Eingekauft ✓ – ${trip.count} ${trip.count === 1 ? "Sache" : "Sachen"} bei ${trip.shop}` : `${trip.by.trim() || "Jemand"} ist fertig bei ${trip.shop}.`;

/** Schnellknopf aus der Mitteilung (`/einkaufsliste?plus=Butter`): was drauf soll – null, wenn nichts oder schon drauf */
export function plusFromLink(search: string, items: Pick<ListItem, "name" | "checked">[]): { name: string; already: boolean } | null {
  const name = (new URLSearchParams(search).get("plus") ?? "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return null;
  return { name, already: items.some((i) => !i.checked && i.name.trim().toLowerCase() === name.toLowerCase()) };
}

// --- Speicher ---------------------------------------------------------------

const tripsStore = createLocalStore("wasgibts.einkaufswege", migrateTrips);
const bescheidStore = createLocalStore("wasgibts.einkaufbescheid", migrateBescheid);

const EMPTY: BescheidState = { version: 1, answer: null, active: null };
export const loadBescheid = (): BescheidState => bescheidStore.load() ?? EMPTY;
export const changeBescheid = (change: (s: BescheidState) => BescheidState) => bescheidStore.save(change(loadBescheid()));
export const setBescheidAnswer = (answer: "ja" | "nein") => changeBescheid((s) => ({ ...s, answer }));

export function useBescheid(): BescheidState | undefined {
  const s = useExternalStore(bescheidStore.subscribe, bescheidStore.load, () => undefined);
  return s === undefined ? undefined : (s ?? EMPTY);
}

export const changeTrips = (change: (s: TripsState) => TripsState) => tripsStore.save(change(tripsStore.load() ?? { version: 1, trips: [] }));
