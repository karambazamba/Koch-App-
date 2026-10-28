// Rezeptseite „So geht’s“: Kurz (Schnellanleitung, Standard beim ersten Mal)
// oder Ausführlich – die letzte Wahl wird pro Gerät gemerkt
// (`wasgibts.rezeptansicht` v1, nicht in der Sicherung – wie die Ansicht der
// nächsten 7 Tage ist das eine Vorliebe des Geräts, keine Familien-Daten).

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type RezeptAnsicht = "kurz" | "lang";

type Store = { version: 1; ansicht: RezeptAnsicht };

const store = createLocalStore("wasgibts.rezeptansicht", (raw: unknown): Store | null =>
  raw && typeof raw === "object" && (raw as Store).version === 1 ? { version: 1, ansicht: (raw as Store).ansicht === "lang" ? "lang" : "kurz" } : null,
);

export const setRezeptAnsicht = (ansicht: RezeptAnsicht) => store.save({ version: 1, ansicht });

/** Gemerkte Wahl – ohne Wahl „kurz“ @public (Tests) */
export const loadRezeptAnsicht = (): RezeptAnsicht => store.load()?.ansicht ?? "kurz";

export function useRezeptAnsicht(): RezeptAnsicht {
  return useExternalStore(store.subscribe, loadRezeptAnsicht, () => "kurz");
}
