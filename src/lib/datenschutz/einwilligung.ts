// Einwilligungen (Platz 23): KI („darf mitdenken“, freiwillig), Bedingungen
// (Pflicht beim Anmelden – vor dem ersten Speichern auf dem Server), Mails an
// Mia. Je Gerät gespeichert (nicht in der Sicherung: jede Person stimmt selbst
// zu), mit Konto zusätzlich in der Tabelle `einwilligungen` (Nachweis). Ändert
// sich ein Text wesentlich, steigt `TEXT_VERSION` – dann wird einmal neu
// gefragt. Widerruf wirkt sofort.

import { createLocalStore } from "@/lib/core/localStore";
import { RECHTSTEXTE_STAND } from "@/lib/datenschutz/rechtstexte";
import { nowIso } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type EinwilligungArt = "ki" | "bedingungen" | "mails";

/** Stand der Texte je Art (bei wesentlicher Änderung erhöhen; KI 2 = mit Sprach-Anbieter ElevenLabs); Bedingungen = Stand der Rechtstexte */
export const TEXT_VERSION: Record<EinwilligungArt, number> = { ki: 2, bedingungen: RECHTSTEXTE_STAND.version, mails: 1 };

export type Einwilligung = { ja: boolean; version: number; at: string };
type Store = { version: 1; arten: Partial<Record<EinwilligungArt, Einwilligung>> };

const ARTEN: EinwilligungArt[] = ["ki", "bedingungen", "mails"];

/** Gespeicherten Stand lesen (Fremdes wird verworfen) @public für Tests */
export function migrateEinwilligungen(raw: unknown): Store | null {
  if (!raw || typeof raw !== "object" || (raw as { version?: unknown }).version !== 1) return null;
  const arten: Store["arten"] = {};
  const src = (raw as { arten?: Record<string, unknown> }).arten ?? {};
  for (const a of ARTEN) {
    const e = src[a] as Partial<Einwilligung> | undefined;
    if (e && typeof e.ja === "boolean" && typeof e.version === "number" && typeof e.at === "string") arten[a] = { ja: e.ja, version: e.version, at: e.at };
  }
  return { version: 1, arten };
}

const store = createLocalStore("wasgibts.einwilligungen", migrateEinwilligungen);
const EMPTY: Store = { version: 1, arten: {} };
const load = () => store.load() ?? EMPTY;

/** Gilt die Einwilligung (ja, aktuelle Textfassung)? */
export const erteilt = (s: Store, art: EinwilligungArt) => s.arten[art]?.ja === true && s.arten[art]!.version >= TEXT_VERSION[art];

/** Muss gefragt werden? (noch nie, oder ja zu einer älteren Fassung) – ein „Nein“ zur aktuellen Fassung zählt als beantwortet */
export const offenGefragt = (s: Store, art: EinwilligungArt) => {
  const e = s.arten[art];
  return !e || (e.ja && e.version < TEXT_VERSION[art]);
};

export function einwilligungErteilt(art: EinwilligungArt): boolean {
  return erteilt(load(), art);
}

type Listener = (art: EinwilligungArt, e: Einwilligung) => void;
const sinks = new Set<Listener>();
/** Mit Konto: Änderungen zusätzlich auf dem Server festhalten (siehe konten) */
export function onEinwilligung(l: Listener): () => void {
  sinks.add(l);
  return () => sinks.delete(l);
}

/** Alles, was diese Person auf dem Gerät entschieden hat (für den Nachweis nach dem Anmelden) */
export const alleEinwilligungen = () => Object.entries(load().arten) as [EinwilligungArt, Einwilligung][];

export function setEinwilligung(art: EinwilligungArt, ja: boolean) {
  const e: Einwilligung = { ja, version: TEXT_VERSION[art], at: nowIso() };
  const s = load();
  store.save({ ...s, arten: { ...s.arten, [art]: e } });
  sinks.forEach((l) => l(art, e));
}

export function useEinwilligungen() {
  const s = useExternalStore(store.subscribe, load, () => EMPTY);
  return { erteilt: (a: EinwilligungArt) => erteilt(s, a), gefragt: (a: EinwilligungArt) => !offenGefragt(s, a), stand: s.arten };
}
