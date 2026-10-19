// Vorrat ("Was ist noch da?"): Reste und Zutaten, die zu Hause sind – mit
// Datum, damit Wochenplan und später die KI sie nutzen können. Gespeichert
// lokal über localStore wie alles andere (später Supabase).

import { useExternalStore } from "../core/useExternalStore";
import { formatAmount } from "./cookbook";
import { findFood, foodName } from "./leftovers/foods";
import { createLocalStore } from "../core/localStore";
import { sectionFor } from "../einkauf/shoppingList";

/** Wo es liegt (Vorrat v2): Reiter auf der Vorrat-Seite */
export type PantryPlace = "kuehlschrank" | "tiefkuehler" | "schrank";

export const PANTRY_PLACES: { value: PantryPlace; label: string; short: string; emoji: string }[] = [
  { value: "kuehlschrank", label: "Kühlschrank", short: "Kühlschrank", emoji: "🧊" },
  { value: "tiefkuehler", label: "Tiefkühler", short: "Tiefkühler", emoji: "❄️" },
  { value: "schrank", label: "Vorratsschrank", short: "Schrank", emoji: "🥫" },
];

/** Naheliegender Ort für eine Zutat (Tiefkühlware, Haltbares, sonst Kühlschrank) */
export function placeFor(name: string): PantryPlace {
  if (/^(tk|tiefkühl)|gefroren|eiscreme|^eis$|fischstäbchen|tiefkühlpizza/i.test(name.trim())) return "tiefkuehler";
  const section = sectionFor(name);
  if (section === "tiefkuehl") return "tiefkuehler";
  if (section === "vorrat" || section === "getraenke") return "schrank";
  return "kuehlschrank";
}

export type PantryItem = {
  id: string;
  name: string;
  /** null = ohne Mengenangabe ("Bacon") */
  amount: number | null;
  /** z. B. "g", "Becher"; leer = Stück/Anzahl ("2 Karotten") */
  unit: string;
  /** Wann hinzugefügt, "YYYY-MM-DD" */
  addedAt: string;
  place: PantryPlace;
};

export const PANTRY_UNITS = [
  "", "g", "kg", "Pfund", "ml", "l", "EL", "TL", "Stück", "Prise", "Dose", "Bund", "Packung", "Becher",
  "Glas", "Scheibe", "Flasche", "Tüte", "Zehe", "Kopf", "Netz", "Schale",
];

// Gesagtes/Getipptes zerlegen: src/lib/essen/leftovers/parser.ts (austauschbar, später KI)

const FRACTIONS: Record<number, string> = { 0.25: "¼", 0.5: "½", 0.75: "¾" };

/** Menge mit Bruch-Zeichen: 0,5 → "½", 1,5 → "1½", sonst wie im Kochbuch */
export function formatPantryAmount(amount: number | null): string {
  if (amount === null) return "";
  const whole = Math.floor(amount);
  const fraction = FRACTIONS[Math.round((amount - whole) * 100) / 100];
  if (fraction) return `${whole > 0 ? whole : ""}${fraction}`;
  return formatAmount(amount);
}

/** "2 Karotten", "½ Brot", "200 g Bacon", "Joghurt" */
export function formatPantryItem(item: Pick<PantryItem, "name" | "amount" | "unit">): string {
  return [formatPantryAmount(item.amount), item.unit, item.name].filter(Boolean).join(" ");
}

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

/** v2: Ort (Kühlschrank, Tiefkühler, Vorratsschrank) */
type PantryStore = { version: 2; items: PantryItem[] };

const PLACES = PANTRY_PLACES.map((p) => p.value);

function migrateStore(raw: unknown): PantryStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; items?: unknown };
  if (![1, 2].includes(data.version as number) || !Array.isArray(data.items)) return null;
  return {
    version: 2,
    items: data.items
      .filter((i): i is Partial<PantryItem> => Boolean(i) && typeof i === "object")
      .filter((i) => typeof i.id === "string" && typeof i.name === "string")
      .map((i) => ({
        id: i.id!,
        name: i.name!,
        amount: typeof i.amount === "number" ? i.amount : null,
        unit: typeof i.unit === "string" ? i.unit : "",
        addedAt: typeof i.addedAt === "string" ? i.addedAt : "",
        // Bis v1 ohne Ort → naheliegender Ort
        place: PLACES.includes(i.place as PantryPlace) ? (i.place as PantryPlace) : placeFor(i.name!),
      })),
  };
}

const store = createLocalStore("wasgibts.vorrat", migrateStore);
const EMPTY: PantryItem[] = [];

function update(change: (items: PantryItem[]) => PantryItem[]) {
  const current = store.load() ?? { version: 2 as const, items: [] };
  store.save({ ...current, items: change(current.items) });
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

/**
 * Neue Zutaten hinzufügen; gleiche Zutat (gleiches Lebensmittel und Einheit)
 * wird zusammengezählt – 2 Karotten + 1 Karotte = 3 Karotten.
 */
export function addPantryItems(items: (Omit<PantryItem, "id" | "addedAt" | "place"> & { place?: PantryPlace })[], addedAt: string) {
  update((current) => {
    const next = current.map((p) => ({ ...p }));
    for (const raw of items) {
      const item = { ...raw, place: raw.place ?? placeFor(raw.name) };
      const same = next.find((p) => sameItemKey(p.name) === sameItemKey(item.name) && p.unit === item.unit && p.place === item.place);
      if (!same) {
        next.push({ ...item, id: newId(), addedAt });
        continue;
      }
      same.amount =
        same.amount === null && item.amount === null ? null : (same.amount ?? 0) + (item.amount ?? 0);
      same.addedAt = addedAt;
      // Form zur neuen Menge: "3 Karotten" statt "3 Karotte"
      const match = findFood(same.name);
      if (match) same.name = foodName(match.food, same.amount, same.unit, match.form);
    }
    return next;
  });
}

export function updatePantryItem(id: string, changes: Partial<Omit<PantryItem, "id">>) {
  update((items) => items.map((p) => (p.id === id ? { ...p, ...changes } : p)));
}

export function removePantryItem(id: string) {
  update((items) => items.filter((p) => p.id !== id));
}

/** Aktueller Vorrat (außerhalb von React) */
export function loadPantry(): PantryItem[] {
  return store.load()?.items ?? EMPTY;
}

/** Vorrat komplett ersetzen (Rückgängig) */
export function replacePantry(items: PantryItem[]) {
  update(() => items);
}

/** Wurde der Vorrat je genutzt? (dann Kachel "Vorrat" statt "Rezepte"; `undefined` = lädt) */
export function usePantryUsed(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : data !== null;
}

/** Vorrat (`undefined` = noch nicht geladen) */
export function usePantry(): PantryItem[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.items ?? EMPTY;
}
