// Einkaufsliste je Planungswoche.
//
// Artikel aus Rezepten werden nicht gespeichert, sondern bei jedem Anzeigen
// aus dem Wochenplan berechnet (buildShoppingList) – so ist die Liste immer
// aktuell. "Doppelt kochen" verdoppelt die Mengen eines Gerichts. Dazu kommen
// die "Immer da"-Basics (Brot, Obst …), die jede Woche automatisch auf der
// Liste stehen. Gespeichert werden nur eigene Artikel, Basics, Häkchen und
// "Haben wir schon"; Häkchen hängen an einem festen Schlüssel (Zutat +
// Einheit), damit sie Änderungen am Plan überstehen. Speicherung lokal über
// localStore.

import { useExternalStore } from "./useExternalStore";
import type { Recipe } from "./cookbook";
import { createLocalStore } from "./localStore";
import type { PlanWeek } from "./mealPlan";

// --- Abteilungen --------------------------------------------------------------

export type Section =
  | "obst-gemuese"
  | "fleisch-fisch"
  | "kuehlregal"
  | "brot"
  | "vorrat"
  | "tiefkuehl"
  | "getraenke"
  | "sonstiges";

/** Reihenfolge wie im Supermarkt */
export const SECTIONS: { value: Section; label: string; emoji: string }[] = [
  { value: "obst-gemuese", label: "Obst & Gemüse", emoji: "🥕" },
  { value: "fleisch-fisch", label: "Fleisch & Fisch", emoji: "🥩" },
  { value: "kuehlregal", label: "Kühlregal", emoji: "🧀" },
  { value: "brot", label: "Brot & Backwaren", emoji: "🥖" },
  { value: "vorrat", label: "Vorrat/Trockenware", emoji: "🥫" },
  { value: "tiefkuehl", label: "Tiefkühl", emoji: "🧊" },
  { value: "getraenke", label: "Getränke", emoji: "🧃" },
  { value: "sonstiges", label: "Sonstiges", emoji: "🛍️" },
];

/**
 * Stichwörter → Abteilung. Der erste Treffer zählt, daher stehen
 * Sonderfälle ("paprikapulver", "kokosmilch", "fischstäbchen") vor den
 * allgemeinen Wörtern ("paprika", "milch", "fisch").
 */
