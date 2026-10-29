// Durchatmen pro Gerät (`wasgibts.durchatmen`, A-051): Art der Anleitung
// („Stimme + Klang“ Standard, „Nur Klang“, „Still“), Lieblinge, leises Angebot
// in der Jetzt-Karte an/aus, Stumm-Schalter-Hinweis schon gezeigt und welche
// Angebote heute schon standen (höchstens 2). Nichts sonst: keine Zeiten,
// keine Zähler, keine Aufnahme.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { UEBUNGEN } from "@/lib/durchatmen/uebungen";

export type Art = "stimme" | "klang" | "still";

export const ARTEN: { value: Art; label: string; hint: string }[] = [
  { value: "stimme", label: "Stimme + Klang", hint: "Ich sag kurz an, der Ton führt" },
  { value: "klang", label: "Nur Klang", hint: "Ton steigt beim Einatmen, fällt beim Ausatmen" },
  { value: "still", label: "Still", hint: "Nur Bild und leichtes Vibrieren" },
];

export type DurchatmenStand = {
  version: 1;
  art: Art;
  lieblinge: string[];
  /** Leises Angebot „Kurz durchatmen?“ in der Jetzt-Karte */
  angebot: boolean;
  /** „Für Ton bitte Stumm-Schalter aus.“ schon gezeigt (einmal je Gerät) */
  stummHinweis: boolean;
  /** Angebote heute (Tag + Anlässe), höchstens 2 */
  angebote: { tag: string; anlaesse: string[] };
};

export const START: DurchatmenStand = { version: 1, art: "stimme", lieblinge: [], angebot: true, stummHinweis: false, angebote: { tag: "", anlaesse: [] } };

const ARTEN_IDS = new Set<string>(ARTEN.map((a) => a.value));
const IDS = new Set(UEBUNGEN.map((u) => u.id));

export function migrateDurchatmen(raw: unknown): DurchatmenStand | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<Record<keyof DurchatmenStand, unknown>>;
  const angebote = d.angebote as { tag?: unknown; anlaesse?: unknown } | undefined;
  return {
    version: 1,
    art: typeof d.art === "string" && ARTEN_IDS.has(d.art) ? (d.art as Art) : "stimme",
    lieblinge: Array.isArray(d.lieblinge) ? [...new Set(d.lieblinge.filter((x): x is string => typeof x === "string" && IDS.has(x)))] : [],
    angebot: d.angebot !== false,
    stummHinweis: d.stummHinweis === true,
    angebote: {
      tag: typeof angebote?.tag === "string" ? angebote.tag : "",
      anlaesse: Array.isArray(angebote?.anlaesse) ? angebote.anlaesse.filter((x): x is string => typeof x === "string").slice(0, 2) : [],
    },
  };
}

const store = createLocalStore("wasgibts.durchatmen", migrateDurchatmen);

export const loadDurchatmen = (): DurchatmenStand => store.load() ?? START;

function aendern(f: (s: DurchatmenStand) => DurchatmenStand) {
  store.save(f(loadDurchatmen()));
}

export const setArt = (art: Art) => aendern((s) => ({ ...s, art }));
export const setAngebot = (angebot: boolean) => aendern((s) => ({ ...s, angebot }));
export const stummHinweisGesehen = () => aendern((s) => ({ ...s, stummHinweis: true }));

/** Herz: Liebling an/aus; liefert, ob es jetzt ein Liebling ist */
export function lieblingUmschalten(id: string): boolean {
  const an = !loadDurchatmen().lieblinge.includes(id);
  aendern((s) => ({ ...s, lieblinge: an ? [...s.lieblinge, id] : s.lieblinge.filter((x) => x !== id) }));
  return an;
}

/** Ein Angebot stand in der Jetzt-Karte (Anlass einmal je Tag merken) */
export function angebotGezeigt(anlass: string, tag: string) {
  aendern((s) => {
    const heute = s.angebote.tag === tag ? s.angebote.anlaesse : [];
    if (heute.includes(anlass)) return s;
    return { ...s, angebote: { tag, anlaesse: [...heute, anlass].slice(0, 2) } };
  });
}

/** Stand (`undefined` = lädt) */
export function useDurchatmen(): DurchatmenStand | undefined {
  const data = useExternalStore(store.subscribe, store.load, () => undefined);
  return data === undefined ? undefined : (data ?? START);
}
