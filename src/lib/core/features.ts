// Feature-Flags an EINER Stelle. Die App startet ruhig und leer; alles Alte
// aus der Koch-App bleibt im Code und in den Daten, ist aber versteckt. Der
// Schalter "Alte Funktionen anzeigen (Test)" in den Einstellungen blendet
// alles wieder ein (pro Gerät, `wasgibts.funktionen`). Neues startet ebenfalls
// versteckt und wird hier eingeschaltet, sobald es gebraucht wird.

import { useExternalStore } from "./useExternalStore";
import { createLocalStore } from "./localStore";

export const FEATURES = {
  wochenplan: "Wochenplan-Oberfläche (/wochenplan, Wochen-Check, Vorlagen)",
  vorrat: "Vorrat (/vorrat) und Vorrats-Hinweise",
  rezepte: "Rezepte (/kochbuch), Kochen Schritt für Schritt, Backstube",
  ideen: "Ideen-Seite und Ideen-Karte (\"Was gibt's heute?\")",
  tipps: "Tipp-Karten, Twists, Gesundheits-Tipps",
  joker: "Joker (noch nicht gebaut)",
  wochenendIdeen: "Wochenend-Ideen",
  modi: "Lotte-Modi (locker/normal/dranbleiben)",
  kochstil: "Kochstil-Seiten (Plan/spontan, nach Gefühl/Rezept, Wochenende)",
  kacheln: "Drei Kacheln auf der Startseite",
  spontan: "Knopf \"Spontan kochen\"",
  bewertungen: "Bewertungen nach dem Kochen",
  lottesPlatz: "Lottes Platz unter der Heute-Karte (Hinweise, Reste-Frage)",
  kennenlernen: "Kennenlernen-Chat (sonst Schnellstart)",
} as const;

export type Feature = keyof typeof FEATURES;

/** Dauerhaft eingeschaltet (unabhängig vom Test-Schalter) – hier freischalten, was gebraucht wird */
const ENABLED: Partial<Record<Feature, true>> = {};

type FeatureStore = { version: 1; legacy: boolean };

function migrate(raw: unknown): FeatureStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<FeatureStore>;
  return d.version === 1 ? { version: 1, legacy: d.legacy === true } : null;
}

const store = createLocalStore("wasgibts.funktionen", migrate);

/** Alles Alte wieder anzeigen (Test) – an/aus */
export function setLegacyFeatures(on: boolean) {
  store.save({ version: 1, legacy: on });
}

/** Ist eine Funktion sichtbar? (außerhalb von React) */
export function featureOn(feature: Feature): boolean {
  return ENABLED[feature] === true || store.load()?.legacy === true;
}

/** "Alte Funktionen anzeigen" an? (`undefined` = lädt) */
export function useLegacyFeatures(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : data?.legacy === true;
}

/** Ist eine Funktion sichtbar? (`undefined` = lädt) */
export function useFeature(feature: Feature): boolean | undefined {
  const legacy = useLegacyFeatures();
  if (ENABLED[feature]) return true;
  return legacy;
}