const KEYWORDS: [string, Section][] = [
  // Sonderfälle zuerst
  ["paprikapulver", "vorrat"], ["currypulver", "vorrat"], ["tomatenmark", "vorrat"],
  ["passierte", "vorrat"], ["dosentomaten", "vorrat"], ["gehackte tomaten", "vorrat"],
  ["kokosmilch", "vorrat"], ["fischstäbchen", "tiefkuehl"], ["pommes", "tiefkuehl"],
  ["tiefkühl", "tiefkuehl"], ["tk-", "tiefkuehl"], ["gefroren", "tiefkuehl"],
  ["pizzateig", "kuehlregal"], ["blätterteig", "kuehlregal"], ["hefeteig", "kuehlregal"],
  ["thunfisch", "vorrat"], ["frühlingszwiebel", "obst-gemuese"], ["süßkartoffel", "obst-gemuese"],
  ["semmelbrösel", "vorrat"], ["paniermehl", "vorrat"], ["brühe", "vorrat"],
  // Obst & Gemüse
  ["zwiebel", "obst-gemuese"], ["knoblauch", "obst-gemuese"], ["kartoffel", "obst-gemuese"],
  ["tomate", "obst-gemuese"], ["gurke", "obst-gemuese"], ["paprika", "obst-gemuese"],
  ["möhre", "obst-gemuese"], ["karotte", "obst-gemuese"], ["salat", "obst-gemuese"],
  ["zucchini", "obst-gemuese"], ["aubergine", "obst-gemuese"], ["brokkoli", "obst-gemuese"],
  ["blumenkohl", "obst-gemuese"], ["spinat", "obst-gemuese"], ["lauch", "obst-gemuese"],
  ["porree", "obst-gemuese"], ["sellerie", "obst-gemuese"], ["kürbis", "obst-gemuese"],
  ["pilz", "obst-gemuese"], ["champignon", "obst-gemuese"], ["apfel", "obst-gemuese"],
  ["äpfel", "obst-gemuese"], ["birne", "obst-gemuese"], ["banane", "obst-gemuese"],
  ["zitrone", "obst-gemuese"], ["limette", "obst-gemuese"], ["orange", "obst-gemuese"],
  ["beere", "obst-gemuese"], ["ingwer", "obst-gemuese"], ["petersilie", "obst-gemuese"],
  ["schnittlauch", "obst-gemuese"], ["basilikum", "obst-gemuese"], ["kräuter", "obst-gemuese"],
  ["rucola", "obst-gemuese"], ["kohl", "obst-gemuese"], ["avocado", "obst-gemuese"],
  ["chili", "obst-gemuese"], ["radieschen", "obst-gemuese"], ["rote bete", "obst-gemuese"],
  ["mango", "obst-gemuese"], ["traube", "obst-gemuese"], ["kiwi", "obst-gemuese"],
  ["ananas", "obst-gemuese"], ["koriander", "obst-gemuese"], ["dill", "obst-gemuese"],
  ["obst", "obst-gemuese"], ["gemüse", "obst-gemuese"],
  // Fleisch & Fisch
  ["fleisch", "fleisch-fisch"], ["rind", "fleisch-fisch"], ["schwein", "fleisch-fisch"],
  ["aufschnitt", "fleisch-fisch"], ["salami", "fleisch-fisch"],
  ["hähnchen", "fleisch-fisch"], ["huhn", "fleisch-fisch"], ["hühn", "fleisch-fisch"],
  ["pute", "fleisch-fisch"], ["hack", "fleisch-fisch"], ["wurst", "fleisch-fisch"],
  ["würstchen", "fleisch-fisch"], ["speck", "fleisch-fisch"], ["schinken", "fleisch-fisch"],
  ["lachs", "fleisch-fisch"], ["fisch", "fleisch-fisch"], ["garnele", "fleisch-fisch"],
  ["steak", "fleisch-fisch"], ["schnitzel", "fleisch-fisch"], ["kabeljau", "fleisch-fisch"],
  ["forelle", "fleisch-fisch"], ["filet", "fleisch-fisch"], ["gulasch", "fleisch-fisch"],
  // Kühlregal
  ["milch", "kuehlregal"], ["butter", "kuehlregal"], ["joghurt", "kuehlregal"],
  ["quark", "kuehlregal"], ["sahne", "kuehlregal"], ["käse", "kuehlregal"],
  ["schmand", "kuehlregal"], ["crème fraîche", "kuehlregal"], ["creme fraiche", "kuehlregal"],
  ["mozzarella", "kuehlregal"], ["parmesan", "kuehlregal"], ["feta", "kuehlregal"],
  ["tofu", "kuehlregal"], ["eier", "kuehlregal"],
  // Brot & Backwaren
  ["brot", "brot"], ["brötchen", "brot"], ["toast", "brot"], ["baguette", "brot"],
  ["wrap", "brot"], ["tortilla", "brot"], ["croissant", "brot"],
  // Vorrat/Trockenware
  ["mehl", "vorrat"], ["zucker", "vorrat"], ["salz", "vorrat"], ["pfeffer", "vorrat"],
  ["öl", "vorrat"], ["essig", "vorrat"], ["reis", "vorrat"], ["nudel", "vorrat"],
  ["spaghetti", "vorrat"], ["pasta", "vorrat"], ["penne", "vorrat"], ["linsen", "vorrat"],
  ["bohnen", "vorrat"], ["kichererbsen", "vorrat"], ["dose", "vorrat"], ["gewürz", "vorrat"],
  ["curry", "vorrat"], ["honig", "vorrat"], ["senf", "vorrat"], ["ketchup", "vorrat"],
  ["mayo", "vorrat"], ["haferflocken", "vorrat"], ["backpulver", "vorrat"], ["hefe", "vorrat"],
  ["soße", "vorrat"], ["sauce", "vorrat"], ["couscous", "vorrat"], ["bulgur", "vorrat"],
  ["nüsse", "vorrat"], ["mandel", "vorrat"], ["grieß", "vorrat"], ["kakao", "vorrat"],
  ["marmelade", "vorrat"], ["zimt", "vorrat"], ["oregano", "vorrat"], ["muskat", "vorrat"],
  ["mais", "vorrat"], ["erbsen", "vorrat"],
  // Tiefkühl
  ["eiscreme", "tiefkuehl"],
  // Getränke
  ["wasser", "getraenke"], ["saft", "getraenke"], ["limo", "getraenke"], ["cola", "getraenke"],
  ["bier", "getraenke"], ["wein", "getraenke"], ["sprudel", "getraenke"], ["tee", "getraenke"],
  ["kaffee", "getraenke"],
];

