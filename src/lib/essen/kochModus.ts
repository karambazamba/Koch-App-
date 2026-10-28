// Kochmodus (Tafel 122, rein): was Mia beim Kochen versteht, wo der
// Kochmodus wieder einsteigt und der eine Satz nach „Gegessen“.

import { parseTimerCommand } from "@/lib/timer/model";

export type KochBefehl = { kind: "weiter" } | { kind: "zurueck" } | { kind: "nochmal" } | { kind: "fertig" } | { kind: "timer"; minutes: number; name: string };

// Wortgrenzen ohne \b (Umlaute): davor/danach kein Buchstabe
const wort = (w: string) => new RegExp(`(?<![a-zäöüß])(?:${w})(?![a-zäöüß])`);
const ZURUECK = wort("zurück|zurueck|vorherige[rns]?|davor|einen schritt zurück");
const NOCHMAL = wort("nochmal|noch mal|noch einmal|wiederhol\\w*|wie bitte|was war das");
const FERTIG = wort("fertig|gegessen|das war'?s|das war’s|schluss|ende");
const WEITER = wort("weiter|nächste[rns]?|naechste[rns]?|next|und dann|okay weiter|vor");

/**
 * Sprachbefehl im Kochmodus (nur kurze Sätze, damit Gespräche am Herd nichts
 * auslösen): „Weiter“, „Zurück“, „Nochmal“, „Timer 10 Minuten“, „Fertig“.
 */
export function kochBefehl(text: string): KochBefehl | null {
  const t = text
    .toLowerCase()
    .replace(/[.,!?;:„“"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t || t.split(" ").length > 7) return null;
  const timer = parseTimerCommand(t);
  if (timer?.kind === "start") return { kind: "timer", minutes: Math.max(1, Math.round(timer.minutes)), name: timer.name };
  if (ZURUECK.test(t)) return { kind: "zurueck" };
  if (NOCHMAL.test(t)) return { kind: "nochmal" };
  if (FERTIG.test(t)) return { kind: "fertig" };
  if (WEITER.test(t)) return { kind: "weiter" };
  return null;
}

/** Einstieg: gemerkter Schritt von heute (✕ merkt ihn sich), sonst die Zutaten (0); nie hinter dem letzten Schritt */
export function startSchritt(gemerkt: number | undefined, total: number): number {
  if (gemerkt === undefined || !Number.isFinite(gemerkt)) return 0;
  return Math.min(Math.max(0, Math.round(gemerkt)), Math.max(total, 0));
}

/** Mias eine Satz nach „Gegessen“ – knapp, kein Lob-Feuerwerk */
export const gegessenSatz = (personen: number | null) => (personen && personen > 1 ? "Lasst es euch schmecken." : "Lass es dir schmecken.");

/** Hinweiszeile unten im Kochmodus */
export const KOCH_SPRACHE_TEXT = "Sag einfach „Weiter“ oder „Timer 10 Minuten“.";
