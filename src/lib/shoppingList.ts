// Einkaufsliste je Planungswoche.
//
// Artikel aus Rezepten werden nicht gespeichert, sondern bei jedem Anzeigen
// aus dem Wochenplan berechnet (buildShoppingList) – so ist die Liste immer
// aktuell. "Doppelt kochen" verdoppelt die Mengen eines Gerichts.
// Gespeichert werden je Woche nur eigene Artikel, Häkchen, "Haben wir schon"
// und einmalige Umbenennungen; Häkchen hängen an einem festen Schlüssel
// (Zutat + Einheit), damit sie Änderungen am Plan überstehen.
// Dazu, für den ganzen Haushalt: eigene Produkte (Zutat → euer Produkt, die
// Rezepte bleiben unverändert), Läden je Artikel und die Stammliste – häufig
// gekaufte Artikel mit gelerntem Kaufrhythmus (früher "Immer da").
// Speicherung lokal über localStore.

import { useExternalStore } from "./useExternalStore";
import type { Recipe } from "./cookbook";
import { noteUserAction, todayIso } from "./activity";
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
  /** Für einen bestimmten Tag (Wochentag) – erscheint dann unter "Heute holen" */
  day?: string;
};

export type WeekList = {
  manual: ManualItem[];
  /** Schlüssel abgehakter Artikel aus Rezepten */
  checked: string[];
  /** Schlüssel von Artikeln, die wir schon haben (für diese Woche ausgeblendet) */
  have: string[];
  /** Nur diese Woche umbenannt ("Nur diesmal"): Schlüssel → Name */
  renamed?: Record<string, string>;
  /** Stammartikel, die diese Woche nicht vorgeschlagen werden ("diesmal nicht") */
  skippedStaples?: string[];
};

/** Stammartikel: häufig gekauft, mit Kaufrhythmus */
export type Staple = {
  id: string;
  name: string;
  amount: string;
  section: Section;
  /** Kauftage "YYYY-MM-DD" (aus abgehakten Artikeln) */
  purchases: string[];
  /** Fester Rhythmus in Tagen (z. B. aus "Immer da": 7); null = gelernt */
  intervalDays: number | null;
  active: boolean;
};

/** Läden als Vorschläge – eigene kommen dazu */
export const SHOP_SUGGESTIONS = ["Aldi", "Lidl", "Edeka", "Rewe", "Rossmann", "dm", "Wochenmarkt", "Bäcker"];

type ShoppingListStore = {
  /** v4: eigene Produkte, Läden, Stammliste (statt "Immer da") */
  version: 4;
  weeks: Record<string, WeekList>;
  /** Zutat (klein) → euer Produkt */
  products: Record<string, string>;
  /** Selbst angelegte Läden */
  shops: string[];
  /** Artikel (Anzeigename, klein) → Laden */
  itemShops: Record<string, string>;
  staples: Staple[];
};

/** Früher "Immer da" – wird bei der Migration zu Stammartikeln (wöchentlich) */
const DEFAULT_BASIC_NAMES = ["Brot", "Aufschnitt", "Käse", "Butter", "Milch", "Joghurt", "Obst"];