/** Abteilung für eine Zutat anhand ihres Namens */
export function sectionFor(name: string): Section {
  const n = name.trim().toLowerCase();
  // "Ei"/"Eier" als ganzes Wort, sonst trifft "ei" fast alles
  if (/^eier?$/.test(n) || /\beier?\b/.test(n)) return "kuehlregal";
  if (/^eis$/.test(n)) return "tiefkuehl";
  return KEYWORDS.find(([keyword]) => n.includes(keyword))?.[1] ?? "sonstiges";
}

// --- Mengen -------------------------------------------------------------------

type UnitFamily = { family: string; factor: number };

/** Einheiten derselben Familie werden zusammengerechnet (in g bzw. ml). */
function unitFamily(unit: string): UnitFamily {
  switch (unit) {
    case "g":
      return { family: "g", factor: 1 };
    case "kg":
      return { family: "g", factor: 1000 };
    case "ml":
      return { family: "ml", factor: 1 };
    case "l":
      return { family: "ml", factor: 1000 };
    default:
      return { family: unit, factor: 1 };
  }
}

function formatNumber(value: number): string {
  return String(Math.round(value * 100) / 100).replace(".", ",");
}

/** Summe als Text: 1500 g → "1,5 kg", 3 Stück → "3 Stück" */
function formatTotal(total: number, family: string): string {
  if (family === "g" && total >= 1000) return `${formatNumber(total / 1000)} kg`;
  if (family === "ml" && total >= 1000) return `${formatNumber(total / 1000)} l`;
  return `${formatNumber(total)} ${family}`.trim();
}

// --- Gespeicherter Teil ---------------------------------------------------------

export type ManualItem = {
  id: string;
  name: string;
  amount: string;
  section: Section;
  done: boolean;
};

export type WeekList = {
  manual: ManualItem[];
  /** Schlüssel abgehakter Artikel aus Rezepten */
  checked: string[];
  /** Schlüssel von Artikeln, die wir schon haben (für diese Woche ausgeblendet) */
  have: string[];
};

/** "Immer da": kommt jede Woche automatisch auf die Liste, solange aktiv */
export type BasicItem = {
  id: string;
  name: string;
  amount: string;
  section: Section;
  active: boolean;
};

type ShoppingListStore = {
  /** v3: dazu die "Immer da"-Basics (null = noch die Standardliste) */
  version: 3;
  weeks: Record<string, WeekList>;
  basics: BasicItem[] | null;
};

const DEFAULT_BASIC_NAMES = ["Brot", "Aufschnitt", "Käse", "Butter", "Milch", "Joghurt", "Obst"];

/** Standard-Basics, solange die Familie nichts geändert hat */
export const DEFAULT_BASICS: BasicItem[] = DEFAULT_BASIC_NAMES.map((name) => ({
  id: `standard-${name.toLowerCase()}`,
  name,
  amount: "",
  section: sectionFor(name),
  active: true,
}));

const SECTION_VALUES = SECTIONS.map((s) => s.value);

