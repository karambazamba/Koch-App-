// „Im Haus“ (früher Vorrat, Tafel 78/79): was zu Hause ist – ohne Mengen,
// nur da oder nicht da. Orte Kühlschrank/Schrank/Tiefkühler automatisch
// (`placeFor`, gemerkte Orte je Sorte), vergisst von selbst (`haltbar.ts`),
// „aufgebraucht“ bleibt 3 Tage blass stehen. Intern heißt alles weiter
// Vorrat (`wasgibts.vorrat`).

import { useMemo } from "react";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { createLocalStore } from "@/lib/core/localStore";
import { todayIso } from "@/lib/core/now";
import { findFood } from "@/lib/essen/leftovers/foods";
import { isFood, migratePantry, withoutAmount, type PantryStore, isGone, isGrundsache, placeFor as placeBySorte, type PantryItem, type PantryPlace } from "@/lib/vorrat/haltbar";

export type { PantryItem, PantryPlace } from "@/lib/vorrat/haltbar";
export { cleanPantryItem, migratePantry, type PantryStore } from "@/lib/vorrat/haltbar";

/** Reihenfolge der Orte auf der Seite: Kühlschrank → Schrank → Tiefkühler */
export const PANTRY_PLACES: { value: PantryPlace; label: string; short: string }[] = [
  { value: "kuehlschrank", label: "Kühlschrank", short: "Kühlschrank" },
  { value: "schrank", label: "Schrank", short: "Schrank" },
  { value: "tiefkuehler", label: "Tiefkühler", short: "TK" },
];

// --- Abgleich mit dem Kochbuch ------------------------------------------------

/** Gleiche Zutat unter anderem Namen */
const SYNONYMS: Record<string, string> = {
  karotte: "möhre", mohrrübe: "möhre", bacon: "speck", hackfleisch: "hack",
  hähnchen: "huhn", hühnchen: "huhn", champignon: "pilz", paradeiser: "tomate",
  erdapfel: "kartoffel", topfen: "quark", eier: "ei",
};

/** Zutat vergleichbar machen: klein, ohne Pluralendung, Synonyme */
export function ingredientStem(name: string): string {
  let n = name.trim().toLowerCase().replace(/[^a-zäöüß ]/g, "");
  n = n.split(" ").filter(Boolean).pop() ?? n; // "rote Zwiebeln" → "zwiebeln"
  n = n.replace(/(en|n|e|s)$/, "");
  for (const [word, base] of Object.entries(SYNONYMS)) {
    if (n.startsWith(word.replace(/(en|n|e|s)$/, ""))) return base;
  }
  return n;
}

/** Dieselbe Zutat? (Einzahl/Mehrzahl, Synonyme, "rote Zwiebeln" = "Zwiebel") */
export function sameIngredient(a: string, b: string): boolean {
  const x = ingredientStem(a);
  const y = ingredientStem(b);
  if (!x || !y) return false;
  // Gewürzpulver ist nicht das Gemüse ("Paprika" ≠ "Paprikapulver")
  if (x.endsWith("pulver") !== y.endsWith("pulver")) return false;
  return x === y || (x.length >= 4 && y.includes(x)) || (y.length >= 4 && x.includes(y));
}

// --- Speicherung ----------------------------------------------------------------


const store = createLocalStore("wasgibts.vorrat", migratePantry);
const EMPTY: PantryItem[] = [];
const load = (): PantryStore => store.load() ?? { version: 3, items: [], places: {} };

/** „Aufgebraucht“ bleibt so viele Tage blass stehen */
const USED_DAYS = 3;
const DAY = 86_400_000;
const usedLongAgo = (i: PantryItem, today: string) => Boolean(i.usedAt) && Date.parse(today) - Date.parse(i.usedAt!) >= USED_DAYS * DAY;

/** Still aufräumen: abgelaufen bzw. lange aufgebraucht → weg @public */
export const tidyPantry = (items: PantryItem[], today: string) => items.filter((i) => !(i.usedAt ? usedLongAgo(i, today) : isGone(i, today)));

function update(change: (items: PantryItem[]) => PantryItem[], places?: (p: Record<string, PantryPlace>) => Record<string, PantryPlace>) {
  const current = load();
  store.save({ version: 3, items: tidyPantry(change(current.items), todayIso()), places: places ? places(current.places) : current.places });
}

