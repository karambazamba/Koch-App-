// Tipps auf Lottes Platz: eingebaute Sammlung (später per KI erweiterbar).

export type TipCategory = "profi" | "gericht" | "sparen" | "reste" | "vorrat" | "wochenende";

export type Tip = {
  /** Eindeutig, kurz, nur a–z, 0–9 und "-", z. B. "bolognese-milch" */
  id: string;
  category: TipCategory;
  /** Kleine Überschrift (wird groß geschrieben angezeigt); leer = Standard der Kategorie */
  title?: string;
  /** 1–2 kurze Sätze auf der Karte */
  text: string;
  /** "Mehr dazu": kurze Erklärung (1–3 Sätze) */
  detail: string;
  /** Optional 2–3 kurze Schritte */
  steps?: string[];
  /** Nur Kategorie "gericht": passt zu Gerichten, deren Name hierauf passt */
  match?: RegExp;
  /** Nur für Haushalte mit Kindern, ohne Kinder bzw. nur zu zweit */
  audience?: "kids" | "nokids" | "paar";
};
