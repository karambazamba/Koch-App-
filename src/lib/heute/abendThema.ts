// Startseite abends (Tafel 98 „Abends: nichts doppelt“): Ab Feierabend bzw.
// ab 19 Uhr – wenn heute kein Termin und kein Essen mehr kommt – zeigen die
// Kacheln schon morgen (Termine „Morgen · Mi“, Essen „Morgen · Mi“). Die
// eine Regel steht in `kalender/mitwandern.ts` (`aufMorgen`); hier nur die
// Eingaben dafür aus dem, was die Startseite ohnehin hat. Die Jetzt-Karte
// zeigt abends ab 18 Uhr ihr eigenes Thema „Morgen · Fr: …“ (A-054,
// `jetztTopics.ts`). Rein.

import type { AbendLage } from "@/lib/kalender/mitwandern";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Wie die Startseite abends rechnet (eine Regel: `kalender/mitwandern.ts`) – auch für die Aufgaben-Kachel */
export const abendLage = (x: { minutes: number; evening?: boolean; cookingStep: string | null; dish: { clock: string | null } | null; upcoming: { time: string | null }[] }): AbendLage => ({
  minutes: x.minutes,
  feierabend: Boolean(x.evening),
  kochen: Boolean(x.cookingStep),
  nochTermin: x.upcoming.some((t) => t.time && toMin(t.time) > x.minutes),
  nochEssen: Boolean(x.dish?.clock && toMin(x.dish.clock) > x.minutes),
});
