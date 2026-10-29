// Einkauf-Kachel M (A-050, Nachtrag 2, Tafel 140 unten) – rein und testbar:
// EINE Reihe mit bis zu 3 Laden-Chips nebeneinander, gleich breit (Strich in
// Ladenfarbe, Name 14 px fett, Anzahl). Mehr als 3 Läden: der dritte Chip
// wird „+2 weitere“. Nie abgeschnitten, nie abgekürzt („Kaufl.“): passt ein
// Name nicht, erst 13 px, dann lieber 2 Chips + „+n weitere“.

export type LadenChip = { art: "laden"; shop: string | null; label: string; count: number; names: string[] } | { art: "weitere"; anzahl: number };

/** Abstand zwischen den Chips (px) – muss zu `gap-1.5` passen */
const CHIP_ABSTAND = 6;
/** Innenabstand links (mit Strich) + rechts + Abstand zur Zahl (px) – passt zu `pl-2.5 pr-2 gap-1` */
const CHIP_RAND = 10 + 8 + 4;

/** Textbreite messen (im Browser echt per Canvas, sonst geschätzt) */
export type Messen = (text: string, px: number) => number;

/** Grobe Breite eines Textes in Plus Jakarta Sans (fett): ca. 0,6 em je Zeichen, schmale Buchstaben etwas weniger */
export function textBreite(text: string, px: number): number {
  let em = 0;
  for (const c of text) em += /[iljtfrI1.,:' ]/.test(c) ? 0.34 : /[mwMWÖÄÜ]/.test(c) ? 0.86 : /[A-ZÄÖÜ]/.test(c) ? 0.68 : 0.58;
  return em * px;
}

const passt = (chips: LadenChip[], breite: number, px: number, messen: Messen) => {
  const w = (breite - (chips.length - 1) * CHIP_ABSTAND) / chips.length;
  return chips.every((c) => (c.art === "weitere" ? messen(`+${c.anzahl} weitere`, 13) + 16 : messen(c.label, px) + messen(String(c.count), px) + CHIP_RAND) <= w);
};

/**
 * Chips für eine Reihe der Breite `breite` (px, Innenfläche der Kachel).
 * `rows` = Läden mit Sachen, die mit den meisten zuerst (`tileRows`).
 */
export function ladenChips(rows: { shop: string | null; count: number; names: string[] }[], breite: number, messen: Messen = textBreite): { chips: LadenChip[]; px: 14 | 13 } {
  const laeden: LadenChip[] = rows.filter((r) => r.count > 0).map((r) => ({ art: "laden", shop: r.shop, label: r.shop ?? "Egal wo", count: r.count, names: r.names }));
  const mit = (n: number): LadenChip[] => (laeden.length <= n ? laeden : [...laeden.slice(0, n - 1), { art: "weitere", anzahl: laeden.length - (n - 1) }]);
  for (const n of [3, 2]) {
    const chips = mit(n);
    if (n === 2 && laeden.length <= 2 && chips.length === laeden.length) {
      // zwei Läden: notfalls 13 px, sonst bleibt es bei zwei
      return { chips, px: passt(chips, breite, 14, messen) ? 14 : 13 };
    }
    if (passt(chips, breite, 14, messen)) return { chips, px: 14 };
    if (passt(chips, breite, 13, messen)) return { chips, px: 13 };
  }
  return { chips: mit(2), px: 13 };
}