const SECTION_VALUES = SECTIONS.map((s) => s.value);

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
const stringMap = (v: unknown): Record<string, string> =>
  v && typeof v === "object"
    ? Object.fromEntries(Object.entries(v as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string"))
    : {};

function migrateManual(raw: unknown): ManualItem[] {
  return (Array.isArray(raw) ? raw : [])
    .filter((m): m is ManualItem => Boolean(m) && typeof m.id === "string" && typeof m.name === "string")
    .map((m) => ({
      id: m.id,
      name: m.name,
      amount: typeof m.amount === "string" ? m.amount : "",
      section: SECTION_VALUES.includes(m.section) ? m.section : sectionFor(m.name),
      done: m.done === true,
      ...(typeof m.day === "string" && m.day ? { day: m.day } : {}),
    }));
}

function migrateStore(raw: unknown): ShoppingListStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  const empty: ShoppingListStore = { version: 4, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [] };
  // v1 war nur ein Datenmodell ohne Seite – es gibt dort keine echten Daten.
  if (data.version === 1) return { ...empty, staples: basicsToStaples(null) };
  if (![2, 3, 4].includes(data.version as number) || !data.weeks || typeof data.weeks !== "object") return null;

  // v2/v3: "Immer da"-Basics (null = Standardliste)
  const rawBasics = (raw as { basics?: unknown }).basics;
  const basics =
    data.version === 4
      ? []
      : Array.isArray(rawBasics)
        ? rawBasics.filter((b): b is { id: string; name: string; amount?: string; active?: boolean } => Boolean(b) && typeof b.id === "string" && typeof b.name === "string")
        : null;

  const weeks: Record<string, WeekList> = {};
  for (const [key, value] of Object.entries(data.weeks)) {
    if (!value || typeof value !== "object") continue;
    const w = value as Partial<WeekList>;
    const manual = migrateManual(w.manual);
    let checked = strings(w.checked);
    let have = strings(w.have);
    // Häkchen an Basics ("b:<id>") bleiben als eigene Artikel dieser Woche erhalten
    if (data.version !== 4) {
      const basicKeys = [...new Set([...checked, ...have].filter((k) => k.startsWith("b:")))];
      for (const k of basicKeys) {
        const id = k.slice(2);
        const basic = (basics ?? defaultBasics()).find((b) => b.id === id);
        if (basic && checked.includes(k)) manual.push({ id: newId(), name: basic.name, amount: basic.amount ?? "", section: sectionFor(basic.name), done: true });
      }
      checked = checked.filter((k) => !k.startsWith("b:"));
      have = have.filter((k) => !k.startsWith("b:"));
    }
    weeks[key] = {
      manual,
      checked,
      have,
      renamed: stringMap(w.renamed),
      skippedStaples: strings(w.skippedStaples),
    };
  }

  if (data.version !== 4) return { ...empty, weeks, staples: basicsToStaples(basics) };

  const v4 = raw as Partial<ShoppingListStore>;
  return {
    version: 4,
    weeks,
    products: stringMap(v4.products),
    shops: strings(v4.shops),
    itemShops: stringMap(v4.itemShops),
    staples: (Array.isArray(v4.staples) ? v4.staples : [])
      .filter((st): st is Staple => Boolean(st) && typeof st.id === "string" && typeof st.name === "string")
      .map((st) => ({
        id: st.id,
        name: st.name,
        amount: typeof st.amount === "string" ? st.amount : "",
        section: SECTION_VALUES.includes(st.section) ? st.section : sectionFor(st.name),
        purchases: strings(st.purchases).slice(-12),
        intervalDays: typeof st.intervalDays === "number" && st.intervalDays > 0 ? st.intervalDays : null,
        active: st.active !== false,
      })),
  };
}

function defaultBasics() {
  return DEFAULT_BASIC_NAMES.map((name) => ({ id: `standard-${name.toLowerCase()}`, name, amount: "", active: true }));
}

/** "Immer da" → Stammartikel mit festem Wochenrhythmus */
function basicsToStaples(basics: { id: string; name: string; amount?: string; active?: boolean }[] | null): Staple[] {
  return (basics ?? defaultBasics())
    .filter((b) => b.name.trim())
    .map((b) => ({
      id: b.id,
      name: b.name.trim(),
      amount: b.amount ?? "",
      section: sectionFor(b.name),
      purchases: [],
      intervalDays: 7,
      active: b.active !== false,
    }));
}

const store = createLocalStore("wasgibts.einkaufsliste", migrateStore);
const EMPTY_LIST: WeekList = { manual: [], checked: [], have: [] };
const EMPTY_WEEKS: Record<string, WeekList> = {};

const emptyStore = (): ShoppingListStore => ({
  version: 4,
  weeks: {},
  products: {},
  shops: [],
  itemShops: {},
  staples: basicsToStaples(null),
});

function update(change: (s: ShoppingListStore) => ShoppingListStore) {
  store.save(change(store.load() ?? emptyStore()));
}

function updateList(weekStart: string, change: (list: WeekList) => WeekList) {
  update((s) => ({ ...s, weeks: { ...s.weeks, [weekStart]: change(s.weeks[weekStart] ?? EMPTY_LIST) } }));
  noteUserAction(todayIso());
}

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

const lower = (s: string) => s.trim().toLowerCase();

/** Abhaken; beim Abhaken lernt die Stammliste den Kauf (`today` = "YYYY-MM-DD") */
export function toggleChecked(weekStart: string, item: ListItem, today?: string) {
  updateList(weekStart, (l) =>
    item.manualId
      ? { ...l, manual: l.manual.map((m) => (m.id === item.manualId ? { ...m, done: !m.done } : m)) }
      : { ...l, checked: toggle(l.checked, item.key) },
  );
  if (today) recordPurchase(item, !item.checked, today);
}

export function setHave(weekStart: string, key: string, have: boolean) {
  updateList(weekStart, (l) => ({
    ...l,
    have: have ? [...l.have.filter((k) => k !== key), key] : l.have.filter((k) => k !== key),
  }));
}

/** Eigenen Artikel hinzufügen; gibt seine ID zurück (für "Rückgängig") */
export function addManualItem(weekStart: string, item: Omit<ManualItem, "id" | "done">): string {
  const id = newId();
  updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, { ...item, id, done: false }] }));
  return id;
}

