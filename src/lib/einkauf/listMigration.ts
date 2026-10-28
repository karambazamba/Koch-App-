// Einkaufsliste: Migration des gespeicherten Stands (v1–v6 → v7). Die frühere
// "Immer da"-Liste wird dabei zu Stammartikeln mit festem Wochenrhythmus; v5 → v6
// bekommt leere feste Laden-Regeln, nichts Gelerntes, keine „hat man da“-Ausnahmen;
// v6 → v7 fasst doppelte offene eigene Artikel zusammen (gleiche Sache im selben
// Laden, Mengen addiert – nichts geht verloren, `einkauf/zusammen`).

import { SECTION_VALUES, sectionFor } from "@/lib/einkauf/sections";
import { wocheZusammenfassen } from "@/lib/einkauf/zusammen/zusammen";
import { newId, type ManualItem, type ShoppingListStore, type Staple, type WeekList } from "@/lib/einkauf/listModel";

/** Früher "Immer da" – wird bei der Migration zu Stammartikeln (wöchentlich) */
const DEFAULT_BASIC_NAMES = ["Brot", "Aufschnitt", "Käse", "Butter", "Milch", "Joghurt", "Obst"];

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
      ...(m.now === true ? { now: true } : {}),
      ...(typeof m.dish === "string" && m.dish ? { dish: m.dish } : {}),
      ...(typeof m.von === "string" && m.von ? { von: m.von } : {}),
      ...(typeof m.rezeptMenge === "string" && m.rezeptMenge ? { rezeptMenge: m.rezeptMenge } : {}),
    }));
}

export function migrateStore(raw: unknown): ShoppingListStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; weeks?: Record<string, unknown> };
  const empty: ShoppingListStore = { version: 7, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], myShops: [], shopsAsked: false, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [] };
  // v1 war nur ein Datenmodell ohne Seite – es gibt dort keine echten Daten.
  if (data.version === 1) return { ...empty, staples: basicsToStaples(null) };
  if (![2, 3, 4, 5, 6, 7].includes(data.version as number) || !data.weeks || typeof data.weeks !== "object") return null;
  const modern = (data.version as number) >= 4;

  // v2/v3: "Immer da"-Basics (null = Standardliste)
  const rawBasics = (raw as { basics?: unknown }).basics;
  const basics =
    modern
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
    if (!modern) {
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
      ...(Array.isArray(w.fertig) ? { fertig: strings(w.fertig) } : {}),
    };
  }

  if (!modern) return zusammenfassen({ ...empty, weeks, staples: basicsToStaples(basics) });

  // v4 → v5: „Meine Läden“ leer, Frage noch offen (die Karte zeigt sich einmal, Läden an Artikeln vorausgewählt)
  // v5 → v6: keine festen Regeln, nichts gelernt, keine Ausnahmen
  const v4 = raw as Partial<ShoppingListStore>;
  const v5 = (data.version as number) >= 5;
  const v6 = (data.version as number) >= 6;
  const next: ShoppingListStore = {
    version: 7,
    myShops: v5 ? strings(v4.myShops) : [],
    shopsAsked: v5 && v4.shopsAsked === true,
    shopRules: v6 ? stringMap(v4.shopRules) : {},
    learned: v6 ? learnedMap(v4.learned) : {},
    learnAsked: v6 ? strings(v4.learnAsked) : [],
    alwaysList: v6 ? strings(v4.alwaysList) : [],
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
  return data.version === 7 ? next : zusammenfassen(next);
}

/** v6 → v7: doppelte offene eigene Artikel je Woche zusammen (Laden wie auf der Liste) */
function zusammenfassen(s: ShoppingListStore): ShoppingListStore {
  // Laden wie auf der Liste: feste Regel, sonst gemerkt (eigenes Produkt zählt mit)
  const laden = (name: string) => {
    const k = name.trim().toLowerCase();
    const p = s.products[k]?.trim().toLowerCase();
    return s.shopRules[k] ?? (p ? s.shopRules[p] : undefined) ?? s.itemShops[k] ?? (p ? s.itemShops[p] : undefined) ?? null;
  };
  const weeks = Object.fromEntries(Object.entries(s.weeks).map(([k, w]) => [k, { ...w, manual: wocheZusammenfassen(w.manual, laden) }]));
  return { ...s, weeks };
}

function learnedMap(v: unknown): ShoppingListStore["learned"] {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, { shop?: unknown; n?: unknown }>)
      .filter(([, x]) => x && typeof x.shop === "string" && typeof x.n === "number" && x.n > 0)
      .map(([k, x]) => [k, { shop: x.shop as string, n: Math.min(9, Math.round(x.n as number)) }]),
  );
}

function defaultBasics() {
  return DEFAULT_BASIC_NAMES.map((name) => ({ id: `standard-${name.toLowerCase()}`, name, amount: "", active: true }));
}

/** "Immer da" → Stammartikel mit festem Wochenrhythmus */
export function basicsToStaples(basics: { id: string; name: string; amount?: string; active?: boolean }[] | null): Staple[] {
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
