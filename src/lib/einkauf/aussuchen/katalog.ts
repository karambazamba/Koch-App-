// Aussuchen (Tafel 111): der Katalog in festen Abschnitten – was fast jede
// Familie mal kauft. Die Abschnitte sind nur zum Anzeigen; gespeichert wird
// wie bisher die Abteilung (`sectionFor`), nichts geht verloren. „Süßes &
// Snacks“ und „Drogerie & Haushalt“ gibt es nur hier.

import { sectionFor, type Section } from "@/lib/einkauf/sections";
import { abteilungSymbol } from "@/lib/einkauf/kacheln/abteilung";

export type KatalogAbschnitt = "obst-gemuese" | "brot" | "kuehlregal" | "fleisch" | "vorrat" | "tiefkuehl" | "getraenke" | "suesses" | "drogerie";

/** Feste Reihenfolge (Drogerie & Haushalt immer zuletzt) */
export const KATALOG_REIHE: { id: KatalogAbschnitt; label: string }[] = [
  { id: "obst-gemuese", label: "Obst & Gemüse" },
  { id: "brot", label: "Brot & Backwaren" },
  { id: "kuehlregal", label: "Kühlregal" },
  { id: "fleisch", label: "Fleisch & Wurst" },
  { id: "vorrat", label: "Vorrat" },
  { id: "tiefkuehl", label: "Tiefkühl" },
  { id: "getraenke", label: "Getränke" },
  { id: "suesses", label: "Süßes & Snacks" },
  { id: "drogerie", label: "Drogerie & Haushalt" },
];

export const KATALOG: Record<KatalogAbschnitt, string[]> = {
  "obst-gemuese": ["Äpfel", "Bananen", "Tomaten", "Gurke", "Paprika", "Karotten", "Zwiebeln", "Kartoffeln", "Salat", "Zucchini", "Brokkoli", "Champignons", "Zitronen", "Orangen", "Trauben", "Beeren", "Avocado", "Knoblauch", "Petersilie", "Spinat"],
  brot: ["Brot", "Brötchen", "Toast", "Baguette", "Croissants", "Knäckebrot", "Wraps", "Kuchen"],
  kuehlregal: ["Milch", "Butter", "Käse", "Joghurt", "Quark", "Eier", "Sahne", "Frischkäse", "Mozzarella", "Schmand", "Hafermilch", "Tofu"],
  fleisch: ["Aufschnitt", "Wurst", "Salami", "Schinken", "Hackfleisch", "Hähnchen", "Würstchen", "Lachs", "Fischstäbchen"],
  vorrat: ["Nudeln", "Reis", "Mehl", "Zucker", "Öl", "Salz", "Pfeffer", "Dosentomaten", "Müsli", "Haferflocken", "Honig", "Marmelade", "Senf", "Ketchup", "Brühe", "Kaffee", "Tee"],
  tiefkuehl: ["Pizza", "Eis", "Pommes", "Erbsen", "Tiefkühlgemüse"],
  getraenke: ["Wasser", "Saft", "Apfelschorle", "Bier", "Wein", "Cola"],
  suesses: ["Schokolade", "Kekse", "Chips", "Gummibärchen", "Nüsse"],
  drogerie: ["Klopapier", "Küchenrolle", "Taschentücher", "Zahnpasta", "Zahnbürste", "Shampoo", "Duschgel", "Deo", "Windeln", "Feuchttücher", "Spülmittel", "Spültabs", "Waschmittel", "Müllbeutel", "Schwämme"],
};

const SUESS = /(schoko|keks|chips|gummibär|bonbon|süßigkeit|lakritz|nüsse|riegel|praline|popcorn|salzstangen|flips)/i;
const HAUSHALT = /(alufolie|frischhaltefolie|backpapier|gefrierbeutel|batterie|kerze|katzenfutter|hundefutter|katzenstreu|spültabs|tabs|klarspüler)/i;

const VON_SECTION: Record<Section, KatalogAbschnitt> = {
  "obst-gemuese": "obst-gemuese",
  brot: "brot",
  kuehlregal: "kuehlregal",
  "fleisch-fisch": "fleisch",
  vorrat: "vorrat",
  tiefkuehl: "tiefkuehl",
  getraenke: "getraenke",
  sonstiges: "vorrat",
};

/** In welchem Abschnitt steht eine Sache? (Sonderfälle zuerst, dann die Abteilung) */
export function abschnittFuer(name: string): KatalogAbschnitt {
  const direkt = (Object.keys(KATALOG) as KatalogAbschnitt[]).find((id) => KATALOG[id].some((n) => n.toLowerCase() === name.trim().toLowerCase()));
  if (direkt) return direkt;
  if (SUESS.test(name)) return "suesses";
  if (HAUSHALT.test(name)) return "drogerie";
  const symbol = abteilungSymbol(name);
  if (symbol === "drogerie") return "drogerie";
  if (symbol === "obst") return "obst-gemuese";
  return VON_SECTION[sectionFor(name) === "sonstiges" && symbol === "kuehlregal" ? "kuehlregal" : sectionFor(name)];
}

/** Ohne Verlauf: „Beliebt“ – 9 typische Grundsachen (im Drogerie-Laden Drogerie) */
export const BELIEBT = ["Milch", "Brot", "Butter", "Eier", "Käse", "Äpfel", "Bananen", "Tomaten", "Nudeln"];
export const BELIEBT_DROGERIE = ["Klopapier", "Zahnpasta", "Duschgel", "Shampoo", "Spülmittel", "Waschmittel", "Küchenrolle", "Taschentücher", "Deo"];

/** Alle Namen des Katalogs (für die Suche) */
export const KATALOG_ALLE = Object.values(KATALOG).flat();