/** Mehrere eigene Artikel auf einmal entfernen (Rückgängig) */
export function removeManualItems(weekStart: string, ids: string[]) {
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => !ids.includes(m.id)) }));
}

export function updateManualItem(weekStart: string, id: string, changes: Partial<Omit<ManualItem, "id">>) {
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === id ? { ...m, ...changes } : m)) }));
}

export function removeManualItem(weekStart: string, id: string) {
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => m.id !== id) }));
}

/** Alle Listen auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceShoppingLists(weeks: Record<string, WeekList>) {
  update((s) => ({ ...s, weeks }));
}

// --- Eigene Produkte ------------------------------------------------------------

/** "Immer so": Zutat → euer Produkt (Rezepte bleiben unverändert) */
export function setProduct(ingredient: string, product: string) {
  const key = lower(ingredient);
  if (!key) return;
  update((s) => {
    const products = { ...s.products };
    if (!product.trim() || lower(product) === key) delete products[key];
    else products[key] = product.trim();
    return { ...s, products };
  });
}

export function removeProduct(ingredient: string) {
  setProduct(ingredient, "");
}

/** Artikel umbenennen: `always` = als eigenes Produkt merken, sonst nur diese Woche */
export function renameItem(weekStart: string, item: ListItem, name: string, always: boolean) {
  const clean = name.trim();
  if (!clean) return;
  if (item.manualId) {
    updateManualItem(weekStart, item.manualId, { name: clean });
    if (always) setProduct(item.originalName, clean);
    return;
  }
  if (always) {
    setProduct(item.originalName, clean);
    updateList(weekStart, (l) => {
      const renamed = { ...(l.renamed ?? {}) };
      delete renamed[item.key];
      return { ...l, renamed };
    });
  } else {
    updateList(weekStart, (l) => ({ ...l, renamed: { ...(l.renamed ?? {}), [item.key]: clean } }));
  }
}

// --- Läden ----------------------------------------------------------------------

export function addShop(name: string) {
  const clean = name.trim().slice(0, 30);
  if (!clean) return;
  update((s) =>
    [...SHOP_SUGGESTIONS, ...s.shops].some((x) => lower(x) === lower(clean)) ? s : { ...s, shops: [...s.shops, clean] },
  );
}

export function removeShop(name: string) {
  update((s) => ({
    ...s,
    shops: s.shops.filter((x) => x !== name),
    itemShops: Object.fromEntries(Object.entries(s.itemShops).filter(([, shop]) => shop !== name)),
  }));
}

/** Laden für einen Artikel merken (leer = keiner) */
export function setItemShop(itemName: string, shop: string) {
  const key = lower(itemName);
  if (!key) return;
  update((s) => {
    const itemShops = { ...s.itemShops };
    if (shop.trim()) itemShops[key] = shop.trim();
    else delete itemShops[key];
    const known = [...SHOP_SUGGESTIONS, ...s.shops].some((x) => lower(x) === lower(shop));
    return { ...s, itemShops, shops: shop.trim() && !known ? [...s.shops, shop.trim()] : s.shops };
  });
}

// --- Stammliste -----------------------------------------------------------------

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

