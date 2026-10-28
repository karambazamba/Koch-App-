// Erinnerung am Vorabend (A-044, rein): ist der Schalter an (Standard aus)
// und morgen ein Training geplant, kommt um 19:00 eine Mitteilung
// („Morgen (Do): Laufen · 8:00“). Sie zählt als proaktiv: höchstens 1 am Tag,
// nie in der Ruhe 20–7 Uhr (19:00 liegt mit 5 Min Fenster sicher davor), nie
// in der Pause (`pushAllowed`). Hat das Training schon selbst „Am Vorabend“,
// kommt nur diese eine Mitteilung. Läuft auf dem Gerät, solange die App offen
// ist (Sport ist persönlich und liegt nicht beim Server).

import { addDays } from "@/lib/core/now";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort, type CalendarEntry } from "@/lib/kalender/model";
import { plannedOn, type SportState } from "@/lib/sport/model";

/** Uhrzeit der Erinnerung am Vorabend (Minuten): 19:00, vor der Ruhe ab 20 Uhr */
export const SPORT_VORABEND_MINUTE = 19 * 60;
const FENSTER = 5;

/** Schlüssel einer proaktiven Mitteilung (so zählt sie zur Regel 1 am Tag) */
const proaktivKey = (today: string, kern: string) => `proaktiv:${today}:${kern}`;

/** Heute schon eine proaktive Mitteilung auf diesem Gerät? */
export const proaktivHeute = (sent: readonly string[], today: string) => sent.some((k) => k.startsWith(`proaktiv:${today}:`));

export type SportVorabend = { key: string; body: string; href: string };

/** Was jetzt (falls überhaupt) als Erinnerung am Vorabend raus darf – `allowed` = `pushAllowed` mit Art „proaktiv“ */
export function sportVorabend(
  state: Pick<SportState, "erinnerung">,
  entries: CalendarEntry[],
  ctx: { today: string; minute: number; me?: string | null; sent: readonly string[]; allowed: () => boolean },
): SportVorabend | null {
  if (!state.erinnerung) return null;
  if (ctx.minute < SPORT_VORABEND_MINUTE || ctx.minute > SPORT_VORABEND_MINUTE + FENSTER) return null;
  const key = proaktivKey(ctx.today, "sport-vorabend");
  if (ctx.sent.includes(key) || proaktivHeute(ctx.sent, ctx.today) || !ctx.allowed()) return null;
  const morgen = addDays(ctx.today, 1);
  const item = plannedOn(entries, morgen, ctx.today, ctx.me).find((i) => i.reminder !== "vorabend");
  if (!item) return null;
  return { key, body: [`Morgen (${weekdayShort(morgen)}): ${item.title}`, item.time ? clockLabel(item.time) : null].filter(Boolean).join(" · "), href: "/sport" };
}
