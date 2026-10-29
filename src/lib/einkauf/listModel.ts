// Einkaufsliste: Datenmodell (gespeicherter Teil je Woche, Stammartikel,
// zusammengesetzte Liste) und kleine gemeinsame Helfer.

import type { Section } from "@/lib/einkauf/sections";

export type ManualItem = {
  id: string;
  name: string;
  amount: string;
  section: Section;
  done: boolean;
  /** Für einen bestimmten Tag (Wochentag) – erscheint dann unter "Für heute" */
  day?: string;
  /** "Jetzt mitnehmen" (aus dem Supermarkt-Gespräch) – steht oben, bis abgehakt */
  now?: boolean;
  /** Für welches Gericht (z. B. von Lotte angelegt) */
  dish?: string;
  /** Konto, das es auf die Liste gesetzt hat (nur im Haushalt, kommt vom Abgleich) */
  von?: string;
  /** Aus einem Rezept: die Rezeptmenge („250 ml“) – nur als Hinweis im Zeilen-Fenster, nie als Menge auf der Liste (A-040) */
  rezeptMenge?: string;
};

export type WeekList = {
  manual: ManualItem[];
  /** Schlüssel abgehakter Artikel aus Rezepten */
  checked: string[];
  /** Schlüssel von Artikeln, die wir schon haben (für diese Woche ausgeblendet) */
  have: string[];
  /** Nur diese Woche umbenannt ("Nur diesmal"): Schlüssel → Name */
  renamed?: Record<string, string>;
  /** Stammartikel, die diese Woche nicht vorgeschlagen werden ("diesmal nicht") */
  skippedStaples?: string[];
  /** „Einkauf fertig“: Schlüssel abgehakter Artikel, die nicht mehr in „Im Wagen“ stehen */
  fertig?: string[];
};

/** Stammartikel: häufig gekauft, mit Kaufrhythmus */
export type Staple = {
  id: string;
  name: string;
  amount: string;
  section: Section;
  /** Kauftage "YYYY-MM-DD" (aus abgehakten Artikeln) */
  purchases: string[];
  /** Fester Rhythmus in Tagen (z. B. aus "Immer da": 7); null = gelernt */
  intervalDays: number | null;
  active: boolean;
};

/** Gelernt beim Abhaken auf einer Laden-Seite (A-041): zuletzt dort abgehakt, wie oft hintereinander, wann zuletzt */
export type Gelernt = { shop: string; n: number; /** „YYYY-MM-DD“ (fehlt nur bei Ständen anderer Geräte vor v8 = gilt) */ am?: string };

export type ShoppingListStore = {
  /** v8: Gelerntes mit Datum, Wochenplan als Angebot, Rezeptmengen nur als Hinweis (A-040/A-041); v7: Doppeltes zusammengefasst (Nachtrag A-018); v6: feste Laden-Regeln, Gelerntes, „hat man da“-Ausnahmen; v5: „Meine Läden“ + schon gefragt; v4: eigene Produkte, Läden, Stammliste */
  version: 8;
  weeks: Record<string, WeekList>;
  /** Zutat (klein) → euer Produkt */
  products: Record<string, string>;
  /** Selbst angelegte Läden */
  shops: string[];
  /** Artikel (Anzeigename, klein) → Laden; "" = bewusst „Egal wo“, kein Eintrag = noch ohne Laden */
  itemShops: Record<string, string>;
  staples: Staple[];
  /** „Meine Läden“ in gewählter Reihenfolge (leer = noch keine gewählt) */
  myShops: string[];
  /** „In welchen Läden kaufst du ein?“ schon beantwortet (Fertig oder Später) – nie wieder fragen */
  shopsAsked: boolean;
  /** Feste Regeln „immer“: Artikel (klein) → Laden („Tomaten kaufe ich immer bei Rewe“) */
  shopRules: Record<string, string>;
  /** Gelernt beim Abhaken auf einer Laden-Seite: Artikel (klein; gefunden wird über die Normalform) → Laden, Zähler, Datum */
  learned: Record<string, Gelernt>;
  /** Früher: schon gefragt „Soll ich mir das merken?“ (seit A-041 ungenutzt, bleibt als Wert) */
  learnAsked: string[];
  /** Grundsachen, die trotzdem immer auf die Liste sollen (sonst „Hast du bestimmt im Haus“) */
  alwaysList: string[];
  /**
   * Wochenplan-Zutaten sind ein Angebot (A-040) für Wochen ab diesem Beginn;
   * "" = immer. Wochen davor (Stand vor v8) rechnen wie früher von selbst – was
   * schon auf der Liste stand, bleibt.
   */
  angebotAb: string;
};

export type ShoppingSettings = Pick<ShoppingListStore, "products" | "shops" | "itemShops" | "staples"> & Partial<Pick<ShoppingListStore, "shopRules" | "alwaysList" | "learned" | "angebotAb">>;

export type ListItem = {
  key: string;
  /** Angezeigter Name (euer Produkt bzw. umbenannt) */
  name: string;
  /** Name aus Rezept bzw. wie eingegeben */
  originalName: string;
  amount: string;
  section: Section;
  /** Für welche Gerichte, z. B. "Gulasch (Mi)" */
  dishes: string[];
  /** Wochentage der Gerichte */
  days: string[];
  /** Laden, falls gemerkt ("" = egal wo oder noch ohne Laden) */
  shop: string;
  /** Bewusst „Egal wo“ gewählt (sonst ist ein Artikel ohne Laden „noch ohne Laden“) */
  anywhere?: boolean;
  /** Nur für eine lockere Wochenend-Idee – optional, abwählbar */
  optional?: boolean;
  /** Nur bei eigenen Artikeln */
  manualId?: string;
  /** Wer es auf die Liste gesetzt hat (Konto, nur im Haushalt) */
  von?: string;
  /** "Jetzt mitnehmen" – oben in der Liste */
  now?: boolean;
  checked: boolean;
  /** "Haben wir schon" – für diese Woche ausgeblendet */
  hidden: boolean;
  /** Mit diesem zusammengefasste eigene Artikel (gleiche Sache, gleicher Laden) – abhaken/löschen gilt für alle */
  teile?: string[];
  /** Hinweis im Zeilen-Fenster (nie auf der Liste): Rezeptmenge und Gericht („250 ml für Lasagne“) */
  hinweis?: string;
  /** Übliche Packung als Vorschlag im Mengenfeld („1 Packung“), nie als Menge */
  packung?: string;
  /** Rezeptmenge („250 ml“) – nur Hinweis (Zeilen-Fenster, Angebot übernehmen) */
  rezeptMenge?: string;
  /** „Einkauf fertig“ schon gedrückt (abgehakt, nicht mehr im Wagen) */
  fertig?: boolean;
};

export type ShoppingList = {
  items: ListItem[];
  /** Zutaten aus dem Wochenplan, die (noch) nicht auf der Liste stehen: ein Angebot (A-040) */
  angebot: ListItem[];
  /** Gerichte ohne Zutaten (Freitext, Wunsch, Rezept ohne Zutaten) */
  missing: string[];
  openCount: number;
  doneCount: number;
};

export const EMPTY_LIST: WeekList = { manual: [], checked: [], have: [] };

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const lower = (s: string) => s.trim().toLowerCase();
