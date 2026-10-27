// Die 150 Alltagsgerichte („Was gibt’s heute?“, Spontan kochen, Testmodus):
// je Gruppe eine Datei, jedes Gericht mit Rezept für 4 Personen – entweder
// hier (`zutaten`/`schritte`) oder schon in kochen/data*.ts (gleicher Titel).

import type { RecipeCategory } from "@/lib/essen/cookbook";

export type Season = "fruehling" | "sommer" | "herbst" | "winter";

/** Gruppen der Gerichte-Liste (für die Mischung der Ideen: höchstens 2 je Gruppe) */
export type Gruppe = "deutsch" | "nudeln" | "asiatisch" | "vegetarisch" | "fisch" | "fleisch" | "suppen" | "international" | "suess";

/** [Menge, Einheit, Zutat] für 4 Personen */
type Zutat = [number | null, string, string];

export type GerichtEintrag = {
  title: string;
  minutes: number;
  category: Exclude<RecipeCategory, "cheatday">;
  /** Hauptzutaten (ohne Salz, Öl, Zwiebel & Co.) */
  needs: string[];
  /** Nur in dieser Jahreszeit bei „Was gibt’s heute?“ */
  season?: Season;
  /** Geht meistens mit Grundzutaten – für leeren Vorrat */
  usual?: boolean;
  /** Wie beliebt in Deutschland (5 = Lieblingsgericht vieler Familien) */
  beliebt: 1 | 2 | 3 | 4 | 5;
  /** Essen Kinder meistens gern */
  kind: boolean;
  /** Rezept, falls es noch keins in kochen/data*.ts gibt */
  zutaten?: Zutat[];
  schritte?: string[];
  /** Exotisch oder kreativ („Mehr Ideen“: Besonders) */
  besonders?: true;
};

export type Gericht = GerichtEintrag & { gruppe: Gruppe };
