// Einkaufsliste: Migration des gespeicherten Stands (v1–v7 → v8). Die frühere
// "Immer da"-Liste wird dabei zu Stammartikeln mit festem Wochenrhythmus; v5 → v6
// bekommt leere feste Laden-Regeln, nichts Gelerntes, keine „hat man da“-Ausnahmen;
// v6 → v7 fasst doppelte offene eigene Artikel zusammen (gleiche Sache im selben
// Laden, Mengen addiert – nichts geht verloren, `einkauf/zusammen`);
// v7 → v8 (A-040/A-041): Gelerntes bekommt ein Datum (heute, damit die
// 90-Tage-Regel ab jetzt zählt), Wochenplan-Zutaten werden ab übernächster
// Woche ein Angebot (was bisher von selbst auf der Liste stand, bleibt dort:
// `angebotAb`), und von uns gerundete Packungsmengen an Rezept-Zutaten fallen
// als Menge weg (die Rezeptmenge bleibt als Hinweis, eigene Mengen bleiben).

import { SECTION_VALUES, sectionFor } from "@/lib/einkauf/sections";
import { wocheZusammenfassen } from "@/lib/einkauf/zusammen/zusammen";
import { newId, type Gelernt, type ManualItem, type ShoppingListStore, type Staple, type WeekList } from "@/lib/einkauf/listModel";
import { addDays, todayIso } from "@/lib/core/now";
import { packungAus } from "@/lib/einkauf/zusammen/packung";

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
  const empty: ShoppingListStore = { version: 8, weeks: {}, products: {}, shops: [], itemShops: {}, staples: [], myShops: [], shopsAsked: false, shopRules: {}, learned: {}, learnAsked: [], alwaysList: [], angebotAb: "" };
  // v1 war nur ein Datenmodell ohne Seite – es gibt dort keine echten Daten.
  if (data.version === 1) return { ...empty, staples: basicsToStaples(null) };
  if (![2, 3, 4, 5, 6, 7, 8].includes(data.version as number) || !data.weeks || typeof data.weeks !== "object") return null;
  const modern = (data.version as number) >= 4;
  const v8 = data.version === 8;
  const heute = todayIso();
  // v7 → v8: diese und die nächste Planungswoche rechnen wie bisher von selbst (nichts verschwindet von der Liste)
  const legacy = { ...empty, angebotAb: addDays(heute, 8) };

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
    const manual = v8 ? migrateManual(w.manual) : migrateManual(w.manual).map(ohnePackungsMenge);
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

  if (!modern) return zusammenfassen({ ...legacy, weeks, staples: basicsToStaples(basics) });

  // v4 → v5: „Meine Läden“ leer, Frage noch offen (die Karte zeigt sich einmal, Läden an Artikeln vorausgewählt)
  // v5 → v6: keine festen Regeln, nichts gelernt, keine Ausnahmen
  const v4 = raw as Partial<ShoppingListStore>;
  const v5 = (data.version as number) >= 5;
  const v6 = (data.version as number) >= 6;
  const next: ShoppingListStore = {
    version: 8,
    myShops: v5 ? strings(v4.myShops) : [],
    shopsAsked: v5 && v4.shopsAsked === true,
    shopRules: v6 ? stringMap(v4.shopRules) : {},
    learned: v6 ? learnedMap(v4.learned, v8 ? null : heute) : {},
    learnAsked: v6 ? strings(v4.learnAsked) : [],
    alwaysList: v6 ? strings(v4.alwaysList) : [],
    angebotAb: v8 ? (typeof v4.angebotAb === "string" ? v4.angebotAb : "") : legacy.angebotAb,
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
  return (data.version as number) >= 7 ? next : zusammenfassen(next);
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

/** Gelerntes lesen; `seit` = Datum für Einträge ohne Datum (v7 → v8), `null` = so lassen */
function learnedMap(v: unknown, seit: string | null): ShoppingListStore["learned"] {
  if (!v || typeof v !== "object") return {};
  return Object.fromEntries(
    Object.entries(v as Record<string, { shop?: unknown; n?: unknown; am?: unknown }>)
      .filter(([, x]) => x && typeof x.shop === "string" && typeof x.n === "number" && x.n > 0)
      .map(([k, x]): [string, Gelernt] => {
        const am = typeof x.am === "string" && /^\d{4}-\d{2}-\d{2}$/.test(x.am) ? x.am : seit;
        return [k, { shop: x.shop as string, n: Math.min(99, Math.round(x.n as number)), ...(am ? { am } : {}) }];
      }),
  );
}

/**
 * v7 → v8: bei Rezept-Zutaten (mit `rezeptMenge`) war die Menge unsere
 * gerundete Packung – die fällt weg. Hat jemand sie selbst geändert, bleibt sie.
 */
function ohnePackungsMenge(m: ManualItem): ManualItem {
  if (!m.rezeptMenge || !m.amount) return m;
  return m.amount === packungAus(m.name, m.rezeptMenge) ? { ...m, amount: "" } : m;
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
