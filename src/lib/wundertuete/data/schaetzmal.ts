// Wundertüte · Schätz mal!: Schätzfrage vorne, Antwort hinten, wer am
// nächsten dran ist, gewinnt (ab 17 Uhr, zu zweit/Familie). Jede Zahl mit
// Quelle (nie angezeigt), vorsichtig gerundet.

import type { Anlass, Eintrag } from "@/lib/wundertuete/sorten";

const e = (n: number, vorne: string, hinten: string, quelle: string, anlass?: Anlass): Eintrag => ({ id: `sm-${String(n).padStart(3, "0")}`, sorte: "schaetzmal", vorne, hinten, quelle, ...(anlass ? { anlass } : {}) });

export const SCHAETZMAL: Eintrag[] = [
  e(1, "Wie viele Nudeln sind in 500 g Spaghetti?", "Je nach Dicke grob **500**, also ungefähr eine pro Gramm.", "Rechnung: eine Spaghetti Nr. 5 (rund 25 cm, 1,8 mm dick) wiegt knapp 1 g; dünnere Sorten haben deutlich mehr Stück je Packung", { gericht: ["spaghetti", "nudel", "pasta"] }),
  e(2, "Wie viele Tasten hat ein Klavier?", "**88**: 52 weiße und 36 schwarze.", "Encyclopaedia Britannica: Piano"),
  e(3, "Wie viele Felder hat ein Schachbrett?", "**64**, acht mal acht.", "FIDE Laws of Chess"),
  e(4, "Wie viele Sekunden hat ein Tag?", "**86.400**.", "Rechnung: 24 × 60 × 60 (Physikalisch-Technische Bundesanstalt, Zeiteinheiten)"),
  e(5, "Wie viele Minuten hat eine Woche?", "**10.080**.", "Rechnung: 7 × 24 × 60"),
  e(6, "Wie viele Beine haben drei Spinnen zusammen?", "**24**, jede hat acht.", "Encyclopaedia Britannica: Spider"),
  e(7, "Wie lang ist der Äquator?", "Rund **40.075** Kilometer.", "NASA Earth Fact Sheet"),
  e(8, "Wie lang ist die Elbe?", "Rund **1.094** Kilometer, von Tschechien bis zur Nordsee.", "Flussgebietsgemeinschaft Elbe (FGG Elbe)"),
  e(9, "Wie viele Menschen wohnen in Hamburg?", "Rund **1,9** Millionen.", "Statistisches Amt für Hamburg und Schleswig-Holstein"),
  e(10, "Wie hoch ist der Berliner Fernsehturm?", "**368** Meter.", "Berliner Fernsehturm: Daten und Fakten"),
  e(11, "Wie schwer ist ein Hühnerei der Größe M?", "Rund **60** Gramm.", "EU-Vermarktungsnormen für Eier (Größe M: 53 bis 63 g)"),
  e(12, "Wie viel wiegt ein Liter Wasser?", "Ziemlich genau **ein** Kilo.", "Physikalisch-Technische Bundesanstalt: Kilogramm"),
  e(13, "Wie weit ist es von Hamburg nach Berlin, Luftlinie?", "Rund **255** Kilometer.", "Bundesamt für Kartographie und Geodäsie (BKG), Entfernungsrechner"),
  e(14, "Wie schnell ist der Schall in der Luft?", "Rund **1.200** km/h.", "Physikalisch-Technische Bundesanstalt: Schallgeschwindigkeit (343 m/s bei 20 °C)"),
  e(15, "Wie viele Tage braucht der Mond für eine Runde um die Erde?", "Rund **27** Tage.", "NASA Moon Fact Sheet (siderische Umlaufzeit)"),
  e(16, "Wie lang ist die Zunge einer Giraffe?", "Rund **50** Zentimeter.", "San Diego Zoo Wildlife Alliance: Giraffe"),
  e(17, "Wie schwer ist ein Blauwal-Baby bei der Geburt?", "Rund **2,5** Tonnen.", "NOAA Fisheries: Blue whale"),
  e(18, "Wie viele Punkte hat ein Spielwürfel zusammen?", "**21**: eins bis sechs addiert.", "Rechnung: 1 + 2 + 3 + 4 + 5 + 6"),
  e(19, "Wie viele Karten hat ein Skatspiel?", "**32**.", "Deutscher Skatverband: Skatordnung"),
  e(20, "Wie lang ist ein Fußballfeld in der Bundesliga?", "**105** Meter.", "DFB: Fußball-Regeln, Spielfeld"),
  e(21, "Wie hoch ist der höchste Leuchtturm Deutschlands?", "Rund **65** Meter: der Leuchtturm Campen in Ostfriesland.", "Wasserstraßen- und Schifffahrtsverwaltung des Bundes (WSV): Leuchtturm Campen"),
  e(22, "Wie viele Brotsorten gibt es in Deutschland?", "Über **3.000**.", "Deutsches Brotinstitut; Deutsche UNESCO-Kommission: Brotkultur", { gericht: ["brot", "stulle", "abendbrot"] }),
  e(23, "Wie viele Tage dauert die Kieler Woche?", "**Neun** Tage.", "Landeshauptstadt Kiel: Kieler Woche", { saison: "sommer" }),
  e(24, "Wie viele Stunden hat ein Jahr?", "**8.760**, im Schaltjahr 24 mehr.", "Rechnung: 365 × 24"),
  e(25, "Wie hoch fliegt die ISS?", "Rund **400** Kilometer über uns.", "NASA: International Space Station facts"),
  e(26, "Wie hoch fliegt ein Ferienflieger?", "Rund **10** Kilometer.", "Deutsches Zentrum für Luft- und Raumfahrt (DLR): Reiseflughöhe"),
  e(27, "Wie oft schlägt ein Kolibri pro Sekunde mit den Flügeln?", "Bis zu rund **80** Mal.", "Encyclopaedia Britannica: Hummingbird"),
  e(28, "Wie viel frisst ein Elefant am Tag?", "Bis zu rund **150** Kilo Grünzeug.", "Encyclopaedia Britannica: Elephant"),
  e(29, "Wie alt kann ein Grönlandhai werden?", "Rund **400** Jahre.", "Nielsen et al., Science 353 (2016)"),
  e(30, "Wie hoch ist das Brandenburger Tor?", "Rund **26** Meter mit der Quadriga obendrauf.", "Berlin.de: Brandenburger Tor"),
  e(31, "Wie viele Spieler hat eine Fußballmannschaft auf dem Platz?", "**Elf**.", "DFB: Fußball-Regeln"),
  e(32, "Wie viele Tage hat ein Schaltjahr?", "**366**.", "Physikalisch-Technische Bundesanstalt: Kalender"),
  e(33, "Wie viele Wochen hat ein Jahr?", "**52** und ein bisschen.", "Rechnung: 365 / 7"),
  e(34, "Wie lang ist die Köhlbrandbrücke in Hamburg?", "Rund **3,6** Kilometer mit Auffahrten.", "Hamburg Port Authority: Köhlbrandbrücke"),
  e(35, "Wie viele Zentimeter Regen fallen in Deutschland im Jahr?", "Rund **80** Zentimeter, also 800 Liter pro Quadratmeter.", "Deutscher Wetterdienst (DWD): Klimamittel 1991 bis 2020", { wetter: "regen" }),
];