/** Kauf merken bzw. (beim Zurücknehmen) heutigen Kauf wieder entfernen */
function recordPurchase(item: ListItem, bought: boolean, today: string) {
  const name = item.name.trim();
  if (!name) return;
  update((s) => {
    const existing = s.staples.find((st) => lower(st.name) === lower(name));
    if (!bought) {
      if (!existing) return s;
      return { ...s, staples: s.staples.map((st) => (st === existing ? { ...st, purchases: st.purchases.filter((d) => d !== today) } : st)) };
    }
    if (existing) {
      if (existing.purchases.includes(today)) return s;
      return { ...s, staples: s.staples.map((st) => (st === existing ? { ...st, purchases: [...st.purchases, today].slice(-12) } : st)) };
    }
    const staple: Staple = { id: newId(), name, amount: item.manualId ? item.amount : "", section: item.section, purchases: [today], intervalDays: null, active: true };
    return { ...s, staples: [...s.staples, staple] };
  });
}

/** Kaufrhythmus in Tagen: fest oder gelernt (Median der Abstände, ab 2 Käufen in verschiedenen Wochen) */
export function stapleInterval(staple: Staple): number | null {
  if (staple.intervalDays) return staple.intervalDays;
  const dates = [...new Set(staple.purchases)].sort();
  const gaps = dates.slice(1).map((d, i) => days(dates[i], d)).filter((g) => g >= 3);
  if (gaps.length === 0) return null;
  gaps.sort((a, b) => a - b);
  return gaps[Math.floor(gaps.length / 2)];
}

/** "jede Woche", "alle 2 Wochen" … */
export function rhythmLabel(interval: number): string {
  if (interval <= 9) return "jede Woche";
  const weeks = Math.round(interval / 7);
  return weeks <= 1 ? "jede Woche" : `alle ${weeks} Wochen`;
}

/** Zählt als Stammartikel (fester oder gelernter Rhythmus) */
export function isStaple(staple: Staple): boolean {
  return staple.active && stapleInterval(staple) !== null;
}

/**
 * Für die Woche fällige Stammartikel, die noch nicht auf der Liste stehen:
 * nie gekauft (fester Rhythmus) oder letzter Kauf + Rhythmus bis zur
 * Wochenmitte erreicht.
 */
export function dueStaples(staples: Staple[], weekStart: string, list: ShoppingList, week: WeekList = EMPTY_LIST): Staple[] {
  const onList = new Set(list.items.map((i) => lower(i.name)));
  const skipped = new Set(week.skippedStaples ?? []);
  return staples.filter((st) => {
    const interval = stapleInterval(st);
    if (!st.active || interval === null || onList.has(lower(st.name)) || skipped.has(st.id)) return false;
    const last = [...st.purchases].sort().pop();
    if (!last) return true;
    if (last >= weekStart) return false;
    return days(last, weekStart) + 3 >= interval;
  });
}

/** Vorschlag übernehmen → als Artikel dieser Woche */
export function takeStaple(weekStart: string, staple: Staple) {
  addManualItem(weekStart, { name: staple.name, amount: staple.amount, section: staple.section });
}

/** "Diesmal nicht" */
export function skipStaple(weekStart: string, staple: Staple) {
  updateList(weekStart, (l) => ({ ...l, skippedStaples: [...(l.skippedStaples ?? []), staple.id] }));
}

export function addStaple(name: string, amount = "", intervalDays = 7) {
  const clean = name.trim();
  if (!clean) return;
  update((s) => {
    const existing = s.staples.find((st) => lower(st.name) === lower(clean));
    if (existing) return { ...s, staples: s.staples.map((st) => (st === existing ? { ...st, active: true, intervalDays: st.intervalDays ?? intervalDays } : st)) };
    return { ...s, staples: [...s.staples, { id: newId(), name: clean, amount: amount.trim(), section: sectionFor(clean), purchases: [], intervalDays, active: true }] };
  });
}

export function updateStaple(id: string, changes: Partial<Omit<Staple, "id">>) {
  update((s) => ({ ...s, staples: s.staples.map((st) => (st.id === id ? { ...st, ...changes } : st)) }));
}

/** Aus der Stammliste nehmen (wird nicht mehr vorgeschlagen) */
export function removeStaple(id: string) {
  updateStaple(id, { active: false, intervalDays: null, purchases: [] });
}

// --- Hooks ----------------------------------------------------------------------

/** Gespeicherte Listen aller Wochen (`undefined` = noch nicht geladen) */
export function useShoppingLists(): Record<string, WeekList> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

export type ShoppingSettings = Pick<ShoppingListStore, "products" | "shops" | "itemShops" | "staples">;

