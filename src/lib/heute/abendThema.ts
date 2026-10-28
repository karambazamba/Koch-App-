// Jetzt-Karte abends (Tafel 98 „Abends: nichts doppelt“): Ab Feierabend bzw.
// ab 19 Uhr – wenn heute nichts mehr kommt – zeigen die Kacheln schon morgen
// (Termine „Morgen · Mi“, Essen „Morgen · Mi“). Die Karte sagt dann nur noch
// EIN Thema, das keine Kachel zeigt, in fester Reihenfolge:
//   a) Jahrestag/Geburtstag morgen  („Morgen ist euer Hochzeitstag.“)
//   b) Regen morgen früh mit Plan    („Morgen früh Regen.“)
//   c) früher Termin vor 9 Uhr       („Morgen 8 Uhr Zahnarzt.“ · „Wecker auf 7?“)
//   d) Essen mit Vorlauf             („Morgen gibt’s Gulasch.“ · „Fleisch heute …“)
//   Sonntags: Kurz-Check „Im Haus“  („Kurzer Kühlschrank-Check?“, `vorrat/kuehlcheck.ts`)
//   e) sonst                         („Morgen ist ruhig.“ · „Schönen Abend.“)
// Nachts (22–6) gilt das nicht – da bleibt es bei Erinnerung/Timer. Rein.

import { birthdayName, eigenerJahrestag } from "@/lib/kalender/anlass";
import { weekdayIndex } from "@/lib/kalender/model";
import { aufMorgen, type AbendLage } from "@/lib/kalender/mitwandern";
import type { JetztInput, JetztTopic } from "@/lib/heute/jetztTopics";
import { kuehlThema } from "@/lib/vorrat/kuehlcheck";

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
/** „8:00“ → „8 Uhr“, „7:30“ → „7:30“ */
const uhr = (m: number) => {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h}:${String(min).padStart(2, "0")}` : `${h}`;
};

/** Wie die Startseite abends rechnet (eine Regel: `kalender/mitwandern.ts`) – auch für die Aufgaben-Kachel */
export const abendLage = (x: Pick<JetztInput, "minutes" | "evening" | "cookingStep" | "dish"> & { upcoming: { time: string | null }[] }): AbendLage => ({
  minutes: x.minutes,
  feierabend: Boolean(x.evening),
  kochen: Boolean(x.cookingStep),
  nochTermin: x.upcoming.some((t) => t.time && toMin(t.time) > x.minutes),
  nochEssen: Boolean(x.dish?.clock && toMin(x.dish.clock) > x.minutes),
});

/** Abends? Nicht nachts, ab Feierabend bzw. 19 Uhr, heute kommt kein Termin und kein Essen mehr */
export function isAbend(x: JetztInput): boolean {
  return x.minutes < 22 * 60 && aufMorgen(abendLage(x));
}

/**
 * Die Themen für heute Abend in fester Reihenfolge a–e (das erste nicht
 * weggelegte zählt). e) ist immer dabei – die Karte ist abends nie leer.
 */
export function abendThemen(x: JetztInput): JetztTopic[] {
  const out: JetztTopic[] = [];
  const morgen = x.tomorrow;
  const href = { href: `/tag?datum=${morgen.date}` };
  const base = { score: 50, target: href };

  // a) Jahrestag bzw. Geburtstag morgen
  const fest = morgen.items.find((i) => i.anlass);
  if (fest?.anlass === "jahrestag") {
    const eigen = eigenerJahrestag(fest.title);
    out.push({ ...base, id: `jahrestag:${fest.key}`, kind: "jahrestag", title: eigen ? `Morgen ist ${x.solo ? "dein" : "euer"} ${eigen}.` : `Morgen: ${fest.title}`, detail: "Was Schönes geplant?", button: "Erledigt" });
  } else if (fest) {
    const name = birthdayName(fest.title);
    out.push({ ...base, id: `geburtstag:${fest.date}:${fest.title}`, kind: "geburtstag", title: name ? `Morgen hat ${name} Geburtstag.` : `Morgen: ${fest.title}`, detail: "Noch Zeit für eine Kleinigkeit.", button: "Erledigt" });
  }

  // b) Regen morgen früh – nur mit Plan: Weg zu Kita/Schule (werktags) oder ein Termin vor 10 Uhr
  const timed = morgen.items.filter((i) => i.time).sort((a, b) => toMin(a.time) - toMin(b.time));
  const frueh = timed.find((i) => toMin(i.time) < 10 * 60);
  const werktag = weekdayIndex(morgen.date) < 5;
  if (x.tomorrowRain && ((x.kidsWay && werktag) || frueh)) {
    const detail = x.kidsWay && werktag ? `Jacken für die ${x.kidsWay} raus.` : `Schirm für ${frueh!.title} bereitlegen?`;
    out.push({ ...base, id: `morgenwetter:${morgen.date}`, kind: "morgenwetter", title: "Morgen früh Regen.", detail, button: "Erledigt" });
  }

  // c) Früher Termin (vor 9 Uhr, ab 5 Uhr): Wecker eine Stunde vorher
  const wecker = timed.find((i) => toMin(i.time) >= 5 * 60 && toMin(i.time) < 9 * 60);
  if (wecker) {
    const m = toMin(wecker.time);
    out.push({ ...base, id: `frueh:${wecker.key}`, kind: "frueh", title: `Morgen ${uhr(m)}${m % 60 ? "" : " Uhr"} ${wecker.title}.`, detail: `Wecker auf ${uhr(m - 60)}?`, button: "Erledigt" });
  }

  // d) Essen mit Vorlauf (Tiefkühler, Marinieren, Teig)
  if (x.tomorrowDish) out.push({ ...base, id: `vorlauf:${morgen.date}`, kind: "vorlauf", title: `Morgen gibt’s ${x.tomorrowDish.name}.`, detail: x.tomorrowDish.prep, button: "Erledigt" });

  // Beispiel-Tag: kurz erklären, bevor es „ruhig“ heißt
  if (x.demo) out.push({ id: "beispiel", kind: "beispiel", title: "Das ist ein Beispiel-Tag", detail: "Probier alles aus: tippen, abhaken, verschieben", score: 24, target: null, button: null });

  // Sonntags der Kurz-Check „Im Haus“ (zählt erst, wenn er wirklich steht)
  if (x.kuehlCheck) out.push(kuehlThema(x.kuehlCheck));

  // e) sonst
  out.push({ id: `abend:${x.today}`, kind: "abend", title: morgen.items.length ? "Für morgen ist alles sortiert." : "Morgen ist ruhig.", detail: "Schönen Abend.", score: 1, target: href, button: null });
  return out;
}
