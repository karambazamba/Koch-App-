// Die EINE Raum-Wahl (A-034, `ui/RaumChips`): drei Chips „Familie · Ich ·
// Arbeit“ (allein „Privat · Arbeit“) – in der Schnelleingabe, in Mias
// Bestätigung, im Detail-Fenster und beim Bearbeiten gleich. Mia wählt vor
// (`raumRaten`), von Hand gewählt geht immer vor. Rein.

import type { Room } from "@/lib/core/entries";
import { raumLabel, sichtRaum, type Haushalt } from "@/lib/core/haushalt";
import { standardRaum, type RaumArt } from "@/lib/kalender/raum/raten";

/** Welcher Chip leuchtet: von Hand › Mias Vorschlag (allein zeigt „Ich“ sich als „Privat“) */
export const chipRaum = (o: { hand: Room | null; vorschlag: Room; haushalt: Haushalt }): Room => sichtRaum(o.hand ?? o.vorschlag, o.haushalt);

/**
 * Was gespeichert wird. Allein steht „Privat“ für Familie und Ich zugleich:
 * dann bleibt, was schon war bzw. was Mia vorschlug (Aufgaben „ich“), damit
 * es auch später mit Partner nur für einen bleibt.
 */
export function raumZumSpeichern(gewaehlt: Room, o: { art: RaumArt; vorher: Room | null; vorschlag: Room; haushalt: Haushalt }): Room {
  if (o.haushalt !== "allein" || gewaehlt !== "familie") return gewaehlt;
  if (o.vorher === "familie" || o.vorher === "ich") return o.vorher;
  return o.vorschlag !== "arbeit" ? o.vorschlag : standardRaum(o.art);
}

/** Hat man Mias Vorschlag korrigiert? Dann lernt sie das Stichwort. */
export const istKorrektur = (o: { hand: Room | null; vorschlag: Room; haushalt: Haushalt }): boolean => o.hand !== null && o.hand !== sichtRaum(o.vorschlag, o.haushalt);

/**
 * Der einmalige Satz unter den Chips: „Hab Familie gewählt. Tippen zum
 * Ändern.“ (zu zweit „Hab Wir gewählt …“, allein „Hab Privat gewählt …“).
 * Nur-ich-Einträge (A-056): „Nur für dich. Tippen zum Ändern.“ – nie „Hab Ich
 * gewählt“ und nie „Privat“, wo „Ich“ gemeint ist.
 */
export function vorgewaehltText(r: Room, h: Haushalt): string {
  const sicht = sichtRaum(r, h);
  return sicht === "ich" ? "Nur für dich. Tippen zum Ändern." : `Hab ${raumLabel(sicht, h)} gewählt. Tippen zum Ändern.`;
}
