// Austauschbare Datenquelle für Tipps aus der Region. Die Oberfläche kennt nur
// `Tip`; ob die Daten aus Beispielen oder der Landesdatenbank kommen, entscheidet
// der Schalter TIPS_SOURCE (off | demo | tldb) auf dem Server.

import type { Tip } from "../model";

/** Gebiet: vorerst ganz Schleswig-Holstein */
export type TipArea = { name: string; bbox: [south: number, west: number, north: number, east: number] };

export const SCHLESWIG_HOLSTEIN: TipArea = { name: "Schleswig-Holstein", bbox: [53.35, 7.85, 55.06, 11.35] };

export interface TipSource {
  readonly id: Tip["quelle"];
  /** Veranstaltungen von–bis (inklusive, "YYYY-MM-DD") im Gebiet */
  fetchRange(von: string, bis: string, gebiet: TipArea): Promise<Tip[]>;
}
