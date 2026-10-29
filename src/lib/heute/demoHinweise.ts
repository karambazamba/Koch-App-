// Graue Erklärsätze am Beispiel-Tag (Tafel 150) – rein und testbar: unter
// jeder Kachel ein Satz, was sie kann, nur in der Demo. Damit die Kacheln
// ihre Größe behalten, steht der Satz in einer eigenen Zeile (Höhe = Inhalt),
// die an der ersten Zeilen-Grenze ab der Unterkante eingeschoben wird, über
// die keine andere Kachel reicht (wie Mias Tipp). Zwei Kacheln derselben
// Spalte (z. B. Wetter und Notizen übereinander) teilen sich die Zeile.

import type { HomeTileId } from "@/lib/core/homeLayout";

/** Wortlaut Tafel 150 (der Name der Begleitung kommt aus dem Profil) */
export const demoHinweise = (name: string): Partial<Record<HomeTileId, string>> => ({
  wetter: "Wetter für deinen Ort.",
  notizen: "Notizen: schnell was aufschreiben.",
  pinnwand: "Zettel und Fotos für alle.",
  termine: "Was heute noch kommt. Vorbei verschwindet von selbst.",
  aufgaben: `Abhaken. ${name} erinnert, wenn es eilt.`,
  essen: "Was es heute gibt, passend zum Vorrat.",
  wundertuete: "Jeden Tag was Neues zum Schmunzeln.",
  einkauf: "Nach Läden sortiert. Laden antippen und los.",
  vorrat: "Was im Haus ist, und was du daraus kochst.",
});
export const demoHinweisJetzt = (name: string) => `${name} sagt dir, was gerade wichtig ist.`;
export const DEMO_HINWEIS_KREISE = "Sport planen, kurz durchatmen, was los ist, Timer.";

/** Eine Kachel im Raster in Anzeige-Zeilen: Spalte, Breite, erste Zeile, Zeilen */
export type AnzeigePlatz = { key: string; col: number; w: number; start: number; span: number };
/** Eine eingeschobene Hinweis-Zeile vor Anzeige-Zeile `vor`, mit Sätzen je Spalte */
export type HinweisZeile = { vor: number; saetze: { col: number; w: number; text: string }[] };

/** Wo die Hinweis-Zeilen hinkommen (`texte` = Satz je Einheit, leer = keiner) */
export function hinweisZeilen(plaetze: AnzeigePlatz[], texte: Map<string, string>): HinweisZeile[] {
  const zeilen = new Map<number, { col: number; w: number; text: string }[]>();
  const kreuzt = (b: number) => plaetze.some((p) => p.start < b && p.start + p.span > b);
  for (const p of [...plaetze].sort((a, b) => a.start - b.start || a.col - b.col)) {
    const text = texte.get(p.key);
    if (!text) continue;
    let b = p.start + p.span;
    while (kreuzt(b)) b++;
    const saetze = zeilen.get(b) ?? [];
    const gleich = saetze.find((s) => s.col === p.col && s.w === p.w);
    if (gleich) gleich.text = `${gleich.text} ${text}`;
    else saetze.push({ col: p.col, w: p.w, text });
    zeilen.set(b, saetze);
  }
  return [...zeilen.entries()].sort((a, b) => a[0] - b[0]).map(([vor, saetze]) => ({ vor, saetze: saetze.sort((a, b) => a.col - b.col) }));
}
