// Essen – die nächsten 7 Tage: Liste (Standard) oder Reihe aus runden
// Bildern; die Wahl wird pro Gerät gemerkt (`wasgibts.essenansicht` v1).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type EssenAnsicht = "liste" | "reihe";

type Store = { version: 1; ansicht: EssenAnsicht };

const store = createLocalStore("wasgibts.essenansicht", (raw: unknown): Store | null =>
  raw && typeof raw === "object" && (raw as Store).version === 1 ? { version: 1, ansicht: (raw as Store).ansicht === "reihe" ? "reihe" : "liste" } : null,
);

export const setEssenAnsicht = (ansicht: EssenAnsicht) => store.save({ version: 1, ansicht });

export function useEssenAnsicht(): EssenAnsicht {
  return useExternalStore(store.subscribe, () => store.load()?.ansicht ?? "liste", () => "liste");
}
