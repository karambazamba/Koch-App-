// Bausteine: Es gibt nur noch EIN Design. Zusätzliche Funktionen sind
// Bausteine, die man in den Einstellungen ("Bausteine – Was <Name> noch kann")
// oder per Gespräch an- und ausschaltet; eingeschaltet fügen sie sich in das
// neue Design ein (Abschnitte auf der Essen-Seite, Kachel auf "Heute",
// Lottes Satz). Daten bleiben immer erhalten – aus heißt nur ausgeblendet.
//
// Der frühere Schalter "Alte Funktionen anzeigen (Test)" und der Alt-Modus
// (/?legacy=1) sind weg.

import { useExternalStore } from "./useExternalStore";
import { createLocalStore } from "./localStore";

export const FEATURES = {
  wochenplan: "Wochenplan-Oberfläche (/wochenplan, Wochen-Check, Vorlagen)",
  vorrat: "Vorrat (/vorrat) und Vorrats-Hinweise",
  rezepte: "Rezepte (/kochbuch), Kochen Schritt für Schritt",
  backen: "Backstube mit Timern (eingebaute Backrezepte, Zusammen backen)",
  ideen: "Ideen-Seite (\"Was gibt’s heute?\") – kommt mit dem Baustein Spontan-Ideen",
  spontan: "Spontan kochen – Ideen aus dem, was da ist",
  tipps: "Tipps, Twists, Gesundheits-Tipps",
  wochenendIdeen: "Wochenend-Ideen",
  kochstil: "Kochstil & Vorlieben (Plan/spontan, Das mögt ihr, Nie wieder …)",
  modi: "Wie oft sich die Assistentin meldet, Pause",
} as const;

export type Feature = keyof typeof FEATURES;

/** Bausteine, die man selbst schalten kann – mit Satz und wo sie erscheinen */
export type Baustein = { feature: Feature; name: string; text: string; where: string; icon: string };

export const BAUSTEINE: Baustein[] = [
  { feature: "wochenplan", name: "Wochenplan", text: "Gerichte für die ganze Woche planen – mit Vorgaben und Vorlagen.", where: "Der Wochenplan steht jetzt rechts unter Essen.", icon: "calendar" },
  { feature: "vorrat", name: "Vorrat & Tiefkühler", text: "Merken, was im Kühlschrank, Tiefkühler und Schrank ist.", where: "Der Vorrat steht jetzt rechts unter Essen – und als Kachel auf Heute.", icon: "fridge" },
  { feature: "rezepte", name: "Rezepte", text: "Eure eigenen Rezepte sammeln und Schritt für Schritt kochen.", where: "Eure Rezepte stehen jetzt rechts unter Essen.", icon: "book" },
  { feature: "backen", name: "Backen mit Timern", text: "20 Familien-Backrezepte, zusammen backen mit Timer und Kinder-Schritten.", where: "Backen steht jetzt rechts unter Essen.", icon: "cake" },
  { feature: "spontan", name: "Spontan-Ideen", text: "Ideen aus dem, was gerade da ist – ohne Planen.", where: "Spontan kochen steht jetzt rechts unter Essen.", icon: "carrot" },
  { feature: "tipps", name: "Tipps", text: "Ab und zu ein kleiner Küchen-Tipp – oben auf Heute.", where: "Tipps kommen ab jetzt ab und zu oben auf Heute.", icon: "bulb" },
  { feature: "wochenendIdeen", name: "Wochenend-Ideen", text: "Freitags bis sonntags eine Idee fürs Wochenende – oben auf Heute.", where: "Wochenend-Ideen kommen ab jetzt freitags bis sonntags oben auf Heute.", icon: "sun" },
  { feature: "kochstil", name: "Kochstil & Vorlieben", text: "Plan oder spontan, Das mögt ihr, Nie wieder, Lieblingsgerichte.", where: "Kochstil & Vorlieben stehen jetzt in den Einstellungen.", icon: "chef" },
  { feature: "modi", name: "Wie oft melde ich mich?", text: "Ganz locker bis Dranbleiben – und Pausen planen.", where: "Das steht jetzt in den Einstellungen.", icon: "message" },
];

export const bausteinOf = (feature: Feature) => BAUSTEINE.find((b) => b.feature === feature);

/** Dauerhaft eingeschaltet – hier freischalten, was immer gebraucht wird */
const ENABLED: Partial<Record<Feature, true>> = {};

