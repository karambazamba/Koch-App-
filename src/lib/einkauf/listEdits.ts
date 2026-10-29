// Einkaufsliste: Ändern der Wochenlisten (abhaken – Gekauftes wandert nach
// „Im Haus“, auf der Laden-Seite erst mit „Einkauf fertig“ –, eigene Artikel,
// "Haben wir schon", Stammartikel übernehmen) und eigene Produkte ("Immer so").
// Neues, das schon offen draufsteht (gleiche Sache im selben Laden), wird
// zusammengefasst (Nachtrag A-018): die Kennung, die `addManualItem` dann
// liefert, steht für „dazugekommen“ – Entfernen damit nimmt nur die
// dazugekommene Menge wieder heraus.

import { lower, newId, EMPTY_LIST, type ListItem, type ManualItem, type Staple, type WeekList } from "@/lib/einkauf/listModel";
import { store, update, updateList } from "@/lib/einkauf/listStore";
import { recordPurchase } from "@/lib/einkauf/staples";
import { boughtToHouse, unboughtFromHouse } from "@/lib/vorrat/kreislauf";
import { shopChoice } from "@/lib/einkauf/shopRules";
import { aufnehmen, zielFuer } from "@/lib/einkauf/zusammen/zusammen";

/**
 * Abhaken; beim Abhaken lernt die Stammliste den Kauf (`today` = "YYYY-MM-DD").
 * `imHaus: false` (Laden-Seite): noch nicht nach „Im Haus“ – das macht „Einkauf fertig“.
 * Zusammengefasste Teile (`teile`) werden mit abgehakt.
 */
export function toggleChecked(weekStart: string, item: ListItem, today?: string, options: { imHaus?: boolean } = {}) {
  const done = !item.checked;
  const ids = new Set([...(item.manualId ? [item.manualId] : []), ...(item.teile ?? [])]);
  updateList(weekStart, (l) => {
    const manual = ids.size ? l.manual.map((m) => (ids.has(m.id) ? { ...m, done } : m)) : l.manual;
    const checked = item.manualId ? l.checked : done ? [...l.checked.filter((k) => k !== item.key), item.key] : l.checked.filter((k) => k !== item.key);
    // Haken weg = wieder offen, auch nach „Einkauf fertig“
    const keys = alleSchluessel(item);
    const fertig = !done && l.fertig?.some((k) => keys.includes(k)) ? l.fertig.filter((k) => !keys.includes(k)) : l.fertig;
    return { ...l, manual, checked, ...(fertig ? { fertig } : {}) };
  });
  if (today) {
    recordPurchase(item, done, today);
    // Kreislauf Einkauf ↔ Im Haus: gekauft → rein, Haken weg → wieder raus
    if (options.imHaus === false) return;
    if (done) boughtToHouse(item.name, today);
    else unboughtFromHouse(item.name, today);
  }
}

/** Schlüssel einer Zeile samt zusammengefasster Teile */
export const alleSchluessel = (item: Pick<ListItem, "key" | "teile">) => [item.key, ...(item.teile ?? []).map((id) => `m:${id}`)];

/**
 * „Einkauf fertig“: die abgehakten Artikel verlassen „Im Wagen“ (gemerkt
 * in `fertig`). Liefert Rückgängig (wieder im Wagen).
 */
export function markFertig(weekStart: string, keys: string[]): () => void {
  if (!keys.length) return () => {};
  updateList(weekStart, (l) => ({ ...l, fertig: [...new Set([...(l.fertig ?? []), ...keys])] }));
  return () => updateList(weekStart, (l) => ({ ...l, fertig: (l.fertig ?? []).filter((k) => !keys.includes(k)) }));
}

export function setHave(weekStart: string, key: string, have: boolean) {
  updateList(weekStart, (l) => ({
    ...l,
    have: have ? [...l.have.filter((k) => k !== key), key] : l.have.filter((k) => k !== key),
  }));
}

/** Zusammengefasst: Kennung des Hinzufügens → Ziel und Stand davor (nur für Rückgängig in dieser Sitzung) */
const dazu = new Map<string, { weekStart: string; ziel: string; vorher: ManualItem; nachher: ManualItem }>();

/** Laden eines Namens wie auf der Liste (eigenes Produkt, feste Regel, gemerkt) */
function ladenVon(name: string): string | null {
  const s = store.load();
  if (!s) return null;
  return shopChoice(s.products[lower(name)] ?? name, s);
}

