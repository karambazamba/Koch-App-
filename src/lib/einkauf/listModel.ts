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

export type ShoppingListStore = {
  /** v4: eigene Produkte, Läden, Stammliste (statt "Immer da") */
  version: 4;
  weeks: Record<string, WeekList>;
  /** Zutat (klein) → euer Produkt */
  products: Record<string, string>;
  /** Selbst angelegte Läden */
  shops: string[];
  /** Artikel (Anzeigename, klein) → Laden */
  itemShops: Record<string, string>;
  staples: Staple[];
};

export type ShoppingSettings = Pick<ShoppingListStore, "products" | "shops" | "itemShops" | "staples">;

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
  /** Laden, falls gemerkt */
  shop: string;
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
};

export type ShoppingList = {
  items: ListItem[];
  /** Gerichte ohne Zutaten (Freitext, Wunsch, Rezept ohne Zutaten) */
  missing: string[];
  openCount: number;
  doneCount: number;
};

export const EMPTY_LIST: WeekList = { manual: [], checked: [], have: [] };

export const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);

export const lower = (s: string) => s.trim().toLowerCase();
