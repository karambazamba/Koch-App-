// Mia denkt mit: was steht heute? Aus allen Kandidaten (Muster, Mitdenken,
// Vorstellen – in dieser Reihenfolge) höchstens EINE Karte am Tag
// („Gesprächig“ zwei), nach den Regeln in `regeln.ts`. Eine Karte, die heute
// schon stand, bleibt bis zur Antwort. Der Spruch kommt nur, wenn heute keine
// Karte stand. Rein.

import { darf, type Lage } from "@/lib/mia/denktmit/regeln";
import { pickSpruch, type SpruchAnlass } from "@/lib/mia/denktmit/sprueche";
import type { DenktState } from "@/lib/mia/denktmit/store";
import type { EssenMuster, Muster } from "@/lib/mia/denktmit/muster";
import type { MitdenkTipp } from "@/lib/mia/denktmit/mitdenken";
import type { Vorstellung } from "@/lib/mia/denktmit/vorstellen";

export type DenktKarte =
  | { art: "muster"; key: string; satz: string; muster: Muster }
  | { art: "essen"; key: string; satz: string; muster: EssenMuster }
  | { art: "mitdenken"; key: string; satz: string; tipp: MitdenkTipp }
  | { art: "vorstellen"; key: string; satz: string; v: Vorstellung };

export type Umfeld = Omit<Lage, "heute" | "level"> & { today: string };

export function heutigeKarte(kandidaten: DenktKarte[], s: DenktState, u: Umfeld): DenktKarte | null {
  const shown = s.tage[u.today] ?? [];
  const lage: Lage = { ...u, level: s.level, heute: shown.length };
  // Steht schon (heute gezählt): bleibt, solange erlaubt
  const stand = kandidaten.find((k) => shown.includes(k.key));
  if (stand) return darf(stand.art === "essen" ? "muster" : stand.art, { ...lage, heute: 0 }) ? stand : null;
  return kandidaten.find((k) => darf(k.art === "essen" ? "muster" : k.art, lage)) ?? null;
}

/** Spruch des Tages – nur ohne Karte heute, stabil über den Tag */
export function spruchHeute(s: DenktState, u: Umfeld, anlass: SpruchAnlass[]): string | null {
  if ((s.tage[u.today]?.length ?? 0) > 0) return null;
  if (!darf("spruch", { ...u, level: s.level, heute: 0 })) return null;
  return s.sprueche.find((x) => x.date === u.today)?.text ?? pickSpruch(anlass, s.sprueche, u.today);
}
