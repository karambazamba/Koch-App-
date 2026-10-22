// Einkaufsliste: Stammliste – häufig gekaufte Artikel mit festem oder aus
// den Käufen gelerntem Kaufrhythmus (früher "Immer da").

import { sectionFor } from "@/lib/einkauf/sections";
import { EMPTY_LIST, lower, newId, type ListItem, type ShoppingList, type Staple, type WeekList } from "@/lib/einkauf/listModel";
import { loadShoppingSettings, update } from "@/lib/einkauf/listStore";

const DAY = 86_400_000;
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / DAY);

/** Kauf merken bzw. (beim Zurücknehmen) heutigen Kauf wieder entfernen */
export function recordPurchase(item: ListItem, bought: boolean, today: string) {
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

export function addStaple(name: string, amount = "", intervalDays = 7) {
  const clean = name.trim();
  if (!clean) return;
  update((s) => {
    const existing = s.staples.find((st) => lower(st.name) === lower(clean));
    if (existing) return { ...s, staples: s.staples.map((st) => (st === existing ? { ...st, active: true, intervalDays: st.intervalDays ?? intervalDays } : st)) };
    return { ...s, staples: [...s.staples, { id: newId(), name: clean, amount: amount.trim(), section: sectionFor(clean), purchases: [], intervalDays, active: true }] };
  });
}

function updateStaple(id: string, changes: Partial<Omit<Staple, "id">>) {
  update((s) => ({ ...s, staples: s.staples.map((st) => (st.id === id ? { ...st, ...changes } : st)) }));
}

/** Aus der Stammliste nehmen (wird nicht mehr vorgeschlagen); liefert das Zurücknehmen */
export function removeStaple(id: string): () => void {
  const before = loadShoppingSettings().staples.find((st) => st.id === id);
  updateStaple(id, { active: false, intervalDays: null, purchases: [] });
  return () => {
    if (before) updateStaple(id, { active: before.active, intervalDays: before.intervalDays, purchases: before.purchases });
  };
}