const DEFAULT_SETTINGS: ShoppingSettings = { products: {}, shops: [], itemShops: {}, staples: basicsToStaples(null) };
let cachedSettings: { source: ShoppingListStore | null; value: ShoppingSettings } | null = null;

function settingsOf(data: ShoppingListStore | null): ShoppingSettings {
  if (!data) return DEFAULT_SETTINGS;
  if (cachedSettings?.source === data) return cachedSettings.value;
  const value = { products: data.products, shops: data.shops, itemShops: data.itemShops, staples: data.staples };
  cachedSettings = { source: data, value };
  return value;
}

/** Produkte, Läden, Stammliste (`undefined` = noch nicht geladen) */
export function useShoppingSettings(): ShoppingSettings | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return settingsOf(data);
}

/** Alle Läden: Vorschläge + eigene */
export function allShops(settings: Pick<ShoppingSettings, "shops">): string[] {
  return [...SHOP_SUGGESTIONS, ...settings.shops.filter((x) => !SHOP_SUGGESTIONS.some((s) => lower(s) === lower(x)))];
}

// --- Liste zusammensetzen -------------------------------------------------------

export type ListItem = {
  key: string;
  /** Angezeigter Name (euer Produkt bzw. umbenannt) */
  name: string;
  /** Name aus Rezept bzw. wie eingegeben */
  originalName: string;
  amount: string;
  section: Section;
  /** Für welche Gerichte, z. B. "Gulasch (Mi)" */
  dishes: string[];
  /** Wochentage der Gerichte */
  days: string[];
  /** Laden, falls gemerkt */
  shop: string;
  /** Nur für eine lockere Wochenend-Idee – optional, abwählbar */
  optional?: boolean;
  /** Nur bei eigenen Artikeln */
  manualId?: string;
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
  settings: Pick<ShoppingSettings, "products" | "itemShops"> = { products: {}, itemShops: {} },
): ShoppingList {
  type Acc = { name: string; family: string; total: number; hasAmount: boolean; dishes: string[]; days: string[]; optional: boolean };
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
      const item = acc.get(key) ?? { name: ing.name.trim(), family, total: 0, hasAmount: false, dishes: [], days: [], optional: true };
      // Lockeres Wochenende: nur eine Idee – Zutaten optional
      if (day.weekend !== "locker") item.optional = false;
      if (ing.amount !== null) {
        item.total += ing.amount * factor * times;
        item.hasAmount = true;
      }
      if (!item.dishes.includes(dish)) item.dishes.push(dish);
      if (!item.days.includes(day.weekday)) item.days.push(day.weekday);
      acc.set(key, item);
    }
  }

  const display = (key: string, name: string) => list.renamed?.[key] ?? settings.products[lower(name)] ?? name;
  const shopOf = (name: string) => settings.itemShops[lower(name)] ?? "";

  const generated: ListItem[] = [...acc.entries()].map(([key, a]) => {
    const name = display(key, a.name);
    return {
      key,
      name,
      originalName: a.name,
      amount: a.hasAmount ? formatTotal(a.total, a.family) : a.family,
      section: sectionFor(a.name),
      dishes: a.dishes,
      days: a.days,
      shop: shopOf(name),
      optional: a.optional,
      checked: list.checked.includes(key),
      hidden: list.have.includes(key),
    };
  });
  const manual: ListItem[] = list.manual.map((m) => {
    const name = settings.products[lower(m.name)] ?? m.name;
    return {
      key: `m:${m.id}`,
      name,
      originalName: m.name,
      amount: m.amount,
      section: m.section,
      dishes: [],
      days: m.day ? [m.day] : [],
      shop: shopOf(name),
      manualId: m.id,
      checked: m.done,
      hidden: false,
    };
  });

  const items = [...generated, ...manual].sort(
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

/** Offene Artikel als Text zum Teilen (WhatsApp, Nachricht …) – optional nur ein Laden */
export function shoppingListText(list: ShoppingList, title: string, shop?: string): string {
  const lines = [title];
  const open = list.items.filter((i) => !i.checked && !i.hidden && (shop === undefined || i.shop === shop));
  for (const section of SECTIONS) {
    const items = open.filter((i) => i.section === section.value);
    if (items.length === 0) continue;
    lines.push("", `${section.emoji} ${section.label}`);
    for (const item of items) lines.push(`- ${item.amount ? `${item.amount} ` : ""}${item.name}`);
  }
  return lines.join("\n");
}
