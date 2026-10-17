// Einkaufsliste – vorerst nur das Datenmodell (die Seite folgt). Gespeichert
// lokal über localStore wie Profil und Kochbuch, später Supabase.

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./localStore";

export type ShoppingItem = {
  id: string;
  name: string;
  /** Menge als Freitext, z. B. "500 g" */
  amount: string;
  done: boolean;
};

type ShoppingListStore = { version: 1; items: ShoppingItem[] };

function migrateStore(raw: unknown): ShoppingListStore | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { version?: number; items?: unknown };
  if (data.version !== 1 || !Array.isArray(data.items)) return null;
  const items = data.items
    .filter((i): i is Partial<ShoppingItem> => Boolean(i) && typeof i === "object")
    .filter((i) => typeof i.id === "string" && typeof i.name === "string")
    .map((i) => ({
      id: i.id!,
      name: i.name!,
      amount: typeof i.amount === "string" ? i.amount : "",
      done: i.done === true,
    }));
  return { version: 1, items };
}

const store = createLocalStore("wasgibts.einkaufsliste", migrateStore);

/** Anzahl noch nicht abgehakter Einträge (`undefined` = noch nicht geladen) */
export function useOpenShoppingCount(): number | undefined {
  const data = useSyncExternalStore(store.subscribe, store.load, () => undefined);
  if (data === undefined) return undefined;
  return data ? data.items.filter((i) => !i.done).length : 0;
}
