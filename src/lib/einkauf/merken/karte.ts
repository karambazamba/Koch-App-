// Mia merkt sich den Laden (A-041, Tafel 128, Bild 3), rein: was die
// Ergebnis-Karte unter „Tomaten“ zeigt. Hat Mia den Laden selbst ausgesucht
// (gelernt beim Abhaken, feste Regel, früher gewählt): „Rewe · wie immer ⌄“,
// antippen = anderer Laden (die Korrektur wird gemerkt). Gesagter Laden:
// „Rewe ⌄“. Beim ersten Mal, dass Mia selbst gewählt hat, einmal darunter
// „Hab Rewe genommen, wie letztes Mal.“

import type { LadenHerkunft } from "@/lib/einkauf/shopRules";

export type KartenLaden = { shop: string; wieImmer: boolean };

/** Laden auf der Karte; null = noch ohne Laden */
export function kartenLaden(herkunft: LadenHerkunft | null, gesagt: string | null): KartenLaden | null {
  if (!herkunft || !herkunft.shop.trim()) return null;
  const selbst = !gesagt && herkunft.von !== "aehnlich";
  return { shop: herkunft.shop.trim(), wieImmer: selbst };
}

/** „Rewe · wie immer“ bzw. „Rewe“ */
export const kartenLadenText = (l: KartenLaden) => (l.wieImmer ? `${l.shop} · wie immer` : l.shop);

/** Einmal beim ersten Mal, dass Mia den Laden selbst ausgesucht hat */
export const selbstGewaehltText = (shop: string) => `Hab ${shop} genommen, wie letztes Mal.`;

/** Laden-Seite, einmal klein unter „Oft bei“: wie das Merken geht */
export const merkenText = (shop: string) => `Merk ich mir, wenn du bei ${shop.trim()} abhakst.`;
