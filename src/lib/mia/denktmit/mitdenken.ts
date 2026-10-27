// Mia denkt mit (Tafel 90, Bild 4): Tipps nur mit echtem Bezug, mit Knöpfen.
// Regelbasiert, ohne KI. Regen zu einem Draußen-Termin steht schon auf der
// Jetzt-Karte (heute/jetztTopics) – hier nur, was sie nicht zeigt:
//  - Wetter × Wäsche: Regen ab … und heute steht „Wäsche“ an
//  - Termin × Familie: früher Termin an einem Kita-/Schultag → „Wer bringt Ole?“
//  - Voller Tag × Essen: ≥ 3 Termine, noch kein Gericht → schnelles Gericht
// Jede Frage nur einmal (Schlüssel je Tag). Rein.

import { uhr } from "@/lib/mia/denktmit/muster";

type MitdenkKnopf = { label: string; aktion: "passt" | "wer-bringt" | "ich-bringe" | "nehmen" | "anderes"; wert?: string };
export type MitdenkTipp = { key: string; satz: string; knoepfe: MitdenkKnopf[] };

export type MitdenkLage = {
  today: string;
  minutes: number;
  /** 0 = Mo … 6 = So */
  weekday: number;
  feiertag: boolean;
  /** Erste Regenstunde heute ab jetzt („15:00“) – ehrliche Regel aus wetter/forecast */
  regenAb: string | null;
  /** Aufgaben heute (noch nicht erledigt) */
  aufgaben: string[];
  /** Eigene Termine heute mit Uhrzeit */
  termine: { title: string; time: string }[];
  /** Kinder (Kita/Schule) und die andere erwachsene Person aus dem Profil */
  kinder: string[];
  partner: string | null;
  /** Schon ein Gericht für heute? */
  gericht: boolean;
  /** Schnelles Gericht (≤ 20 Min), das passt */
  schnell: { title: string; recipeId?: string } | null;
};

const WAESCHE = /(?<![a-zäöüß])(wäsche|waesche|aufhängen|bettwäsche)(?![a-zäöüß])/i;

/** Alle passenden Tipps, wichtigste zuerst; `gefragt` = schon beantwortet */
export function mitdenkTipps(l: MitdenkLage, gefragt: Record<string, unknown>): MitdenkTipp[] {
  const out: MitdenkTipp[] = [];
  const add = (t: MitdenkTipp) => !(t.key in gefragt) && out.push(t);
  const schultag = l.weekday < 5 && !l.feiertag;

  // Termin × Familie: eigener Termin vor 8:30 an einem Kita-/Schultag, vormittags gefragt
  const frueh = l.termine.find((t) => t.time < "08:30");
  if (schultag && frueh && l.kinder.length && l.minutes < 8 * 60 + 30) {
    const kind = l.kinder.length === 1 ? l.kinder[0] : "die Kinder";
    add({
      key: `bringen:${l.today}`,
      satz: `Du hast um ${uhr(frueh.time)} ${frueh.title}. Wer bringt ${kind}?`,
      knoepfe: [...(l.partner ? [{ label: l.partner, aktion: "wer-bringt" as const, wert: l.partner }] : []), { label: "Ich", aktion: "ich-bringe", wert: kind }, { label: "Passt", aktion: "passt" }],
    });
  }

  // Wetter × Wäsche
  const waesche = l.aufgaben.find((a) => WAESCHE.test(a));
  if (l.regenAb && waesche && l.minutes < Number(l.regenAb.slice(0, 2)) * 60) {
    add({ key: `waesche:${l.today}`, satz: `Ab ${uhr(l.regenAb)} Regen. Wäsche lieber vorher raus?`, knoepfe: [{ label: "Passt", aktion: "passt" }] });
  }

  // Voller Tag × Essen: bis zum frühen Nachmittag vorschlagen
  if (l.termine.length >= 3 && !l.gericht && l.schnell && l.minutes < 16 * 60) {
    add({
      key: `schnell:${l.today}`,
      satz: `Voller Tag heute. Wie wär’s abends mit ${l.schnell.title}? Geht schnell.`,
      knoepfe: [
        { label: "Nehmen", aktion: "nehmen", wert: l.schnell.title },
        { label: "Was anderes", aktion: "anderes" },
      ],
    });
  }
  return out;
}
