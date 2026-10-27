// Mia denkt mit: Texte für „Essen“ (Kachel vorstellen, erster Besuch der Seite).
// Erster Besuch stellt „Im Haus“ vor (gehört zu 1.0) – auch für alle, die die
// Seite vorher schon kannten (eigener Schlüssel `ESSEN_SEITE`).

export const ESSEN = {
  kachel: "Hier geht’s ums Essen. Sag mir, worauf ihr Lust habt, ich hab Ideen.",
  seite: "Sag mir, was im Kühlschrank ist. Dann koch ich spontan was mit dir.",
  href: "/?seite=essen",
} as const;

/** Erster Besuch der Essen-Seite (seit „Im Haus“; vorher `seite:essen`) */
export const ESSEN_SEITE = "seite:essen-imhaus";
