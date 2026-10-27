// Mia denkt mit: Texte je Kachel und Seite, eine Datei je Seite. Ton: knapp,
// norddeutsch, kein Gedankenstrich, höchstens 2 Sätze.

import { AUFGABEN } from "@/lib/mia/denktmit/seiten/aufgaben";
import { EINKAUF } from "@/lib/mia/denktmit/seiten/einkauf";
import { ESSEN, ESSEN_SEITE } from "@/lib/mia/denktmit/seiten/essen";
import { NOTIZEN } from "@/lib/mia/denktmit/seiten/notizen";
import { PINNWAND } from "@/lib/mia/denktmit/seiten/pinnwand";
import { TERMINE } from "@/lib/mia/denktmit/seiten/termine";
import { TIMER } from "@/lib/mia/denktmit/seiten/timer";
import { WETTER } from "@/lib/mia/denktmit/seiten/wetter";

/** Reihenfolge der Vorstellung: Termine, Aufgaben, Einkauf, Essen, Pinnwand, Wetter, Notizen, Timer */
export const VORSTELLEN = [
  { tile: "termine", ...TERMINE },
  { tile: "aufgaben", ...AUFGABEN },
  { tile: "einkauf", ...EINKAUF },
  { tile: "essen", ...ESSEN },
  { tile: "pinnwand", ...PINNWAND },
  { tile: "wetter", ...WETTER },
  { tile: "notizen", ...NOTIZEN },
  { tile: "timer", ...TIMER },
] as const;

export type VorstellTile = (typeof VORSTELLEN)[number]["tile"];

/** Erster Besuch: welche Seite ist das? (Pfad, Kalender und Essen sind Seiten der Startseite: `seite:…`) */
export const SEITE_FUER: Record<string, VorstellTile> = {
  "seite:kalender": "termine",
  "/aufgaben": "aufgaben",
  "/einkaufsliste": "einkauf",
  // früherer Besuch zählt weiter als „benutzt“, die Karte kommt mit dem neuen Schlüssel einmal
  "seite:essen": "essen",
  [ESSEN_SEITE]: "essen",
  "/pinnwand": "pinnwand",
  "/wetter": "wetter",
  "/notizen": "notizen",
};

/** Schlüssel für den ersten Besuch einer Seite der Startseite (Kalender, Essen) */
export const seiteFuerTab = (tab: string) => (tab === "essen" ? ESSEN_SEITE : `seite:${tab}`);
