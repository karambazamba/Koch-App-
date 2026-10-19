// Austauschbare Schnittstelle: Text (gesprochen oder getippt) → Zutaten.
// Heute regelbasiert (./ruleParser.ts); später ersetzt die KI das Zerlegen –
// dann nur `parseLeftovers` hier umstellen, die Seite bleibt gleich.

import { ruleParseLeftovers } from "./ruleParser";

export type ParsedLeftover = {
  /** Anzeigename, z. B. "Brokkoli" (Schreibweise korrigiert) */
  name: string;
  amount: number | null;
  /** "Becher", "g", … ; leer = Stück/Anzahl */
  unit: string;
  /** Als Lebensmittel erkannt? Sonst als unsicherer Chip nachfragen */
  known: boolean;
  /** Bei unbekannten Wörtern: ähnlichstes Lebensmittel ("Meintest du …?") */
  suggestion: string | null;
  /** Was tatsächlich gehört/getippt wurde */
  heard: string;
};

export type LeftoverParser = (text: string) => Promise<ParsedLeftover[]>;

/** Aktuelle Umsetzung – asynchron, damit die KI später ohne Umbau passt */
export const parseLeftovers: LeftoverParser = async (text) => ruleParseLeftovers(text);