function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return Math.random().toString(36).slice(2);
}

/** Vergleichsschlüssel: gleiches Lebensmittel in Einzahl/Mehrzahl ("Karotte" = "Karotten") */
function sameItemKey(name: string): string {
  const food = findFood(name)?.food;
  return food ? food.singular.toLowerCase() : name.trim().toLowerCase();
}

/** Naheliegender Ort – mit gemerkten Orten dieses Haushalts */
export const placeFor = (name: string) => placeBySorte(name, load().places);

/** Reinlegen („Hab Hähnchen gekauft“, Einkauf ✓): Grundsachen und Nicht-Essen bleiben draußen; Vorhandenes wird frisch */
export function addPantryItems(items: { name: string; place?: PantryPlace }[], addedAt: string): string[] {
  const added: string[] = [];
  const { places } = load();
  update((current) => {
    const next = current.map((p) => ({ ...p }));
    for (const raw of items) {
      const name = withoutAmount(raw.name);
      if (!isFood(name) || isGrundsache(name)) continue;
      const same = next.find((p) => sameItemKey(p.name) === sameItemKey(name));
      if (same) {
        same.addedAt = addedAt;
        same.usedAt = null;
        if (raw.place) same.place = raw.place;
      } else next.push({ id: newId(), name, addedAt, place: raw.place ?? placeBySorte(name, places), usedAt: null });
      added.push(name);
    }
    return next;
  });
  return added;
}

/** Ort ändern – gilt ab jetzt für diese Sorte */
export function setPantryPlace(id: string, place: PantryPlace) {
  const item = load().items.find((p) => p.id === id);
  if (!item) return;
  update(
    (items) => items.map((p) => (p.id === id ? { ...p, place } : p)),
    (places) => ({ ...places, [item.name.trim().toLowerCase()]: place }),
  );
}

/** „Aufgebraucht“ (nochmal antippen = wieder auf die Liste, das macht die Seite) */
export function markPantryUsed(id: string, today: string) {
  update((items) => items.map((p) => (p.id === id ? { ...p, usedAt: today } : p)));
}

/** „Die Milch ist alle“ / Gekocht: passende Sachen sind aufgebraucht; gibt die Namen zurück */
export function consumePantry(names: string[], today: string): string[] {
  const hit: string[] = [];
  update((items) =>
    items.map((p) => {
      if (p.usedAt || !names.some((n) => sameIngredient(n, p.name))) return p;
      hit.push(p.name);
      return { ...p, usedAt: today };
    }),
  );
  return hit;
}

export function removePantryItem(id: string) {
  update((items) => items.filter((p) => p.id !== id));
}

/** Was gerade (vermutlich) da ist: nicht aufgebraucht, nicht abgelaufen */
export const activePantry = (items: PantryItem[], today: string) => items.filter((i) => !i.usedAt && !isGone(i, today) && !isGrundsache(i.name));

/** Aufgebraucht (die letzten 3 Tage) */
export const usedPantry = (items: PantryItem[], today: string) => items.filter((i) => i.usedAt && !usedLongAgo(i, today));

/** Alles Gespeicherte (außerhalb von React; für Rückgängig) */
export const loadPantryAll = (): PantryItem[] => store.load()?.items ?? EMPTY;

/** Was gerade da ist (außerhalb von React) */
export const loadPantry = (): PantryItem[] => activePantry(loadPantryAll(), todayIso());

/** Komplett ersetzen (Rückgängig) */
export function replacePantry(items: PantryItem[]) {
  const current = load();
  store.save({ ...current, items });
}

const snapshot = () => store.load();

/** Alles Gespeicherte inkl. Aufgebrauchtem (`undefined` = lädt) – für die Seite „Im Haus“ */
export function usePantryAll(): PantryItem[] | undefined {
  const data = useExternalStore(store.subscribe, snapshot, () => undefined);
  if (data === undefined) return undefined;
  return data?.items ?? EMPTY;
}

/** Was gerade da ist (`undefined` = lädt) */
export function usePantry(): PantryItem[] | undefined {
  const all = usePantryAll();
  return useMemo(() => (all ? activePantry(all, todayIso()) : undefined), [all]);
}
