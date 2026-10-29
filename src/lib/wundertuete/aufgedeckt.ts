// Lösung erst nach Antippen (A-059, Tafel 145): Wer die Karte auf der Kachel
// umgedreht hat und über „Mehr ›“ zur Seite kommt, sieht dort die Lösung
// gleich offen; jede neue Karte („Noch eine“) zeigt erst nur die Frage. Nur
// für diese Sitzung im Speicher, nie gespeichert. Rein.

let offen: string | null = null;

/** Diese Karte hat man eben aufgedeckt (Kachel umgedreht) bzw. wieder zugedreht */
export function merkeAufgedeckt(id: string, ja: boolean) {
  if (ja) offen = id;
  else if (offen === id) offen = null;
}

/** Ist die Lösung dieser Karte schon aufgedeckt? */
export const istAufgedeckt = (id: string | undefined) => Boolean(id) && offen === id;
