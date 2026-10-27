// „Lieber schreiben“ auf der Bühne (rein, getestet): Der Tippen-Modus schließt
// nur, wenn das Feld den Fokus verloren hat, leer ist und auch nach kurzer
// Zeit kein Feld fokussiert ist – nie wegen eines Layout-Sprungs (Safari
// schiebt beim Öffnen der Tastatur die Seite hoch, die gemessene
// Tastaturhöhe springt dabei kurz auf 0).

/** So lange nach dem Fokusverlust warten, bevor der Tippen-Modus schließt */
export const TIPPEN_ZU_MS = 300;

export function tippenSchliessen({ feldFokussiert, leer, aendern }: { feldFokussiert: boolean; leer: boolean; aendern: boolean }): boolean {
  return !feldFokussiert && leer && !aendern;
}
