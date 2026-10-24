// Einkaufsliste: Ändern der Wochenlisten (abhaken – Gekauftes wandert nach
// „Im Haus“ –, eigene Artikel, "Haben wir
// schon", Stammartikel übernehmen) und eigene Produkte ("Immer so").

import { lower, newId, EMPTY_LIST, type ListItem, type ManualItem, type Staple, type WeekList } from "@/lib/einkauf/listModel";
import { store, update, updateList } from "@/lib/einkauf/listStore";
import { recordPurchase } from "@/lib/einkauf/staples";
import { boughtToHouse, unboughtFromHouse } from "@/lib/vorrat/kreislauf";

const toggle = (list: string[], key: string) =>
  list.includes(key) ? list.filter((k) => k !== key) : [...list, key];

/** Abhaken; beim Abhaken lernt die Stammliste den Kauf (`today` = "YYYY-MM-DD") */
export function toggleChecked(weekStart: string, item: ListItem, today?: string) {
  updateList(weekStart, (l) =>
    item.manualId
      ? { ...l, manual: l.manual.map((m) => (m.id === item.manualId ? { ...m, done: !m.done } : m)) }
      : { ...l, checked: toggle(l.checked, item.key) },
  );
  if (today) {
    recordPurchase(item, !item.checked, today);
    // Kreislauf Einkauf ↔ Im Haus: gekauft → rein, Haken weg → wieder raus
    if (!item.checked) boughtToHouse(item.name, today);
    else unboughtFromHouse(item.name, today);
  }
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
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.filter((m) => !ids.includes(m.id)) }));
}

export function updateManualItem(weekStart: string, id: string, changes: Partial<Omit<ManualItem, "id">>) {
  updateList(weekStart, (l) => ({ ...l, manual: l.manual.map((m) => (m.id === id ? { ...m, ...changes } : m)) }));
}

/** Eigenen Artikel löschen; liefert das Zurücknehmen (gleiche Stelle, gleiche Kennung) */
export function removeManualItem(weekStart: string, id: string): () => void {
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
