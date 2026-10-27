// Einkauf wie Bring (Tafel 35): Grundsortiment für den Katalog „Mehr
// hinzufügen“ – was fast jede Familie mal kauft. Abteilung kommt aus
// `sectionFor`, das Symbol aus `symbolFor`.

import { sectionFor, type Section } from "@/lib/einkauf/shoppingList";

const NAMES = [
  "Milch", "Käse", "Butter", "Joghurt", "Quark", "Eier", "Sahne",
  "Brot", "Brötchen", "Toast",
  "Äpfel", "Bananen", "Zitronen", "Orangen", "Trauben", "Beeren", "Avocado",
  "Tomaten", "Gurke", "Paprika", "Karotten", "Zwiebeln", "Knoblauch", "Kartoffeln", "Salat", "Brokkoli", "Champignons", "Petersilie",
  "Hähnchen", "Hackfleisch", "Wurst", "Aufschnitt", "Lachs",
  "Nudeln", "Reis", "Mehl", "Zucker", "Öl", "Salz", "Pfeffer", "Dosentomaten", "Müsli", "Kaffee", "Tee", "Schokolade", "Kekse",
  "Wasser", "Saft", "Bier", "Wein",
  "Eis", "Pizza",
  "Klopapier", "Küchenrolle", "Windeln", "Spülmittel", "Waschmittel", "Zahnpasta", "Shampoo",
];

export const BASICS: { name: string; section: Section }[] = NAMES.map((name) => ({ name, section: sectionFor(name) }));
