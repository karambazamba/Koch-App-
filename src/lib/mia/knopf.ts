// Wo der Mia-Knopf sitzt (Tafel 81/82, Punkt 7): rechts unten, für
// Linkshänder auf Wunsch links. Pro Gerät (`wasgibts.miaknopf` v1).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

type KnopfStore = { version: 1; links: boolean };

const migrateKnopf = (raw: unknown): KnopfStore | null =>
  raw && typeof raw === "object" && (raw as KnopfStore).version === 1 ? { version: 1, links: (raw as KnopfStore).links === true } : null;

const store = createLocalStore("wasgibts.miaknopf", migrateKnopf);

export const setKnopfLinks = (links: boolean) => store.save({ version: 1, links });

export function useKnopfLinks(): boolean {
  return useExternalStore(store.subscribe, () => store.load()?.links ?? false, () => false);
}
