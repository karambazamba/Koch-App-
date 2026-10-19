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

/** `unlocked`: einzeln freigeschaltet, weil Lotte die Funktion genutzt hat (z. B. Wochenplan angelegt) */
type FeatureStore = { version: 1; legacy: boolean; unlocked?: Feature[] };

function migrate(raw: unknown): FeatureStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<FeatureStore>;
  if (d.version !== 1) return null;
  const unlocked = (Array.isArray(d.unlocked) ? d.unlocked : []).filter((f): f is Feature => f in FEATURES);
  return { version: 1, legacy: d.legacy === true, ...(unlocked.length ? { unlocked } : {}) };
}

const store = createLocalStore("wasgibts.funktionen", migrate);

/** Alles Alte wieder anzeigen (Test) – an/aus */
export function setLegacyFeatures(on: boolean) {
  store.save({ ...(store.load() ?? { version: 1 }), version: 1, legacy: on });
}

/**
 * Funktion dauerhaft einblenden, weil Lotte sie genutzt hat ("Alles, was
 * Lotte anlegt, muss ich sehen können"). Liefert true, wenn sie vorher
 * versteckt war.
 */
export function unlockFeature(feature: Feature): boolean {
  if (featureOn(feature)) return false;
  const current = store.load() ?? { version: 1 as const, legacy: false };
  store.save({ ...current, unlocked: [...(current.unlocked ?? []), feature] });
  return true;
}

/** Ist eine Funktion sichtbar? (außerhalb von React) */
export function featureOn(feature: Feature): boolean {
  const data = store.load();
  return ENABLED[feature] === true || data?.legacy === true || Boolean(data?.unlocked?.includes(feature));
}

/** "Alte Funktionen anzeigen" an? (`undefined` = lädt) */
export function useLegacyFeatures(): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : data?.legacy === true;
}

/** Ist eine Funktion sichtbar? (`undefined` = lädt) */
export function useFeature(feature: Feature): boolean | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  if (ENABLED[feature]) return true;
  if (data === undefined) return undefined;
  return data?.legacy === true || Boolean(data?.unlocked?.includes(feature));
}