/**
 * Eigenen Artikel hinzufügen; gibt seine ID zurück (für "Rückgängig"). Steht
 * dieselbe Sache im selben Laden schon offen drauf, kommt sie dort dazu
 * (Mengen addiert) – die gelieferte Kennung nimmt beim Entfernen nur das wieder heraus.
 */
export function addManualItem(weekStart: string, item: Omit<ManualItem, "id" | "done">): string {
  const id = newId();
  const ziel = zielFuer(store.load()?.weeks[weekStart]?.manual ?? [], item.name, ladenVon);
  if (ziel) {
    const nachher = aufnehmen(ziel, item);
    dazu.set(id, { weekStart, ziel: ziel.id, vorher: ziel, nachher });
    updateList(weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === ziel.id ? nachher : m)) }));
    return id;
  }
  updateList(weekStart, (l) => ({ ...l, manual: [...l.manual, { ...item, id, done: false }] }));
  return id;
}

/** Zusammengefasstes Hinzufügen zurücknehmen: das Ziel wie vorher (Menge, Felder) */
function dazuZurueck(id: string): boolean {
  const d = dazu.get(id);
  if (!d) return false;
  dazu.delete(id);
  updateList(d.weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === d.ziel ? { ...d.vorher, done: m.done } : m)) }));
  return true;
}

/** Kennung auflösen: zusammengefasst → das Ziel */
const echteId = (id: string) => dazu.get(id)?.ziel ?? id;

/**
 * Spontan gibt es keine Planungswochen: offene eigene Artikel aus früheren
 * Wochen wandern in die laufende Woche, damit nichts verschwindet.
 */
export function carryOverManual(weekStart: string) {
  const current = store.load();
  if (!current) return;
  const older = Object.entries(current.weeks).filter(([key, w]) => key < weekStart && w.manual.some((m) => !m.done));
  if (!older.length) return;
  const weeks = { ...current.weeks };
  const moving: ManualItem[] = [];
  for (const [key, w] of older) {
    moving.push(...w.manual.filter((m) => !m.done).map(({ day: _day, ...m }) => (void _day, m)));
    weeks[key] = { ...w, manual: w.manual.filter((m) => m.done) };
  }
  const target = weeks[weekStart] ?? EMPTY_LIST;
  weeks[weekStart] = { ...target, manual: [...target.manual, ...moving] };
  store.save({ ...current, weeks });
}

/** Mehrere eigene Artikel auf einmal entfernen (Rückgängig) */
export function removeManualItems(weekStart: string, ids: string[]) {
  const rest = ids.filter((id) => !dazuZurueck(id));
  if (rest.length) updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => !rest.includes(m.id)) }));
}

export function updateManualItem(weekStart: string, id: string, changes: Partial<Omit<ManualItem, "id">>) {
  const real = echteId(id);
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === real ? { ...m, ...changes } : m)) }));
}

/** Eigenen Artikel löschen; liefert das Zurücknehmen (gleiche Stelle, gleiche Kennung) */
export function removeManualItem(weekStart: string, id: string): () => void {
  const merged = dazu.get(id);
  if (merged && dazuZurueck(id)) {
    return () => {
      dazu.set(id, merged);
      updateList(weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === merged.ziel ? { ...merged.nachher, done: m.done } : m)) }));
    };
  }
  let removed: { item: ManualItem; index: number } | null = null;
  updateList(weekStart, (l) => {
    const index = l.manual.findIndex((m) => m.id === id);
    if (index >= 0) removed = { item: l.manual[index], index };
    return { ...l, manual: l.manual.filter((m) => m.id !== id) };
  });
  return () => {
    const back = removed as { item: ManualItem; index: number } | null;
    if (!back) return;
    updateList(weekStart, (l) => (l.manual.some((m) => m.id === id) ? l : { ...l, manual: [...l.manual.slice(0, back.index), back.item, ...l.manual.slice(back.index)] }));
  };
}

/** Alle Listen auf einmal ersetzen (Küchenhelfer: Übernehmen/Rückgängig) */
export function replaceShoppingLists(weeks: Record<string, WeekList>) {
  update((s) => ({ ...s, weeks }));
}

/** Stammartikel-Vorschlag übernehmen → als Artikel dieser Woche */
export function takeStaple(weekStart: string, staple: Staple) {
  addManualItem(weekStart, { name: staple.name, amount: staple.amount, section: staple.section });
}

/** Stammartikel "Diesmal nicht" */
export function skipStaple(weekStart: string, staple: Staple) {
  updateList(weekStart, (l) => ({ ...l, skippedStaples: [...(l.skippedStaples ?? []), staple.id] }));
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
