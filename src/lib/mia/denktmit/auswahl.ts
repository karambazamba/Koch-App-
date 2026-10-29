// Mia denkt mit: was steht heute? Aus allen Kandidaten (Muster, Mitdenken,
// Vorstellen – in dieser Reihenfolge; davor der Kurz-Check „Im Haus“ am
// Sonntagabend, der in der Jetzt-Karte steht) höchstens EINE Karte am Tag
// („Gesprächig“ zwei), nach den Regeln in `regeln.ts`. Eine Karte, die heute
// schon stand, bleibt bis zur Antwort. Rein.

import { darf, type HinweisArt, type Lage } from "@/lib/mia/denktmit/regeln";
import type { DenktState } from "@/lib/mia/denktmit/store";
import type { EssenMuster, Muster } from "@/lib/mia/denktmit/muster";
import type { MitdenkTipp } from "@/lib/mia/denktmit/mitdenken";
import type { Vorstellung } from "@/lib/mia/denktmit/vorstellen";

export type DenktKarte =
  | { art: "muster"; key: string; satz: string; muster: Muster }
  | { art: "essen"; key: string; satz: string; muster: EssenMuster }
  | { art: "mitdenken"; key: string; satz: string; tipp: MitdenkTipp }
  | { art: "vorstellen"; key: string; satz: string; v: Vorstellung }
  /** Kurz-Check „Im Haus“ (`vorrat/kuehlcheck.ts`): zählt wie ein Mitdenken-Hinweis */
  | { art: "kuehlcheck"; key: string; satz: string; woche: string };

export type Umfeld = Omit<Lage, "heute" | "level"> & { today: string };

/** Welche Regel gilt für diese Karte? */
const regelArt = (k: DenktKarte): HinweisArt => (k.art === "essen" ? "muster" : k.art === "kuehlcheck" ? "mitdenken" : k.art);

export function heutigeKarte(kandidaten: DenktKarte[], s: DenktState, u: Umfeld): DenktKarte | null {
  const shown = s.tage[u.today] ?? [];
  const lage: Lage = { ...u, level: s.level, heute: shown.length };
  // Steht schon (heute gezählt): bleibt, solange erlaubt
  const stand = kandidaten.find((k) => shown.includes(k.key));
  if (stand) return darf(regelArt(stand), { ...lage, heute: 0 }) ? stand : null;
  return kandidaten.find((k) => darf(regelArt(k), lage)) ?? null;
}
