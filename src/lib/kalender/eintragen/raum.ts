// Neue Aufgabe & Termin (Tafel 114, A-021): der Schalter „Familie |
// Geschäftlich“ – für Aufgaben und Termine derselbe. Genau einer ist an.
// Start = die letzte Wahl auf diesem Gerät, nach Feierabend Familie. Sagt der
// Satz den Raum („Tohuus“, „Kita“), springt der Schalter mit – von Hand
// gewählt geht immer vor. Rein.

import type { Room } from "@/lib/core/entries";

/** Womit der Schalter startet */
export function startRaum(o: { letzte: Room | null; feierabend: boolean }): Room {
  if (o.feierabend) return "familie";
  return o.letzte ?? "familie";
}

/** Was der Schalter zeigt: von Hand › aus dem Satz › Start */
export const schalterRaum = (o: { hand: Room | null; ausText: Room | null; start: Room }): Room => o.hand ?? o.ausText ?? o.start;
