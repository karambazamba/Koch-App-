// Abhaken mit Bedenkzeit, überall gleich (Einkauf im Laden, Pinnwand):
// Häkchen orange, 1 s stehen (nochmal tippen = doch nicht), dann gleitet der
// Eintrag 0,8 s weich weg – nur transform/opacity, `prefers-reduced-motion` =
// nur Überblenden. Nie durchstreichen.

/** Nach dem Abhaken bleibt der Eintrag so lange stehen (nochmal tippen = doch nicht) */
export const STEHEN_MS = 1000;
/** Danach gleitet er so lange weich weg */
export const GLEITEN_MS = 800;