function migrateStore(raw: unknown): ShoppingListStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  // v1 war nur ein Datenmodell ohne Seite – es gibt dort keine echten Daten.
  if (data.version === 1) return { version: 3, weeks: {}, basics: null };
  if ((data.version !== 2 && data.version !== 3) || !data.weeks || typeof data.weeks !== "object") return null;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const weeks: Record<string, WeekList> = {};
  for (const [key, raw] of Object.entries(data.weeks)) {
    if (!raw || typeof raw !== "object") continue;
    const w = raw as Partial<WeekList>;
    weeks[key] = {
      manual: (Array.isArray(w.manual) ? w.manual : [])
        .filter((m): m is ManualItem => Boolean(m) && typeof m.id === "string" && typeof m.name === "string")
        .map((m) => ({
          id: m.id,
          name: m.name,
          amount: typeof m.amount === "string" ? m.amount : "",
          section: SECTION_VALUES.includes(m.section) ? m.section : "sonstiges",
          done: m.done === true,
        })),
      checked: strings(w.checked),
      have: strings(w.have),
    };
  }
  const rawBasics = (raw as { basics?: unknown }).basics;
  const basics = Array.isArray(rawBasics)
    ? rawBasics
        .filter((b): b is BasicItem => Boolean(b) && typeof b.id === "string" && typeof b.name === "string")
        .map((b) => ({
          id: b.id,
          name: b.name,
          amount: typeof b.amount === "string" ? b.amount : "",
          section: SECTION_VALUES.includes(b.section) ? b.section : sectionFor(b.name),
          active: b.active !== false,
        }))
    : null;
  return { version: 3, weeks, basics };
}

const store = createLocalStore("wasgibts.einkaufsliste", migrateStore);
const EMPTY_LIST: WeekList = { manual: [], checked: [], have: [] };
const EMPTY_WEEKS: Record<string, WeekList> = {};

const emptyStore = (): ShoppingListStore => ({ version: 3, weeks: {}, basics: null });

function updateList(weekStart: string, change: (list: WeekList) => WeekList) {
  const current = store.load() ?? emptyStore();
  store.save({
    ...current,
    weeks: { ...current.weeks, [weekStart]: change(current.weeks[weekStart] ?? EMPTY_LIST) },
  });
}

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

export function toggleChecked(weekStart: string, item: ListItem) {
  updateList(weekStart, (l) =>
    item.manualId
      ? { ...l, manual: l.manual.map((m) => (m.id === item.manualId ? { ...m, done: !m.done } : m)) }
      : { ...l, checked: toggle(l.checked, item.key) },
  );
}

export function setHave(weekStart: string, key: string, have: boolean) {
  updateList(weekStart, (l) => ({
    ...l,
    have: have ? [...l.have.filter((k) => k !== key), key] : l.have.filter((k) => k !== key),
  }));
}

export function addManualItem(weekStart: string, item: Omit<ManualItem, "id" | "done">) {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, { ...item, id, done: false }] }));
}

/** Alle Listen auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceShoppingLists(weeks: Record<string, WeekList>) {
  const current = store.load() ?? emptyStore();
  store.save({ ...current, weeks });
}

// --- "Immer da" ------------------------------------------------------------------

function updateBasics(change: (basics: BasicItem[]) => BasicItem[]) {
  const current = store.load() ?? emptyStore();
  store.save({ ...current, basics: change(current.basics ?? DEFAULT_BASICS) });
}

export function addBasic(name: string, amount = "") {
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
  updateBasics((b) => [...b, { id, name: name.trim(), amount: amount.trim(), section: sectionFor(name), active: true }]);
}

export function updateBasic(id: string, changes: Partial<Omit<BasicItem, "id">>) {
  updateBasics((b) =>
    b.map((item) =>
      item.id === id
        ? { ...item, ...changes, section: changes.name !== undefined ? sectionFor(changes.name) : item.section }
        : item,
    ),
  );
}

export function removeBasic(id: string) {
  updateBasics((b) => b.filter((item) => item.id !== id));
}

/** "Immer da"-Basics (`undefined` = noch nicht geladen) */
export function useShoppingBasics(): BasicItem[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.basics ?? DEFAULT_BASICS;
}

export function removeManualItem(weekStart: string, id: string) {
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => m.id !== id) }));
}

/** Gespeicherte Listen aller Wochen (`undefined` = noch nicht geladen) */
export function useShoppingLists(): Record<string, WeekList> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

// --- Liste zusammensetzen -------------------------------------------------------

