// Einkauf-Kachel M (A-050, Nachtrag 2, Tafel 140 unten; A-065, Tafel 148 B) –
// rein und testbar:
// - 1–3 Läden: EINE Reihe Laden-Chips nebeneinander, gleich breit (Strich in
//   Ladenfarbe, Name 14 px fett, Anzahl). Passt ein Name nicht, erst 13 px,
//   dann lieber 2 Chips + „+n weitere“ (nie abgekürzt, nie „…“).
// - 4 Läden: alle als 2 × 2, gleich große Felder, volle Namen, kein „+n weitere“.
// - Ab 5 Läden: 2 × 2, das vierte Feld wird „+n weitere“ (→ Einkaufsliste).
// Reihenfolge: meiste Sachen zuerst (`tileRows`).

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
export function ladenChips(rows: { shop: string | null; count: number; names: string[] }[], breite: number, messen: Messen = textBreite): { chips: LadenChip[]; px: 14 | 13; spalten: 1 | 2 | 3 } {
  const laeden: LadenChip[] = rows.filter((r) => r.count > 0).map((r) => ({ art: "laden", shop: r.shop, label: r.shop ?? "Egal wo", count: r.count, names: r.names }));
  const mit = (n: number): LadenChip[] => (laeden.length <= n ? laeden : [...laeden.slice(0, n - 1), { art: "weitere", anzahl: laeden.length - (n - 1) }]);
  // Ab 4 Läden (Tafel 148 B): 2 × 2 – vier Läden alle, ab fünf das vierte Feld „+n weitere“
  if (laeden.length >= 4) {
    const chips = mit(4);
    const halb = (breite - CHIP_ABSTAND) / 2;
    return { chips, px: passt(chips.slice(0, 2), halb * 2 + CHIP_ABSTAND, 14, messen) && passt(chips.slice(2), halb * 2 + CHIP_ABSTAND, 14, messen) ? 14 : 13, spalten: 2 };
  }
  return eineReihe(laeden, mit, breite, messen);
}

function eineReihe(laeden: LadenChip[], mit: (n: number) => LadenChip[], breite: number, messen: Messen): { chips: LadenChip[]; px: 14 | 13; spalten: 1 | 2 | 3 } {
  const r = (chips: LadenChip[], px: 14 | 13) => ({ chips, px, spalten: Math.max(1, chips.length) as 1 | 2 | 3 });
  for (const n of [3, 2]) {
    const chips = mit(n);
    if (n === 2 && laeden.length <= 2 && chips.length === laeden.length) {
      // zwei Läden: notfalls 13 px, sonst bleibt es bei zwei
      return r(chips, passt(chips, breite, 14, messen) ? 14 : 13);
    }
    if (passt(chips, breite, 14, messen)) return r(chips, 14);
    if (passt(chips, breite, 13, messen)) return r(chips, 13);
  }
  return r(mit(2), 13);
}
