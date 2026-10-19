// Eingebaute Liste gängiger Lebensmittel für die Spracheingabe bei "Was ist
// noch da?". "Einzahl|Mehrzahl"; ohne "|" ist beides gleich (Sahne, Reis).
// Erkennt Wörter auch mit kleinen Tippfehlern ("Brokoli" → "Brokkoli").

const FOOD_LIST: string[] = [
  // Gemüse
  "Aubergine|Auberginen", "Avocado|Avocados", "Blumenkohl", "Bohne|Bohnen", "grüne Bohne|grüne Bohnen",
  "Brokkoli", "Champignon|Champignons", "Chili|Chilis", "Chinakohl", "Erbse|Erbsen", "Fenchel",
  "Frühlingszwiebel|Frühlingszwiebeln", "Grünkohl", "Gurke|Gurken", "Ingwer", "Karotte|Karotten",
  "Möhre|Möhren", "Mohrrübe|Mohrrüben", "Kartoffel|Kartoffeln", "Süßkartoffel|Süßkartoffeln",
  "Knoblauch", "Knobi", "Knoblauchzehe|Knoblauchzehen", "Kohlrabi|Kohlrabis", "Kürbis|Kürbisse", "Lauch",
  "Porree", "Mais", "Maiskolben", "Mangold", "Paprika", "Pastinake|Pastinaken",
  "Peperoni|Peperonis", "Pilz|Pilze", "Radieschen", "Rettich", "Rosenkohl", "Rote Bete",
  "Rotkohl", "Rucola", "Salat|Salate", "Gurkensalat", "Kartoffelsalat", "Nudelsalat", "Eisbergsalat", "Feldsalat", "Kopfsalat", "Römersalat",
  "Schalotte|Schalotten", "Sellerie", "Staudensellerie", "Spargel", "Spinat", "Blattspinat",
  "Spitzkohl", "Steckrübe|Steckrüben", "Tomate|Tomaten", "Kirschtomate|Kirschtomaten",
  "Cherrytomate|Cherrytomaten", "Weißkohl", "Wirsing", "Zucchini|Zucchinis", "Zwiebel|Zwiebeln",
  "rote Zwiebel|rote Zwiebeln", "Okra", "Pak Choi", "Rübe|Rüben", "Topinambur", "Artischocke|Artischocken",
  "Kohl", "Sauerkraut", "Oliven|Oliven", "Olive|Oliven", "Mais", "Sprossen", "Edamame",
  "Kichererbse|Kichererbsen", "Linse|Linsen", "Kidneybohne|Kidneybohnen", "weiße Bohne|weiße Bohnen",
  // Obst
  "Apfel|Äpfel", "Ananas", "Aprikose|Aprikosen", "Banane|Bananen", "Birne|Birnen",
  "Blaubeere|Blaubeeren", "Heidelbeere|Heidelbeeren", "Brombeere|Brombeeren", "Erdbeere|Erdbeeren",
  "Himbeere|Himbeeren", "Johannisbeere|Johannisbeeren", "Stachelbeere|Stachelbeeren",
  "Kirsche|Kirschen", "Clementine|Clementinen", "Mandarine|Mandarinen", "Orange|Orangen",
  "Apfelsine|Apfelsinen", "Grapefruit|Grapefruits", "Zitrone|Zitronen", "Limette|Limetten",
  "Kiwi|Kiwis", "Mango|Mangos", "Melone|Melonen", "Wassermelone|Wassermelonen", "Nektarine|Nektarinen",
  "Pfirsich|Pfirsiche", "Pflaume|Pflaumen", "Zwetschge|Zwetschgen", "Traube|Trauben",
  "Weintraube|Weintrauben", "Feige|Feigen", "Granatapfel|Granatäpfel", "Papaya|Papayas",
  "Rhabarber", "Dattel|Datteln", "Rosine|Rosinen", "Kokosnuss|Kokosnüsse", "Physalis", "Maracuja|Maracujas",
  "Litschi|Litschis", "Quitte|Quitten", "Beeren", "Obst", "Gemüse",
  // Fleisch & Wurst
  "Bacon", "Speck", "Schinken", "Kochschinken", "Hackfleisch", "Hack", "Rinderhack", "Gehacktes",
  "Hähnchen", "Hähnchenbrust|Hähnchenbrüste", "Hähnchenschenkel", "Hühnchen", "Huhn|Hühner",
  "Hühnerbrust", "Putenbrust", "Pute", "Putenfleisch", "Rindfleisch", "Schweinefleisch", "Lammfleisch",
  "Lamm", "Kalbfleisch", "Gulasch", "Steak|Steaks", "Schnitzel", "Kotelett|Koteletts", "Braten",
  "Rouladen", "Filet|Filets", "Geschnetzeltes", "Wurst|Würste", "Würstchen", "Wiener",
  "Bratwurst|Bratwürste", "Leberkäse", "Salami|Salamis", "Chorizo", "Mortadella", "Fleischwurst",
  "Lyoner", "Aufschnitt", "Frikadelle|Frikadellen", "Fleischbällchen", "Ente", "Gans", "Wild",
  "Leberwurst", "Mett", "Fleisch", "Kassler", "Pancetta", "Prosciutto", "Parmaschinken",
  // Fisch & Meeresfrüchte
  "Fisch|Fische", "Lachs", "Räucherlachs", "Thunfisch", "Forelle|Forellen", "Kabeljau", "Seelachs",
  "Hering|Heringe", "Makrele|Makrelen", "Sardine|Sardinen", "Sardelle|Sardellen", "Garnele|Garnelen",
  "Shrimp|Shrimps", "Krabbe|Krabben", "Fischstäbchen", "Muschel|Muscheln", "Tintenfisch",
  "Calamari", "Scholle|Schollen", "Zander", "Dorade|Doraden", "Pangasius", "Matjes", "Rotbarsch",
  // Milchprodukte & Eier
  "Milch", "Buttermilch", "Sahne", "Rahm", "Schlagsahne", "saure Sahne", "Schmand", "Crème fraîche",
  "Creme fraiche", "Joghurt|Joghurts", "Naturjoghurt", "Griechischer Joghurt", "Quark", "Magerquark",
  "Frischkäse", "Hüttenkäse", "Butter", "Margarine", "Käse", "Bergkäse", "Gouda", "Emmentaler",
  "Cheddar", "Parmesan", "Pecorino", "Mozzarella", "Feta", "Schafskäse", "Ziegenkäse", "Hirtenkäse",
  "Camembert", "Brie", "Mascarpone", "Ricotta", "Halloumi", "Reibekäse", "Kefir", "Skyr", "Pudding",
  "Ei|Eier", "Eigelb", "Eiweiß", "Kondensmilch", "Kokosmilch", "Hafermilch", "Sojamilch", "Mandelmilch",
  // Brot & Backwaren
  "Brot|Brote", "Vollkornbrot", "Toast", "Toastbrot", "Brötchen", "Semmel|Semmeln", "Baguette|Baguettes",
  "Ciabatta", "Brezel|Brezeln", "Croissant|Croissants", "Knäckebrot", "Tortilla|Tortillas", "Wrap|Wraps",
  "Fladenbrot", "Pizzateig", "Blätterteig", "Hefeteig", "Semmelbrösel", "Paniermehl", "Zwieback",
  "Kuchen", "Laugenbrezel|Laugenbrezeln", "Pita|Pitas",
  // Vorrat & Trockenware
  "Nudeln", "Nudel", "Spaghetti", "Penne", "Fusilli", "Farfalle", "Tagliatelle", "Lasagneplatten",
  "Makkaroni", "Spätzle", "Gnocchi", "Tortellini", "Ravioli", "Reis", "Basmatireis", "Risottoreis",
  "Milchreis", "Couscous", "Bulgur", "Quinoa", "Hirse", "Polenta", "Grieß", "Haferflocken", "Müsli",
  "Cornflakes", "Mehl", "Vollkornmehl", "Speisestärke", "Zucker", "Puderzucker", "Rohrzucker",
  "Vanillezucker", "Backpulver", "Hefe", "Trockenhefe", "Honig", "Ahornsirup", "Marmelade",
  "Konfitüre", "Nutella", "Erdnussbutter", "Schokolade", "Kakao", "Kaffee", "Tee", "Öl", "Olivenöl",
  "Rapsöl", "Sonnenblumenöl", "Sesamöl", "Essig", "Balsamico", "Senf", "Ketchup", "Mayonnaise", "Mayo",
  "Sojasoße", "Sojasauce", "Tomatenmark", "passierte Tomaten", "Dosentomaten", "stückige Tomaten",
  "Tomatensoße", "Tomatensauce", "Pesto", "Brühe", "Gemüsebrühe", "Hühnerbrühe", "Rinderbrühe",
  "Fond", "Kokosraspeln", "Mandel|Mandeln", "Haselnuss|Haselnüsse", "Walnuss|Walnüsse",
  "Erdnuss|Erdnüsse", "Cashew|Cashews", "Cashewkerne", "Pinienkerne", "Sonnenblumenkerne",
  "Kürbiskerne", "Sesam", "Leinsamen", "Chiasamen", "Nüsse", "Tofu", "Tempeh", "Seitan",
  "Linsennudeln", "Glasnudeln", "Reisnudeln", "Mie-Nudeln", "Chips", "Salzstangen", "Kekse", "Keks",
  "Zwiebelsuppe", "Suppe", "Mais aus der Dose", "Thunfischdose", "Ajvar", "Kapern", "Gewürzgurke|Gewürzgurken",
  "Essiggurke|Essiggurken", "Apfelmus", "Kompott", "Pommes", "Kroketten", "Rösti", "Kartoffelpüree",
  "Pizza|Pizzen", "Gelatine", "Agavendicksaft", "Sirup",
  // Gewürze
  "Salz", "Pfeffer", "Paprikapulver", "Currypulver", "Curry", "Kurkuma", "Kreuzkümmel", "Kümmel",
  "Zimt", "Muskat", "Muskatnuss", "Oregano", "Majoran", "Thymian", "Rosmarin", "Lorbeer",
  "Lorbeerblatt|Lorbeerblätter", "Nelke|Nelken", "Chiliflocken", "Cayennepfeffer", "Knoblauchpulver",
  "Zwiebelpulver", "Vanille", "Kardamom", "Koriander", "Ingwerpulver", "Garam Masala", "Gewürze",
  "Kräuter der Provence", "Italienische Kräuter", "Sternanis", "Safran", "Fenchelsamen", "Senfkörner",
  // Kräuter
  "Basilikum", "Petersilie", "Schnittlauch", "Dill", "Minze", "Salbei", "Estragon", "Kerbel",
  "Liebstöckel", "Zitronengras", "Bärlauch", "Kresse", "Kräuter", "Frühlingskräuter",
  // Getränke
  "Wasser", "Mineralwasser", "Saft", "Apfelsaft", "Orangensaft", "Wein", "Weißwein", "Rotwein",
  "Bier", "Limonade", "Cola",
  // Tiefkühl
  "Erbsen und Möhren", "Rahmspinat", "Eis", "Eiswürfel", "TK-Gemüse", "Tiefkühlgemüse",
  "Kräuterbutter", "Fischfilet", "Backfisch",
];

