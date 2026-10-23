// Einkauf wie Bring (Tafel 35): welches gezeichnete Symbol ein Artikel
// bekommt. Zuordnung über Stichwörter wie `sectionFor` – Sonderfälle zuerst
// („Kokosmilch“ ist keine Milch, „Paprikapulver“ keine Paprika). Eigene
// Produkte („Alsan statt Butter“) nehmen das Symbol der Zutat. Unbekannt →
// null (die Kachel zeigt dann den Anfangsbuchstaben in der Abteilungsfarbe).
// Die Zeichnungen selbst: components/einkauf/kacheln/ItemSymbol.tsx.

/** Alle gezeichneten Symbole @public */
export const SYMBOLS = [
  "milch", "kaese", "butter", "joghurt", "eier", "sahne",
  "brot", "broetchen", "toast",
  "apfel", "banane", "zitrone", "orange", "trauben", "beeren", "avocado",
  "tomate", "gurke", "paprika", "karotte", "zwiebel", "knoblauch", "kartoffel", "salat", "brokkoli", "pilz", "kraeuter",
  "haehnchen", "fleisch", "wurst", "fisch",
  "nudeln", "reis", "mehl", "zucker", "oel", "salz", "dose", "gewuerz", "muesli", "kaffee", "tee", "schokolade", "kekse",
  "wasser", "saft", "bier", "wein",
  "eis", "pizza",
  "klopapier", "windeln", "spuelmittel", "waschmittel", "zahnpasta", "shampoo",
] as const;
export type SymbolId = (typeof SYMBOLS)[number];

/** Stichwort → Symbol; der erste Treffer zählt (Sonderfälle oben) */
const KEYWORDS: [string, SymbolId][] = [
  // Sonderfälle
  ["kokosmilch", "dose"], ["paprikapulver", "gewuerz"], ["currypulver", "gewuerz"], ["zitronensaft", "saft"], ["orangensaft", "saft"], ["apfelsaft", "saft"],
  ["tomatenmark", "dose"], ["passierte", "dose"], ["dosentomaten", "dose"], ["gehackte tomaten", "dose"], ["thunfisch", "dose"], ["mais", "dose"], ["bohnen", "dose"], ["kichererbsen", "dose"],
  ["fischstäbchen", "fisch"], ["butterkeks", "kekse"], ["buttermilch", "milch"], ["erdnussbutter", "butter"], ["käsekuchen", "kekse"],
  ["schlagsahne", "sahne"], ["sauerrahm", "sahne"], ["schmand", "sahne"], ["crème fraîche", "sahne"], ["creme fraiche", "sahne"],
  ["pizzateig", "pizza"], ["eis", "eis"], ["spülmittel", "spuelmittel"], ["spültabs", "spuelmittel"], ["waschmittel", "waschmittel"], ["weichspüler", "waschmittel"],
  ["klopapier", "klopapier"], ["toilettenpapier", "klopapier"], ["küchenrolle", "klopapier"], ["windel", "windeln"], ["zahnpasta", "zahnpasta"], ["zahncreme", "zahnpasta"],
  ["shampoo", "shampoo"], ["duschgel", "shampoo"], ["spülung", "shampoo"],
  ["frühlingszwiebel", "zwiebel"], ["süßkartoffel", "kartoffel"], ["hähnchen", "haehnchen"], ["huhn", "haehnchen"], ["pute", "haehnchen"], ["chicken", "haehnchen"],
  // Kühlregal
  ["milch", "milch"], ["hafermilch", "milch"], ["käse", "kaese"], ["gouda", "kaese"], ["mozzarella", "kaese"], ["parmesan", "kaese"], ["feta", "kaese"], ["butter", "butter"], ["margarine", "butter"],
  ["joghurt", "joghurt"], ["quark", "joghurt"], ["skyr", "joghurt"], ["ei", "eier"], ["eier", "eier"], ["sahne", "sahne"],
  // Brot
  ["brötchen", "broetchen"], ["semmel", "broetchen"], ["croissant", "broetchen"], ["toast", "toast"], ["brot", "brot"], ["baguette", "brot"],
  // Obst & Gemüse
  ["apfel", "apfel"], ["äpfel", "apfel"], ["banane", "banane"], ["zitrone", "zitrone"], ["limette", "zitrone"], ["orange", "orange"], ["mandarine", "orange"], ["clementine", "orange"],
  ["traube", "trauben"], ["beere", "beeren"], ["avocado", "avocado"], ["tomate", "tomate"], ["gurke", "gurke"], ["paprika", "paprika"], ["möhre", "karotte"], ["karotte", "karotte"],
  ["zwiebel", "zwiebel"], ["knoblauch", "knoblauch"], ["kartoffel", "kartoffel"], ["salat", "salat"], ["rucola", "salat"], ["spinat", "salat"], ["brokkoli", "brokkoli"], ["blumenkohl", "brokkoli"],
  ["pilz", "pilz"], ["champignon", "pilz"], ["petersilie", "kraeuter"], ["basilikum", "kraeuter"], ["schnittlauch", "kraeuter"], ["kräuter", "kraeuter"], ["dill", "kraeuter"], ["koriander", "kraeuter"],
  // Fleisch & Fisch
  ["hack", "fleisch"], ["rind", "fleisch"], ["schwein", "fleisch"], ["steak", "fleisch"], ["schnitzel", "fleisch"], ["fleisch", "fleisch"], ["wurst", "wurst"], ["würstchen", "wurst"], ["salami", "wurst"], ["schinken", "wurst"],
  ["lachs", "fisch"], ["fisch", "fisch"], ["garnele", "fisch"],
  // Vorrat
  ["nudel", "nudeln"], ["spaghetti", "nudeln"], ["pasta", "nudeln"], ["penne", "nudeln"], ["reis", "reis"], ["mehl", "mehl"], ["zucker", "zucker"], ["öl", "oel"], ["essig", "oel"], ["salz", "salz"], ["pfeffer", "gewuerz"],
  ["müsli", "muesli"], ["haferflocken", "muesli"], ["cornflakes", "muesli"], ["kaffee", "kaffee"], ["tee", "tee"], ["schokolade", "schokolade"], ["kekse", "kekse"], ["keks", "kekse"],
  ["dose", "dose"],
  // Getränke
  ["wasser", "wasser"], ["sprudel", "wasser"], ["saft", "saft"], ["bier", "bier"], ["wein", "wein"],
  // Tiefkühl
  ["pizza", "pizza"],
];

/** Wortanfang im Namen (nie mitten im Wort: „Steinpilz“ ok, „Feinkost“ ≠ „ei“) */
function hit(name: string, word: string): boolean {
  if (word.length <= 3) return new RegExp(`(?<![a-zäöüß])${word}(?![a-zäöüß])`, "i").test(name);
  return name.includes(word);
}

/** Symbol für einen Artikel – `products` (Zutat → euer Produkt) für eigene Produkte */
export function symbolFor(name: string, products: Record<string, string> = {}): SymbolId | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  for (const [word, id] of KEYWORDS) if (hit(n, word)) return id;
  // Eigenes Produkt („Alsan“ für Butter) → Symbol der Zutat
  const ingredient = Object.entries(products).find(([, product]) => product.trim().toLowerCase() === n)?.[0];
  return ingredient && ingredient !== n ? symbolFor(ingredient) : null;
}
