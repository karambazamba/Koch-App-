// Neue Aufgabe & Termin (Tafel 114): der Schalter „Familie | Ich | Arbeit“.
// Genau einer ist an. Start = die letzte Wahl auf diesem Gerät, nach
// Feierabend der gemeinsame Raum (allein: „Ich“). Sagt der Satz den Raum
// („nur für mich“, „Büro“), springt der Schalter mit – von Hand gewählt geht
// immer vor. Rein.

import type { Room } from "@/lib/core/entries";
import { raumWahl, sichtRaum, type Haushalt } from "@/lib/core/haushalt";

/** Gemeinsamer Raum im Schalter: Familie bzw. allein „Ich“ */
const gemeinsam = (h: Haushalt): Room => (h === "allein" ? "ich" : "familie");

/** Womit der Schalter startet */
export function startRaum(o: { letzte: Room | null; feierabend: boolean; haushalt: Haushalt }): Room {
  if (o.feierabend) return gemeinsam(o.haushalt);
  return o.letzte && raumWahl(o.haushalt).includes(o.letzte) ? o.letzte : gemeinsam(o.haushalt);
}

/** Was der Schalter zeigt: von Hand › aus dem Satz › Start (allein wird „Familie“ zu „Ich“) */
export const schalterRaum = (o: { hand: Room | null; ausText: Room | null; start: Room; haushalt: Haushalt }): Room => sichtRaum(o.hand ?? o.ausText ?? o.start, o.haushalt);

/**
 * Was gespeichert wird: beim Bearbeiten bleibt der alte Raum, solange der
 * Schalter ihn nur anders anzeigt (allein: Familie von früher steht auf „Ich“).
 */
export const raumZumSpeichern = (gewaehlt: Room, vorher: Room | null, h: Haushalt): Room => (vorher && sichtRaum(vorher, h) === gewaehlt ? vorher : gewaehlt);