export type Food = { singular: string; plural: string };

/** Vergleichsschlüssel: klein, ohne Akzente/Umlaute, ß → ss, nur Buchstaben */
export function foodKey(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type Entry = { food: Food; form: "singular" | "plural" };

const INDEX = new Map<string, Entry>();
for (const line of FOOD_LIST) {
  const [singular, plural = singular] = line.split("|");
  const food = { singular, plural };
  // Erste Nennung gewinnt (z. B. "Mais" doppelt)
  if (!INDEX.has(foodKey(singular))) INDEX.set(foodKey(singular), { food, form: "singular" });
  if (!INDEX.has(foodKey(plural))) INDEX.set(foodKey(plural), { food, form: "plural" });
}
const KEYS = [...INDEX.keys()];

/** Editierdistanz mit Vertauschung benachbarter Buchstaben ("Brokoli" ↔ "Brokkoli" = 1) */
function distance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/** Erlaubte Tippfehler je Wortlänge für automatische Korrektur */
function tolerance(length: number): number {
  return length <= 3 ? 0 : length <= 6 ? 1 : 2;
}

export type FoodMatch = Entry & { exact: boolean };

/** Exakter Treffer (auch Einzahl/Mehrzahl), sonst `null` */
export function findFood(text: string): FoodMatch | null {
  const entry = INDEX.get(foodKey(text));
  return entry ? { ...entry, exact: true } : null;
}

/** Bester Treffer mit unscharfer Suche und seine Distanz */
function closest(key: string): { entry: Entry; dist: number } | null {
  let best: { entry: Entry; dist: number } | null = null;
  for (const k of KEYS) {
    if (Math.abs(k.length - key.length) > 3) continue;
    const dist = distance(key, k);
    if (!best || dist < best.dist) best = { entry: INDEX.get(k)!, dist };
  }
  return best;
}

/**
 * Ein gehörtes Wort als Lebensmittel erkennen:
 * - exakt (auch Mehrzahl),
 * - zusammengesetzt mit bekanntem Ende ("Kirschtomaten", "Rinderhackfleisch"),
 * - mit kleinem Tippfehler ("Brokoli" → Brokkoli).
 * Sonst `suggestion` = ähnlichstes Lebensmittel für "Meintest du …?".
 */
export function recognizeFood(text: string):
  | { known: true; match: FoodMatch | null }
  | { known: false; suggestion: Food | null } {
  const key = foodKey(text);
  if (!key) return { known: false, suggestion: null };
  const exact = INDEX.get(key);
  if (exact) return { known: true, match: { ...exact, exact: true } };

  // Zusammengesetztes Wort mit bekanntem Ende → so übernehmen, wie gesagt
  if (!key.includes(" ") && key.length >= 6) {
    for (let i = 2; i <= key.length - 4; i++) {
      if (INDEX.has(key.slice(i))) return { known: true, match: null };
    }
  }

  const best = closest(key);
  if (best && best.dist <= tolerance(key.length)) return { known: true, match: { ...best.entry, exact: false } };
  const suggestion = best && best.dist <= Math.max(2, Math.ceil(key.length / 3)) ? best.entry.food : null;
  return { known: false, suggestion };
}

/** Passende Form zur Menge: 1 Karotte, 3 Karotten; ohne Menge/mit Einheit wie gesagt */
export function foodName(food: Food, amount: number | null, unit: string, heard: "singular" | "plural"): string {
  if (!unit && amount !== null) return amount > 1 ? food.plural : food.singular;
  return heard === "plural" ? food.plural : food.singular;
}
