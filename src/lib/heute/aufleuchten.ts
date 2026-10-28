// Aufleuchten in der Kachel (A-037, Tafel 126): Was Mia eben eingetragen hat,
// leuchtet nach dem Schließen der Bühne (oder bei der Rückkehr zur
// Startseite) EINMAL weich orange in seiner Kachel – die Zeile, wenn sie dort
// steht, sonst die Kachel als Ganzes. Der Merker lebt nur im Arbeitsspeicher
// (nichts wird gespeichert): nach dem Leuchten ist der Eintrag verbraucht.

import type { HomeTileId } from "@/lib/core/homeLayout";

/** Was leuchten soll: Kachel und Schlüssel der Zeile („" = Kachel als Ganzes) */
export type Leuchten = { kachel: HomeTileId; schluessel: string };

/** So lange leuchtet es (ein- und ausblenden) */
export const LEUCHT_MS = 1500;

/** Fehlt eine Kachel noch (die Startseite lädt nach), so oft im Abstand nachsehen */
export const NACHSEHEN_MS = 250;
const NACHSEHEN_MAL = 12;

/**
 * Noch warten statt verbrauchen? Ja, solange nicht jedes Ziel seine Kachel
 * gefunden hat und die Startseite noch nachladen kann (höchstens ~3 s) –
 * sonst wäre der Eintrag bei der Rückkehr zur Startseite schon verbraucht,
 * bevor seine Kachel da ist.
 */
export const leuchtenWarten = (gefunden: number, gesamt: number, versuch: number): boolean => gefunden < gesamt && versuch < NACHSEHEN_MAL;

let wartend: Leuchten[] = [];
let buehneOffen = false;
let version = 0;
const hoerer = new Set<() => void>();
const melden = () => {
  version++;
  for (const h of hoerer) h();
};
const gleich = (a: Leuchten, b: Leuchten) => a.kachel === b.kachel && a.schluessel === b.schluessel;

/** Schlüssel einer Zeile: `eintrag:<id>`, `einkauf:<name>`, `notiz:<id>` (klein, ohne Leerzeichen) */
export const leuchtSchluessel = (art: "eintrag" | "einkauf" | "notiz", wert: string) => `${art}:${wert.trim().toLowerCase().replace(/\s+/g, "_")}`;

/** Mia hat etwas eingetragen: leuchtet, sobald die Bühne zu ist */
export function leuchtenMerken(ziele: readonly Leuchten[]) {
  const neu = ziele.filter((z) => !wartend.some((w) => gleich(w, z)));
  if (!neu.length) return;
  wartend = [...wartend, ...neu];
  melden();
}

/** Rückgängig: das soll nicht mehr leuchten */
export function leuchtenVergessen(ziele: readonly Leuchten[]) {
  const rest = wartend.filter((w) => !ziele.some((z) => gleich(w, z)));
  if (rest.length === wartend.length) return;
  wartend = rest;
  melden();
}

/** Bühne auf/zu – solange sie offen ist, leuchtet nichts */
export function buehneGeoeffnet(offen: boolean) {
  if (buehneOffen === offen) return;
  buehneOffen = offen;
  melden();
}

/** Was jetzt leuchten darf (leer, solange die Bühne offen ist) */
export const leuchtenJetzt = (): Leuchten[] => (buehneOffen ? [] : wartend);

/** Hat geleuchtet – nie wieder */
export function geleuchtet(ziele: readonly Leuchten[]) {
  leuchtenVergessen(ziele);
}

export function leuchtenAbo(h: () => void) {
  hoerer.add(h);
  return () => {
    hoerer.delete(h);
  };
}

export const leuchtVersion = () => version;

/** Nur für Tests: alles vergessen @public */
export function leuchtenZuruecksetzen() {
  wartend = [];
  buehneOffen = false;
  melden();
}
