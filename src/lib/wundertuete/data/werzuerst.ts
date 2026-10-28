// Wundertüte · Wer zuerst: Mini-Spiele für den Tisch, eine Minute, ohne
// Material (ab 17 Uhr, zu zweit/Familie). Vorne steht nur der Rest des
// Satzes, der Kopf sagt „Wer zuerst“ (ohne „…“:
// nichts Sichtbares endet so, A-045). Keine Rückseite, keine Fakten.

import type { Eintrag } from "@/lib/wundertuete/sorten";

const e = (n: number, vorne: string): Eintrag => ({ id: `wz-${String(n).padStart(3, "0")}`, sorte: "werzuerst", vorne });

export const WERZUERST: Eintrag[] = [
  e(1, "… fünf rote Dinge im Raum findet. Los!"),
  e(2, "… drei Tiere mit B nennt. Los!"),
  e(3, "… ein Wort findet, das sich auf Haus reimt. Los!"),
  e(4, "… fünf Obstsorten aufzählt. Los!"),
  e(5, "… etwas Rundes auf dem Tisch zeigt. Los!"),
  e(6, "… drei Länder mit S nennt. Los!"),
  e(7, "… vier Dinge nennt, die man im Kühlschrank findet. Los!"),
  e(8, "… ein Tier nachmacht, das die anderen erraten. Los!"),
  e(9, "… bis zwanzig zählt, nur jede zweite Zahl. Los!"),
  e(10, "… drei Wörter mit Sch am Anfang sagt. Los!"),
  e(11, "… fünf Farben nennt, ohne Rot und Blau. Los!"),
  e(12, "… ein Wort sagt, das sich auf Maus reimt. Los!"),
  e(13, "… drei Dinge nennt, die fliegen können. Los!"),
  e(14, "… etwas Weiches im Raum findet. Los!"),
  e(15, "… vier Gemüsesorten aufzählt. Los!"),
  e(16, "… seinen Namen rückwärts buchstabiert. Los!"),
  e(17, "… drei Dinge nennt, die man am Strand findet. Los!"),
  e(18, "… fünf Dinge nennt, die mit A anfangen. Los!"),
  e(19, "… ein Lied summt, das die anderen erraten. Los!"),
  e(20, "… drei Sachen nennt, die man im Winter anzieht. Los!"),
  e(21, "… etwas Grünes auf dem Tisch zeigt. Los!"),
  e(22, "… ein Wort findet, das sich auf Tisch reimt. Los!"),
  e(23, "… drei Tiere nennt, die im Meer leben. Los!"),
  e(24, "… von zehn rückwärts bis null zählt. Los!"),
  e(25, "… vier Dinge nennt, die Räder haben. Los!"),
  e(26, "… drei Berufe aufzählt. Los!"),
  e(27, "… etwas mit dem eigenen Anfangsbuchstaben findet. Los!"),
  e(28, "… fünf Dinge nennt, die man in der Schule braucht. Los!"),
  e(29, "… zwei Wörter findet, die gleich klingen. Los!"),
  e(30, "… ein Geräusch macht, das die anderen erraten. Los!"),
  e(31, "… vier Dinge nennt, die man auf dem Spielplatz findet. Los!"),
  e(32, "… drei Musikinstrumente aufzählt. Los!"),
  e(33, "… ein Wort mit doppeltem Buchstaben findet. Los!"),
  e(34, "… fünf Sachen aufzählt, die gelb sind. Los!"),
  e(35, "… drei Dinge nennt, die man bei Regen braucht. Los!"),
  e(36, "… vier Vögel aufzählt. Los!"),
  e(37, "… ein Gesicht macht, das alle zum Lachen bringt. Los!"),
  e(38, "… drei Sachen nennt, die kalt sind. Los!"),
  e(39, "… fünf Dinge im Raum findet, die eckig sind. Los!"),
  e(40, "… einen Satz sagt, in dem jedes Wort mit M anfängt. Los!"),
];
