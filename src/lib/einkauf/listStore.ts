// Einkaufsliste: der eine Speicher ("wasgibts.einkaufsliste") mit Ändern,
// Hooks und den Haushalts-Einstellungen (Produkte, Läden, Stammliste).

import { useExternalStore } from "../core/useExternalStore";
import { noteUserAction, todayIso } from "../core/activity";
import { createLocalStore } from "../core/localStore";
import { basicsToStaples, migrateStore } from "./listMigration";
import { EMPTY_LIST, type ShoppingListStore, type ShoppingSettings, type WeekList } from "./listModel";

export const store = createLocalStore("wasgibts.einkaufsliste", migrateStore);
const EMPTY_WEEKS: Record<string, WeekList> = {};

const emptyStore = (): ShoppingListStore => ({
  version: 4,
  weeks: {},
  products: {},
  shops: [],
  itemShops: {},
  staples: basicsToStaples(null),
});

export function update(change: (s: ShoppingListStore) => ShoppingListStore) {
  store.save(change(store.load() ?? emptyStore()));
}

export function updateList(weekStart: string, change: (list: WeekList) => WeekList) {
  update((s) => ({ ...s, weeks: { ...s.weeks, [weekStart]: change(s.weeks[weekStart] ?? EMPTY_LIST) } }));
  noteUserAction(todayIso());
}

// --- Hooks ----------------------------------------------------------------------

/** Gespeicherte Listen aller Wochen (`undefined` = noch nicht geladen) */
export function useShoppingLists(): Record<string, WeekList> | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data?.weeks ?? EMPTY_WEEKS;
}

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

/** Produkte, Läden, Stammliste ohne Hook (Regeln im Gespräch) */
export const loadShoppingSettings = (): ShoppingSettings => settingsOf(store.load());
