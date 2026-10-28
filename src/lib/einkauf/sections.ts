// Einkaufsliste: Abteilungen in Supermarkt-Reihenfolge und die Zuordnung
// einer Zutat zu ihrer Abteilung per Stichwort.

export type Section =
  | "obst-gemuese"
  | "fleisch-fisch"
  | "kuehlregal"
  | "brot"
  | "vorrat"
  | "tiefkuehl"
  | "getraenke"
  | "sonstiges";

/** Reihenfolge wie der Laufweg im Supermarkt (Regel `SECTION_WALK` in core/sort) */
export const SECTIONS: { value: Section; label: string; emoji: string }[] = [
  { value: "obst-gemuese", label: "Obst & Gemüse", emoji: "🥕" },
  { value: "brot", label: "Brot & Backwaren", emoji: "🥖" },
  { value: "kuehlregal", label: "Kühlregal", emoji: "🧀" },
  { value: "fleisch-fisch", label: "Fleisch & Fisch", emoji: "🥩" },
  { value: "vorrat", label: "Vorrat/Trockenware", emoji: "🥫" },
  { value: "getraenke", label: "Getränke", emoji: "🧃" },
  { value: "tiefkuehl", label: "Tiefkühl", emoji: "🧊" },
  { value: "sonstiges", label: "Sonstiges", emoji: "🛍️" },
];

export const SECTION_VALUES = SECTIONS.map((s) => s.value);

/**
 * Stichwörter → Abteilung. Der erste Treffer zählt, daher stehen
 * Sonderfälle ("paprikapulver", "kokosmilch", "fischstäbchen") vor den
 * allgemeinen Wörtern ("paprika", "milch", "fisch").
 */
