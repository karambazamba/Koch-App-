// Einkaufsliste: Migration des gespeicherten Stands (v1–v3 → v4). Die frühere
// "Immer da"-Liste wird dabei zu Stammartikeln mit festem Wochenrhythmus.

import { SECTION_VALUES, sectionFor } from "./sections";
import { newId, type ManualItem, type ShoppingListStore, type Staple, type WeekList } from "./listModel";

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
    }));
}

export function migrateStore(raw: unknown): ShoppingListStore | null {
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
