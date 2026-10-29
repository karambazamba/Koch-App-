// Mia merkt sich den Laden (A-041, Tafel 128, Bild 3), rein: was die
// Ergebnis-Karte unter „Tomaten“ zeigt. Hat Mia den Laden selbst ausgesucht
// (gelernt beim Abhaken, feste Regel, früher gewählt): „Rewe · wie immer ⌄“,
// antippen = anderer Laden (die Korrektur wird gemerkt). Gesagter Laden:
// „Rewe ⌄“. Beim ersten Mal, dass Mia selbst gewählt hat, einmal darunter
// „Hab Rewe genommen, wie letztes Mal.“

import type { LadenHerkunft } from "@/lib/einkauf/shopRules";

export type KartenLaden = { shop: string; wieImmer: boolean; /** A-067: weitere Läden derselben Sorte */ auch?: string[] };

/** Laden auf der Karte; null = noch ohne Laden. Nach Sorte bzw. Hauptladen (A-067) ist es kein „wie immer“ */
export function kartenLaden(herkunft: LadenHerkunft | null, gesagt: string | null): KartenLaden | null {
  if (!herkunft || !herkunft.shop.trim()) return null;
  const selbst = !gesagt && (herkunft.von === "regel" || herkunft.von === "gewaehlt" || herkunft.von === "gelernt");
  return { shop: herkunft.shop.trim(), wieImmer: selbst, ...(herkunft.auch?.length && !gesagt ? { auch: herkunft.auch } : {}) };
}

/** „Rewe · wie immer“ bzw. „Rewe“, mehrere Läden „Wochenmarkt + Rewe“ */
export const kartenLadenText = (l: KartenLaden) => (l.wieImmer ? `${l.shop} · wie immer` : [l.shop, ...(l.auch ?? [])].join(" + "));

/** Unter den Ergebnis-Karten (A-067), bis man einmal umgelegt hat */
export const UMLEGEN_HINWEIS = "Falscher Laden? Antippen und umlegen, ich merk’s mir.";

/** Einmal beim ersten Mal, dass Mia den Laden selbst ausgesucht hat */
export const selbstGewaehltText = (shop: string) => `Hab ${shop} genommen, wie letztes Mal.`;

/** Laden-Seite, einmal klein unter „Oft bei“: wie das Merken geht */
export const merkenText = (shop: string) => `Merk ich mir, wenn du bei ${shop.trim()} abhakst.`;
