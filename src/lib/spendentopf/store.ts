// Spendentopf auf dem Gerät (`wasgibts.spendentopf` v2) – bis es Konten gibt.
// Felder entsprechen den späteren Tabellen: Region (manuell gewählt),
// unterstützte Region, „Bescheid geben“ (region_interest), Stimmen je Jahr
// (pot_votes), Beitrag nur „zugesagt“ (pot_contributions – KEINE Zahlung),
// Beitrags-Frage und wann die Abstimm-Karte weggetippt wurde. v2: Beitrag mit
// Art (monatlich/einmalig) und „vorgemerkt“ (Vorschau) bzw. „zugesagt“ (live);
// v1-Zusagen bleiben „zugesagt“, monatlich.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { usePlace } from "@/lib/wetter/client";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { regionById, regionForPlace, type AskState, type PledgeArt } from "@/lib/spendentopf/model";
import type { Region } from "@/lib/spendentopf/regions";

export type Pledge = { betrag: number; art: PledgeArt; monat: string; status: "vorgemerkt" | "zugesagt" };

export type PotState = {
  version: 2;
  /** Selbst gewählte Region (sonst aus dem Wohnort) */
  region: string | null;
  /** Unterstützte Region, solange die eigene keinen Topf hat */
  support: string | null;
  interest: string[];
  /** Jahr → Projekt (eine Stimme pro Familie und Jahr) */
  votes: Record<string, string>;
  pledge: Pledge | null;
  ask: AskState;
  /** Jahre, in denen die Abstimm-Karte weggetippt wurde */
  voteCardHidden: number[];
  /** Nach dem Start einmal gefragt (Seite geöffnet) */
  liveAsked: boolean;
};

const EMPTY: PotState = { version: 2, region: null, support: null, interest: [], votes: {}, pledge: null, ask: { since: null, asked: 0, next: null, done: false }, voteCardHidden: [], liveAsked: false };

const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

export function migratePot(raw: unknown): PotState | null {
  if (!raw || typeof raw !== "object" || ![1, 2].includes((raw as PotState).version)) return null;
  const r = raw as Partial<PotState>;
  const ask = (r.ask ?? {}) as Partial<AskState>;
  const p = r.pledge as Partial<Pledge> | null | undefined;
  return {
    version: 2,
    region: typeof r.region === "string" ? r.region : null,
    support: typeof r.support === "string" ? r.support : null,
    interest: strings(r.interest),
    votes: r.votes && typeof r.votes === "object" ? Object.fromEntries(Object.entries(r.votes).filter(([, v]) => typeof v === "string")) : {},
    pledge:
      p && typeof p.betrag === "number" && p.betrag > 0
        ? { betrag: p.betrag, art: p.art === "einmalig" ? "einmalig" : "monatlich", monat: typeof p.monat === "string" ? p.monat : "", status: p.status === "vorgemerkt" ? "vorgemerkt" : "zugesagt" }
        : null,
    ask: { since: typeof ask.since === "string" ? ask.since : null, asked: Number(ask.asked) || 0, next: typeof ask.next === "string" ? ask.next : null, done: ask.done === true },
    voteCardHidden: Array.isArray(r.voteCardHidden) ? r.voteCardHidden.filter((y): y is number => typeof y === "number") : [],
    liveAsked: r.liveAsked === true,
  };
}

const store = createLocalStore("wasgibts.spendentopf", migratePot);

const loadPot = (): PotState => store.load() ?? EMPTY;
export function changePot(change: (s: PotState) => PotState) {
  store.save(change(loadPot()));
}

export function usePotState(): PotState | undefined {
  const s = useExternalStore(store.subscribe, store.load, () => undefined);
  return s === undefined ? undefined : (s ?? EMPTY);
}

/** Erstes Öffnen merken (ab dann zählen die 4 Wochen bis zur Beitrags-Frage) */
export function notePotStart(today: string) {
  const s = loadPot();
  if (!s.ask.since) store.save({ ...s, ask: { ...s.ask, since: today } });
}

/** Region der Familie: selbst gewählt, sonst aus Wetter-Ort bzw. PLZ */
export function useFamilyRegion(): { region: Region | null; auto: boolean } {
  const state = usePotState();
  const place = usePlace();
  const profile = useProfile();
  const chosen = regionById(state?.region);
  if (chosen) return { region: chosen, auto: false };
  return { region: regionForPlace(profile?.weather?.postcode || "") ?? regionForPlace(place), auto: true };
}