/** v2: eingeschaltete Bausteine. v1 hatte `legacy` (alter Test-Schalter) und `unlocked`. */
type FeatureStore = { version: 2; on: Feature[] };

const isFeature = (f: unknown): f is Feature => typeof f === "string" && f in FEATURES;

/** Was wurde schon genutzt? (für die Übernahme beim Abschalten des alten Test-Schalters) */
function usedFeatures(): Feature[] {
  const read = (key: string): unknown => {
    try {
      return JSON.parse(localStorage.getItem(key) ?? "null");
    } catch {
      return null;
    }
  };
  const used: Feature[] = [];
  const plan = read("wasgibts.wochenplan") as { weeks?: Record<string, Record<string, { kind?: string }>> } | null;
  if (Object.values(plan?.weeks ?? {}).some((w) => Object.values(w ?? {}).some((e) => e?.kind === "recipe" || e?.kind === "text"))) used.push("wochenplan");
  const pantry = read("wasgibts.vorrat") as { items?: unknown[] } | null;
  if ((pantry?.items?.length ?? 0) > 0) used.push("vorrat");
  const book = read("wasgibts.kochbuch") as { recipes?: Record<string, { kind?: string }> } | null;
  const recipes = Object.values(book?.recipes ?? {});
  if (recipes.length) used.push("rezepte");
  if (recipes.some((r) => r?.kind === "backen")) used.push("backen");
  if (read("wasgibts.tippkarten")) used.push("tipps");
  if (read("wasgibts.ideen") || read("wasgibts.wuensche")) used.push("spontan");
  const profile = read("familienkueche.haushaltsprofil") as { likes?: Record<string, number>; neverAgain?: unknown[]; helperMode?: string } | null;
  if (Object.keys(profile?.likes ?? {}).length || (profile?.neverAgain?.length ?? 0) > 0) used.push("kochstil");
  if (profile?.helperMode && profile.helperMode !== "normal") used.push("modi");
  return used;
}

function migrate(raw: unknown): FeatureStore | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as { version?: number; legacy?: unknown; unlocked?: unknown; on?: unknown };
  if (d.version === 2) return { version: 2, on: (Array.isArray(d.on) ? d.on : []).filter(isFeature) };
  if (d.version !== 1) return null;
  // Alter Test-Schalter: wird zurückgesetzt; was genutzt wurde, wird als Baustein übernommen
  const unlocked = (Array.isArray(d.unlocked) ? d.unlocked : []).filter(isFeature);
  const used = d.legacy === true && typeof localStorage !== "undefined" ? usedFeatures() : [];
  return { version: 2, on: [...new Set([...unlocked, ...used])] };
}

const store = createLocalStore("wasgibts.funktionen", migrate);
const EMPTY: Feature[] = [];

// --- Abfragen ------------------------------------------------------------------------

const onList = () => store.load()?.on ?? EMPTY;

const isOn = (feature: Feature, on: Feature[]) =>
  ENABLED[feature] === true || on.includes(feature) || (feature === "ideen" && on.includes("spontan"));

/** Ist eine Funktion an? (außerhalb von React) */
export function featureOn(feature: Feature): boolean {
  return isOn(feature, onList());
}

/** Baustein an- oder ausschalten; liefert true, wenn sich etwas geändert hat */
export function setFeature(feature: Feature, on: boolean): boolean {
  const list = onList();
  if (list.includes(feature) === on) return false;
  store.save({ version: 2, on: on ? [...list, feature] : list.filter((f) => f !== feature) });
  return true;
}

/**
 * Baustein einschalten, weil Lotte die Funktion genutzt hat ("Alles, was
 * Lotte anlegt, muss ich sehen können"). Liefert true, wenn er vorher aus war.
 */
export function unlockFeature(feature: Feature): boolean {
  if (featureOn(feature)) return false;
  return setFeature(feature, true);
}

/** Eingeschaltete Bausteine (`undefined` = lädt) */
export function useBausteine(): Feature[] | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data?.on ?? EMPTY);
}

/** Ist eine Funktion an? (`undefined` = lädt) */
export function useFeature(feature: Feature): boolean | undefined {
  const on = useBausteine();
  if (ENABLED[feature]) return true;
  if (on === undefined) return undefined;
  return isOn(feature, on);
}