const KEYWORDS: [string, Section][] = [
  // Sonderfälle zuerst
  ["zitronensaft", "vorrat"], ["saft", "getraenke"],
  ["paprikapulver", "vorrat"], ["currypulver", "vorrat"], ["tomatenmark", "vorrat"],
  ["passierte", "vorrat"], ["dosentomaten", "vorrat"], ["gehackte tomaten", "vorrat"],
  ["kokosmilch", "vorrat"], ["fischstäbchen", "tiefkuehl"], ["pommes", "tiefkuehl"],
  ["tiefkühl", "tiefkuehl"], ["tk-", "tiefkuehl"], ["gefroren", "tiefkuehl"],
  ["pizzateig", "kuehlregal"], ["blätterteig", "kuehlregal"], ["hefeteig", "kuehlregal"],
  ["thunfisch", "vorrat"], ["frühlingszwiebel", "obst-gemuese"], ["süßkartoffel", "obst-gemuese"],
  ["semmelbrösel", "vorrat"], ["paniermehl", "vorrat"], ["brühe", "vorrat"],
  ["melone", "obst-gemuese"], ["tortellini", "vorrat"], ["kuchen", "brot"], ["torte", "brot"], ["gebäck", "brot"],
  // Obst & Gemüse
  ["zwiebel", "obst-gemuese"], ["knoblauch", "obst-gemuese"], ["kartoffel", "obst-gemuese"],
  ["tomate", "obst-gemuese"], ["gurke", "obst-gemuese"], ["paprika", "obst-gemuese"],
  ["möhre", "obst-gemuese"], ["karotte", "obst-gemuese"], ["salat", "obst-gemuese"],
  ["zucchini", "obst-gemuese"], ["aubergine", "obst-gemuese"], ["brokkoli", "obst-gemuese"],
  ["blumenkohl", "obst-gemuese"], ["spinat", "obst-gemuese"], ["lauch", "obst-gemuese"],
  ["porree", "obst-gemuese"], ["sellerie", "obst-gemuese"], ["kürbis", "obst-gemuese"],
  ["pilz", "obst-gemuese"], ["champignon", "obst-gemuese"], ["apfel", "obst-gemuese"],
  ["äpfel", "obst-gemuese"], ["birne", "obst-gemuese"], ["banane", "obst-gemuese"],
  ["zitrone", "obst-gemuese"], ["limette", "obst-gemuese"], ["orange", "obst-gemuese"],
  ["beere", "obst-gemuese"], ["ingwer", "obst-gemuese"], ["petersilie", "obst-gemuese"],
  ["schnittlauch", "obst-gemuese"], ["basilikum", "obst-gemuese"], ["kräuter", "obst-gemuese"],
  ["rucola", "obst-gemuese"], ["kohl", "obst-gemuese"], ["avocado", "obst-gemuese"],
  ["chili", "obst-gemuese"], ["radieschen", "obst-gemuese"], ["rote bete", "obst-gemuese"],
  ["mango", "obst-gemuese"], ["traube", "obst-gemuese"], ["kiwi", "obst-gemuese"],
  ["ananas", "obst-gemuese"], ["koriander", "obst-gemuese"], ["dill", "obst-gemuese"],
  ["obst", "obst-gemuese"], ["gemüse", "obst-gemuese"],
  // Fleisch & Fisch
  ["fleisch", "fleisch-fisch"], ["rind", "fleisch-fisch"], ["schwein", "fleisch-fisch"],
  ["aufschnitt", "fleisch-fisch"], ["salami", "fleisch-fisch"],
  ["hähnchen", "fleisch-fisch"], ["huhn", "fleisch-fisch"], ["hühn", "fleisch-fisch"],
  ["pute", "fleisch-fisch"], ["hack", "fleisch-fisch"], ["wurst", "fleisch-fisch"],
  ["würstchen", "fleisch-fisch"], ["speck", "fleisch-fisch"], ["schinken", "fleisch-fisch"],
  ["lachs", "fleisch-fisch"], ["fisch", "fleisch-fisch"], ["garnele", "fleisch-fisch"],
  ["steak", "fleisch-fisch"], ["schnitzel", "fleisch-fisch"], ["kabeljau", "fleisch-fisch"],
  ["forelle", "fleisch-fisch"], ["filet", "fleisch-fisch"], ["gulasch", "fleisch-fisch"],
  // Kühlregal
  ["milch", "kuehlregal"], ["butter", "kuehlregal"], ["joghurt", "kuehlregal"],
  ["quark", "kuehlregal"], ["sahne", "kuehlregal"], ["käse", "kuehlregal"],
  ["schmand", "kuehlregal"], ["crème fraîche", "kuehlregal"], ["creme fraiche", "kuehlregal"],
  ["mozzarella", "kuehlregal"], ["parmesan", "kuehlregal"], ["feta", "kuehlregal"],
  ["tofu", "kuehlregal"], ["eier", "kuehlregal"],
  // Brot & Backwaren
  ["brot", "brot"], ["brötchen", "brot"], ["toast", "brot"], ["baguette", "brot"],
  ["wrap", "brot"], ["tortilla", "brot"], ["croissant", "brot"],
  // Vorrat/Trockenware
  ["mehl", "vorrat"], ["zucker", "vorrat"], ["salz", "vorrat"], ["pfeffer", "vorrat"],
  ["öl", "vorrat"], ["essig", "vorrat"], ["reis", "vorrat"], ["nudel", "vorrat"],
  ["spaghetti", "vorrat"], ["pasta", "vorrat"], ["penne", "vorrat"], ["linsen", "vorrat"],
  ["bohnen", "vorrat"], ["kichererbsen", "vorrat"], ["dose", "vorrat"], ["gewürz", "vorrat"],
  ["curry", "vorrat"], ["honig", "vorrat"], ["senf", "vorrat"], ["ketchup", "vorrat"],
  ["mayo", "vorrat"], ["haferflocken", "vorrat"], ["backpulver", "vorrat"], ["hefe", "vorrat"],
  ["soße", "vorrat"], ["sauce", "vorrat"], ["couscous", "vorrat"], ["bulgur", "vorrat"],
  ["nüsse", "vorrat"], ["mandel", "vorrat"], ["grieß", "vorrat"], ["kakao", "vorrat"],
  ["marmelade", "vorrat"], ["zimt", "vorrat"], ["oregano", "vorrat"], ["muskat", "vorrat"],
  ["mais", "vorrat"], ["erbsen", "vorrat"],
  // Tiefkühl
  ["eiscreme", "tiefkuehl"],
  // Getränke
  ["wasser", "getraenke"], ["saft", "getraenke"], ["limo", "getraenke"], ["cola", "getraenke"],
  ["bier", "getraenke"], ["wein", "getraenke"], ["sprudel", "getraenke"], ["tee", "getraenke"],
  ["kaffee", "getraenke"],
];

/** Abteilung für eine Zutat anhand ihres Namens */
export function sectionFor(name: string): Section {
  const n = name.trim().toLowerCase();
  // "Ei"/"Eier" als ganzes Wort, sonst trifft "ei" fast alles
  if (/^eier?$/.test(n) || /\beier?\b/.test(n)) return "kuehlregal";
  if (/^eis$/.test(n)) return "tiefkuehl";
  return KEYWORDS.find(([keyword]) => n.includes(keyword))?.[1] ?? "sonstiges";
}