export type ListItem = {
  key: string;
  name: string;
  amount: string;
  section: Section;
  /** Für welche Gerichte, z. B. "Gulasch (Mi)" */
  dishes: string[];
  /** Nur bei eigenen Artikeln */
  manualId?: string;
  /** Aus "Immer da" */
  basic?: boolean;
  checked: boolean;
  /** "Haben wir schon" – für diese Woche ausgeblendet */
  hidden: boolean;
};

export type ShoppingList = {
  items: ListItem[];
  /** Gerichte ohne Zutaten (Freitext, Wunsch, Rezept ohne Zutaten) */
  missing: string[];
  openCount: number;
  doneCount: number;
};

export function buildShoppingList(
  week: PlanWeek,
  recipes: Record<string, Recipe>,
  list: WeekList = EMPTY_LIST,
  basics: BasicItem[] = [],
): ShoppingList {
  type Acc = { name: string; family: string; total: number; hasAmount: boolean; dishes: string[] };
  const acc = new Map<string, Acc>();
  const missing: string[] = [];

  for (const day of week.days) {
    if (day.away) continue;
    const short = day.weekday.slice(0, 2);
    const entry = day.slot.entry;
    if (!entry) continue;
    const recipe = entry.recipeId ? recipes[entry.recipeId] : undefined;
    const ingredients = recipe?.ingredients.filter((i) => i.name.trim()) ?? [];
    const label = entry.stored.kind === "wish" ? `${entry.kidName}s Wunsch „${entry.title}“` : entry.title;
    if (ingredients.length === 0) {
      missing.push(`${label} (${short})`);
      continue;
    }
    // Doppelt kochen → doppelte Mengen
    const times = entry.double ? 2 : 1;
    const dish = `${entry.title} (${short})${entry.double ? " ×2" : ""}`;
    for (const ing of ingredients) {
      const { family, factor } = unitFamily(ing.unit);
      const key = `${ing.name.trim().toLowerCase()}|${family}`;
      const item = acc.get(key) ?? { name: ing.name.trim(), family, total: 0, hasAmount: false, dishes: [] };
      if (ing.amount !== null) {
        item.total += ing.amount * factor * times;
        item.hasAmount = true;
      }
      if (!item.dishes.includes(dish)) item.dishes.push(dish);
      acc.set(key, item);
    }
  }

  const generated: ListItem[] = [...acc.entries()].map(([key, a]) => ({
    key,
    name: a.name,
    amount: a.hasAmount ? formatTotal(a.total, a.family) : a.family,
    section: sectionFor(a.name),
    dishes: a.dishes,
    checked: list.checked.includes(key),
    hidden: list.have.includes(key),
  }));
  const manual: ListItem[] = list.manual.map((m) => ({
    key: `m:${m.id}`,
    name: m.name,
    amount: m.amount,
    section: m.section,
    dishes: [],
    manualId: m.id,
    checked: m.done,
    hidden: false,
  }));

  const basicItems: ListItem[] = basics
    .filter((b) => b.active && b.name.trim())
    .map((b) => {
      const key = `b:${b.id}`;
      return {
        key,
        name: b.name,
        amount: b.amount,
        section: b.section,
        dishes: [],
        basic: true,
        checked: list.checked.includes(key),
        hidden: list.have.includes(key),
      };
    });

  const items = [...generated, ...basicItems, ...manual].sort(
    (a, b) =>
      SECTION_VALUES.indexOf(a.section) - SECTION_VALUES.indexOf(b.section) ||
      a.name.localeCompare(b.name, "de"),
  );
  const visible = items.filter((i) => !i.hidden);
  return {
    items,
    missing,
    openCount: visible.filter((i) => !i.checked).length,
    doneCount: visible.filter((i) => i.checked).length,
  };
}

/** Offene Artikel als Text zum Teilen (WhatsApp, Nachricht …) */
export function shoppingListText(list: ShoppingList, title: string): string {
  const lines = [title];
  for (const section of SECTIONS) {
    const open = list.items.filter((i) => i.section === section.value && !i.checked && !i.hidden);
    if (open.length === 0) continue;
    lines.push("", `${section.emoji} ${section.label}`);
    for (const item of open) lines.push(`- ${item.amount ? `${item.amount} ` : ""}${item.name}`);
  }
  return lines.join("\n");
}
