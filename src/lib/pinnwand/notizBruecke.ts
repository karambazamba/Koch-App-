// Brücke zu den Notizen (Tafel 106, E): Pinnwand = Zettel für die anderen,
// Notizen = für mich. „In Notizen“ macht aus dem Zettel eine eigene Notiz
// (erste Zeile = Titel) und legt den Zettel ins Archiv – nichts wird
// gelöscht. Sieht ein eigener Zettel nach Notiz aus (Liste mit 3+ Zeilen,
// Passwort/PIN/WLAN, Telefonnummer, Adresse), fragt Mia EINMAL je Zettel:
// „Klingt nach Notiz. Soll ich’s bei deinen Notizen ablegen?“ Rein.

import { noteFromText, type Note } from "@/lib/notizen/model";
import { updatePin, visiblePins, type PinMessage } from "@/lib/pinnwand/model";
import { looksLikeNote } from "@/lib/pinnwand/tuer";

export const NOTIZ_FRAGE = "Klingt nach Notiz. Soll ich’s bei deinen Notizen ablegen?";

/** Zettel → Notiz (Familie, wie der Zettel); null bei leerem Text (z. B. Foto ohne Zeile) */
export const noteOfPin = (pin: PinMessage): Note | null => noteFromText(pin.data.text, "familie");

/** Zettel ins Archiv (z. B. nach „In Notizen“) */
export const archivePin = (list: PinMessage[], id: string, stamp: string) => updatePin(list, id, { archiv: stamp }, stamp);

/** Der eine Zettel, zu dem Mia gerade fragen darf: eigener, an der Tür, nicht erledigt, noch nie gefragt, sieht nach Notiz aus */
export function noteQuestionFor(list: PinMessage[], me: string, nowMs: number): PinMessage | null {
  return visiblePins(list, nowMs).find((p) => p.data.author === me && !p.data.erledigt && !p.data.notizFrage && p.data.papier !== "foto" && looksLikeNote(p.data.text)) ?? null;
}

/** Gefragt (Ja oder „Bleibt hier“) – nie wieder für diesen Zettel */
export const markNoteAsked = (list: PinMessage[], id: string, stamp: string) => updatePin(list, id, { notizFrage: true }, stamp);
