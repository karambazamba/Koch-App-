// Pinnwand pro Gerät (`wasgibts.pinnwandansicht` v1): ob die Ecke „Nur für
// mich“ zugeklappt ist (Standard: aufgeklappt). Nicht in der Sicherung und
// nicht im Abgleich – das ist eine Ansicht dieses Handys, keine Familien-Daten.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

type Store = { version: 1; privatZu: boolean };

/** Rein: gespeicherten Stand lesen (alles Unbekannte = aufgeklappt) */
export const migratePinnwandAnsicht = (raw: unknown): Store | null =>
  raw && typeof raw === "object" && (raw as Store).version === 1 ? { version: 1, privatZu: (raw as Store).privatZu === true } : null;

const store = createLocalStore("wasgibts.pinnwandansicht", migratePinnwandAnsicht);

export const loadPrivatZu = () => store.load()?.privatZu ?? false;

export const setPrivatZu = (privatZu: boolean) => store.save({ version: 1, privatZu });

export function usePrivatZu(): boolean {
  return useExternalStore(store.subscribe, loadPrivatZu, () => false);
}
