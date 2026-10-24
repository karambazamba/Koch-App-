// „Familie einladen“ auf der Startseite (Tafel 22): nie beim Start, sondern
// nach 3 Tagen Nutzung (oder sobald im Profil eine zweite erwachsene Person
// steht) EINE ruhige Karte unter der Jetzt-Karte (zählt als der eine Hinweis):
// „Soll Lisa auch sehen, was du einträgst?“ → „Familie einladen“ / „Später“.
// „Später“ = 7 Tage Ruhe, beim zweiten Mal nur noch in den Einstellungen.
// Nur mit Konten; wer schon mit jemandem verbunden ist, sieht sie nicht.

import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type EinladenState = { version: 1; later: string[] };

const EMPTY: EinladenState = { version: 1, later: [] };
const days = (from: string, to: string) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);

export function migrateEinladen(raw: unknown): EinladenState | null {
  if (!raw || typeof raw !== "object" || (raw as EinladenState).version !== 1) return null;
  const later = (raw as EinladenState).later;
  return { version: 1, later: Array.isArray(later) ? later.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d)).slice(-2) : [] };
}

/** Satz der Karte – oder null (nicht zeigen) */
export function einladenText(state: EinladenState, o: { today: string; since: string | null; cloud: boolean; members: number; secondAdult: string | null }): string | null {
  if (!o.cloud || o.members >= 2 || state.later.length >= 2) return null;
  if (state.later.length === 1 && days(state.later[0], o.today) < 7) return null;
  const used = o.since ? days(o.since, o.today) : 0;
  if (used < 3 && !o.secondAdult) return null;
  return o.secondAdult ? `Soll ${o.secondAdult} auch sehen, was du einträgst?` : "Soll deine Familie auch sehen, was du einträgst?";
}

const store = createLocalStore("wasgibts.einladenhinweis", migrateEinladen);

export const laterEinladen = (today: string) => store.save({ version: 1, later: [...(store.load() ?? EMPTY).later, today].slice(-2) });

export function useEinladenState(): EinladenState | undefined {
  const s = useExternalStore(store.subscribe, store.load, () => undefined);
  return s === undefined ? undefined : (s ?? EMPTY);
}

/** „Lade Lisa ein“, „Familie einladen“, „Ich will meinen Mann einladen“ → Name (oder "") – sonst null */
export function einladenWunsch(text: string): string | null {
  const t = text.trim();
  const m = t.match(/^(?:bitte\s+)?lade?\s+(.+?)\s+(?:mit\s+)?ein[.!]?$/i) ?? t.match(/^(?:ich\s+(?:will|möchte|würde\s+gern)\s+)?(.+?)\s+einladen[.!?]?$/i);
  if (!m) return null;
  const who = m[1].replace(/^(meine[nmrs]?|unsere[nmrs]?|die|den|das)\s+/i, "").trim();
  if (/^(dich|mich|euch|uns|zum essen|zum kaffee)$/i.test(who) || /(?<![a-zäöüß])(essen|kaffee|geburtstag|party|feier)(?![a-zäöüß])/i.test(who)) return null;
  return /^(familie|alle|die familie)$/i.test(who) ? "" : who.split(/\s+/).slice(0, 2).join(" ");
}
