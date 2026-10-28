// Kachel-Knöpfe und -Pillen (A-045/A-046, Tafel 133/134): Text wird NIE mit
// „…“ gekürzt. Passt er nicht, gilt eine feste Reihenfolge: erst das Symbol
// weg, dann die kleinere Schrift (12–13 px), dann die kurze Form aus
// `KURZ_LABEL`, zuletzt weniger Innenabstand. Rein, damit es testbar ist;
// gemessen wird im Knopf (`ui/KachelKnopf`): die erste Stufe, deren Text
// nicht überläuft, sonst die letzte.

/** Kurze Form je Text – nur, wenn die lange gar nicht passt */
export const KURZ_LABEL: Readonly<Record<string, string>> = {
  "Wochenplan ›": "Woche ›",
  "Weiter kochen ›": "Weiter ›",
  Wochenplan: "Woche",
  "Weiter kochen": "Weiter",
  "Was anderes?": "Anders?",
};

export type KnopfStufe = {
  /** Symbol zeigen */
  icon: boolean;
  /** Schriftgröße */
  px: number;
  text: string;
  /** Innenabstand halbiert (letzte Rettung) */
  eng: boolean;
};

const gleich = (a: KnopfStufe, b: KnopfStufe) => a.icon === b.icon && a.px === b.px && a.text === b.text && a.eng === b.eng;

/**
 * Alle Stufen, vom größten zum kleinsten, ohne doppelte. `icon`: ob es
 * überhaupt ein Symbol gibt; `px`: normale und kleine Schrift (Pille 12,5 / 12).
 */
export function knopfStufen(label: string, { icon, px = [14, 13] }: { icon: boolean; px?: readonly [number, number] }): KnopfStufe[] {
  const kurz = KURZ_LABEL[label] ?? label;
  const [gross, klein] = px;
  const alle: KnopfStufe[] = [
    { icon, px: gross, text: label, eng: false },
    { icon: false, px: gross, text: label, eng: false },
    { icon: false, px: klein, text: label, eng: false },
    { icon: false, px: klein, text: kurz, eng: false },
    { icon: false, px: klein, text: kurz, eng: true },
  ];
  return alle.filter((s, i) => alle.findIndex((t) => gleich(s, t)) === i);
}
