// Wundertüte aus dem Gespräch öffnen (A-064): „Gib mir ein Rätsel“, „Rätsel!“,
// „Hast du ein Rätsel?“ → die Bühne geht zu, die Wundertüte-Seite öffnet mit
// der Sorte Rätsel (`/wundertuete?sorte=raetsel`). Gastgeber ist der
// Mia-Knopf im Layout (`begleitung/KitchenHelper`), der die Seite wechselt.

import type { Filter } from "@/lib/wundertuete/sorten";

const hoerer = new Set<(sorte: Filter) => void>();

/** Die Wundertüte mit dieser Sorte öffnen */
export function oeffneWundertuete(sorte: Filter) {
  hoerer.forEach((h) => h(sorte));
}

/** Für den Gastgeber: jemand will die Wundertüte öffnen */
export function onWundertueteOeffnen(h: (sorte: Filter) => void): () => void {
  hoerer.add(h);
  return () => void hoerer.delete(h);
}

/** Adresse der Seite mit vorgewählter Sorte */
export const wundertueteHref = (sorte: Filter) => (sorte === "alles" ? "/wundertuete" : `/wundertuete?sorte=${sorte}`);

/** Will jemand ein Rätsel? („Gib mir ein Rätsel“, „Rätsel!“, „Hast du ein Rätsel für uns?“, „Ich will raten“) */
export function raetselWunsch(text: string): boolean {
  const t = text.toLowerCase().replace(/[!?.,]+/g, " ").replace(/\s+/g, " ").trim();
  // Lösung oder Löschen gehören woanders hin; Mini-Kreis-Befehle („Rätsel oben raus“) gibt es nicht mehr
  if (/(?<![a-zäöüß])(lösung|loesung|lösen|löschen|raus|weg)(?![a-zäöüß])/.test(t)) return false;
  return /^(ein |noch ein |n )?r(ä|ae)tsel( bitte)?$/.test(t) || /(?<![a-zäöüß])(gib|gibst|erzähl|erzähle|stell|stelle|hast|habt|kennst|mach|zeig)(?![a-zäöüß]).*(?<![a-zäöüß])r(ä|ae)tsel(?![a-zäöüß])/.test(t) || /(?<![a-zäöüß])ich (will|möchte) (was )?raten(?![a-zäöüß])/.test(t);
}
