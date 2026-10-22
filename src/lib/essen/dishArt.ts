// Bild-Rezept eines Gerichts: aus Titel, Zutaten und Kategorie die Form
// (Nudeln, Suppe, Auflauf …), die Toppings und den Hintergrund – rein, ohne
// KI, auch auf dem Server nutzbar. Gleicher Name = immer dasselbe Bild
// (fester Zufall aus dem Namen). Unbekanntes wird nie leer: dann eine
// passende allgemeine Form der Kategorie (`guessed`). Gezeichnet wird mit
// `renderDishSvg` (dishSvg.ts).

import type { RecipeCategory } from "@/lib/essen/cookbook";

type DishForm =
  | "nudeln-lang"
  | "nudeln-kurz"
  | "auflauf"
  | "reis"
  | "bowl"
  | "suppe"
  | "pfanne"
  | "blech"
  | "wrap"
  | "brot"
  | "pfannkuchen"
  | "kartoffeln"
  | "fisch"
  | "fleisch"
  | "salat"
  | "pizza"
  | "suess"
  | "kuchen"
  | "muffins"
  | "kekse"
  | "waffeln"
  | "schnecken";

export type Topping =
  | "tomate"
  | "burrata"
  | "mozzarella"
  | "feta"
  | "kaese"
  | "paprika"
  | "zucchini"
  | "moehre"
  | "erbsen"
  | "mais"
  | "bohnen"
  | "kuerbis"
  | "pilze"
  | "spinat"
  | "brokkoli"
  | "gurke"
  | "avocado"
  | "spargel"
  | "linsen"
  | "zwiebel"
  | "ei"
  | "spiegelei"
  | "ruehrei"
  | "quark"
  | "lachs"
  | "thunfisch"
  | "fischstaebchen"
  | "hack"
  | "haehnchen"
  | "speck"
  | "zitrone"
  | "basilikum"
  | "dill"
  | "petersilie"
  | "pesto"
  | "apfelmus"
  | "apfel"
  | "beeren"
  | "schoko"
  | "rosinen";

/** Beilage bei Fisch/Fleisch */
type DishSide = "reis" | "kartoffeln" | "pueree" | "ofenkartoffeln" | "gemuese";

export type DishArt = {
  form: DishForm;
  toppings: Topping[];
  /** Hintergrund-Verlauf (hell → dunkel) */
  bg: [string, string, string];
  seed: number;
  /** Feinheit innerhalb der Form (z. B. "pell", "pueree", "caprese", "zitrone") */
  variant?: string;
  side?: DishSide;
  /** true = nichts erkannt, allgemeine Form der Kategorie */
  guessed: boolean;
};

/** Kleinbuchstaben, ohne Akzente – für die Stichwörter */
const norm = (s: string) => s.toLowerCase().replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "");

export { dishSlug } from "@/lib/essen/dishSlug";

/** Fester Zufall aus dem Namen (FNV-1a) */
function dishSeed(title: string): number {
  let h = 2166136261;
  for (const c of norm(title.trim())) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

// Reihenfolge zählt: die erste passende Regel gewinnt (erst im Titel, dann in den Zutaten)
const FORM_RULES: [DishForm, RegExp][] = [
  ["suppe", /suppe|eintopf|bruhe|minestrone/],
  ["auflauf", /auflauf|gratin|lasagne|crumble|gefullte|moussaka|uberbacken|quiche/],
  ["wrap", /wrap|tortilla|burrito|fajita|taco|quesadilla/],
  ["pizza", /pizza|flammkuchen/],
  ["muffins", /muffin|cupcake/],
  ["kekse", /keks|cookie|platzchen/],
  ["waffeln", /waffel/],
  ["schnecken", /schnecke/],
  ["pfannkuchen", /pfannkuchen|reibekuchen|kartoffelpuffer/],
  ["kuchen", /kuchen|torte|brownie|bananenbrot|tarte|streusel/],
  ["suess", /milchreis|griessbrei|griesbrei|pudding|porridge|haferbrei|kaiserschmarrn/],
  ["salat", /salat|caprese|tomate\w*-mozzarella/],
  ["bowl", /curry|chili|bowl|gulasch|dal\b|ragout|stew/],
  ["pfanne", /pfanne|geschnetzelt|wok|gebraten|shakshuka/],
  ["nudeln-lang", /spaghetti|tagliatelle|linguine|bandnudel|bolognese|carbonara/],
  ["nudeln-kurz", /nudel|pasta|penne|fusilli|maccheroni|makkaroni|gnocchi|tortellini|ravioli|spatzle|farfalle/],
  ["pfannkuchen", /pfannkuchen|crepe|puffer|reibekuchen|rosti|omelett|pancake/],
  ["fisch", /lachs|fisch|forelle|kabeljau|seelachs|scholle|garnele/],
  ["fleisch", /frikadelle|bulette|schnitzel|steak|braten|wurstchen|bratwurst|hackballchen|kottbullar|hahnchenkeule|cordon/],
  ["brot", /brot|toast|baguette|stulle|sandwich|bruschetta|zopf|semmel/],
  ["blech", /ofengemuse|blech|ofenkartoffel|ofen-/],
  ["kartoffeln", /kartoffel|puree|pommes|wedges|spargel/],
  ["reis", /reis|risotto|paella/],
];

const TOPPING_RULES: [Topping, RegExp][] = [
  ["burrata", /burrata/],
  ["mozzarella", /mozzarella/],
  ["feta", /feta|schafskase|hirtenkase/],
  ["lachs", /(?<!see)lachs/],
  ["thunfisch", /thunfisch/],
  ["fischstaebchen", /fischstabchen/],
  ["hack", /hack|bolognese|frikadell|bulette|chili con/],
  ["haehnchen", /hahnchen|huhn|pute|chicken/],
  ["speck", /speck|schinken|bacon/],
  ["spiegelei", /spiegelei/],
  ["ruehrei", /ruhrei/],
  ["ei", /\beier?\b|\bei\b|eigelb/],
  ["tomate", /tomate|passata/],
  ["paprika", /paprika(?!pulver)/],
  ["zucchini", /zucchini/],
  ["moehre", /mohre|karotte|rohkost/],
  ["erbsen", /erbse/],
  ["mais", /\bmais\b/],
  ["bohnen", /bohne/],
  ["kuerbis", /kurbis/],
  ["pilze", /pilz|champignon/],
  ["spinat", /spinat/],
  ["brokkoli", /brokkoli|broccoli/],
  ["gurke", /gurke/],
  ["avocado", /avocado/],
  ["spargel", /spargel/],
  ["linsen", /linse/],
  ["zwiebel", /zwiebel|lauch/],
  ["quark", /quark|schmand|frischkase|joghurt|creme fraiche/],
  ["kaese", /kase|parmesan|gouda|emmentaler|cheddar/],
  ["zitrone", /zitrone|limette/],
  ["pesto", /pesto/],
  ["apfelmus", /apfelmus/],
  ["apfel", /apfel|\bapfeln\b/],
  ["beeren", /blaubeer|heidelbeer|beere|kirsch/],
  ["schoko", /schoko|kakao|brownie|marmor/],
  ["rosinen", /rosine/],
  ["basilikum", /basilikum/],
  ["dill", /\bdill\b/],
  ["petersilie", /petersilie|schnittlauch|krauter/],
];

// Hintergründe (warm wie gericht.webp): hell → dunkel
const BGS = {
  tomate: [["#E9A27A", "#D97B4E", "#B9582F"], ["#EDA982", "#DE8457", "#C0603A"]],
  gruen: [["#C9C99A", "#A9AE74", "#7E8A4F"], ["#D2C79A", "#B0A86E", "#88864B"]],
  fisch: [["#EFC6A9", "#E0A07F", "#C27A5B"], ["#E9CDB2", "#D6A786", "#B88262"]],
  fleisch: [["#DDA57C", "#C17D50", "#975633"], ["#D9AE88", "#BE875C", "#93623E"]],
  gelb: [["#F2C475", "#E6A045", "#C77B27"], ["#F0CB86", "#E2A757", "#C4833A"]],
  suess: [["#F4D7B8", "#E9B989", "#D29462"], ["#F1DCC3", "#E4BD94", "#C99A6E"]],
  schoko: [["#D4A88A", "#AE7B5F", "#845743"], ["#CDA58C", "#A67A62", "#7D5646"]],
} satisfies Record<string, [string, string, string][]>;

function pickBg(form: DishForm, tops: Topping[], category: RecipeCategory | null | undefined, seed: number): [string, string, string] {
  const has = (t: Topping) => tops.includes(t);
  const key: keyof typeof BGS =
    has("schoko") && ["kuchen", "muffins", "kekse"].includes(form)
      ? "schoko"
      : ["kuchen", "muffins", "kekse", "waffeln", "schnecken", "suess"].includes(form)
        ? "suess"
        : has("kuerbis") || form === "bowl" || has("mais")
          ? "gelb"
          : form === "fisch" || has("lachs") || has("thunfisch") || category === "fisch"
            ? "fisch"
            : form === "fleisch" || has("hack") || category === "fleisch"
              ? "fleisch"
              : has("tomate") || form === "pizza"
                ? "tomate"
                : form === "salat" || has("spinat") || has("brokkoli") || has("zucchini") || has("pesto")
                  ? "gruen"
                  : "tomate";
  const list = BGS[key];
  return list[seed % list.length];
}

// Toppings, die jede Form ohne erkannte Zutaten bekommt (nie leer)
const DEFAULT_TOPS: Record<DishForm, Topping[]> = {
  "nudeln-lang": ["tomate", "basilikum"],
  "nudeln-kurz": ["tomate", "kaese", "basilikum"],
  auflauf: ["kaese", "tomate"],
  reis: ["paprika", "erbsen", "petersilie"],
  bowl: ["paprika", "zucchini"],
  suppe: ["petersilie"],
  pfanne: ["paprika", "zucchini", "moehre"],
  blech: ["paprika", "zucchini", "zwiebel"],
  wrap: ["paprika", "gurke", "mais"],
  brot: ["kaese", "tomate"],
  pfannkuchen: ["apfelmus"],
  kartoffeln: ["petersilie"],
  fisch: ["zitrone", "dill"],
  fleisch: ["petersilie"],
  salat: ["tomate", "gurke"],
  pizza: ["tomate", "kaese", "basilikum"],
  suess: ["apfelmus"],
  kuchen: ["apfel"],
  muffins: ["schoko"],
  kekse: ["schoko"],
  waffeln: ["beeren"],
  schnecken: ["rosinen"],
};

const HERB_FOR: Partial<Record<DishForm, Topping>> = {
  "nudeln-lang": "basilikum",
  "nudeln-kurz": "basilikum",
  pizza: "basilikum",
  fisch: "dill",
  kartoffeln: "petersilie",
  fleisch: "petersilie",
  suppe: "petersilie",
  reis: "petersilie",
  pfanne: "petersilie",
};
const HERBS: Topping[] = ["basilikum", "dill", "petersilie"];
const SWEET: DishForm[] = ["kuchen", "muffins", "kekse", "waffeln", "schnecken", "suess"];

function formFor(text: string): DishForm | null {
  for (const [form, re] of FORM_RULES) if (re.test(text)) return form;
  return null;
}

function variantFor(form: DishForm, t: string, all: string): string | undefined {
  switch (form) {
    case "kartoffeln":
      return /puree|stampf/.test(t) ? "pueree" : /pell/.test(t) ? "pell" : /brat|rosti/.test(t) ? "brat" : /spargel/.test(t) ? "pell" : /pommes|wedges|ofen/.test(t) ? "wedges" : "brat";
    case "kuchen":
      return /brownie/.test(t) ? "brownie" : /marmor/.test(t) ? "marmor" : /zitrone/.test(t) ? "zitrone" : /kase/.test(t) ? "kaese" : /mohre|karotte|rubli/.test(t) ? "moehre" : /streusel/.test(t) ? "streusel" : /banane/.test(t) ? "banane" : /schoko/.test(t) ? "schoko" : /apfel/.test(t) ? "apfel" : "apfel";
    case "auflauf":
      return /crumble/.test(t) ? "crumble" : /gefullte/.test(t) ? "gefuellt" : /lasagne/.test(t) ? "lasagne" : "nudel";
    case "suppe":
      return /tomate/.test(t) ? "tomate" : /kurbis/.test(t) ? "kuerbis" : /linse/.test(t) ? "linsen" : /kartoffel/.test(t) ? "kartoffel" : /erbse/.test(t) ? "erbsen" : "gemuese";
    case "salat":
      return /nudel/.test(t) ? "nudel" : /mozzarella|caprese/.test(t) ? "caprese" : /kartoffel/.test(t) ? "kartoffel" : "gruen";
    case "pfannkuchen":
      return /puffer|reibekuchen|rosti/.test(t) ? "puffer" : /omelett/.test(t) ? "omelett" : "stapel";
    case "brot":
      return /baguette/.test(t) ? "baguette" : /toast/.test(t) ? "toast" : /zopf/.test(t) ? "zopf" : /brotchen|semmel/.test(t) ? "broetchen" : /ruhrei/.test(t) ? "ruehrei" : "scheiben";
    case "pizza":
      return /flammkuchen/.test(t) ? "flammkuchen" : "pizza";
    case "fisch":
      return /stabchen/.test(all) ? "staebchen" : /(?<!see)lachs/.test(all) ? "lachs" : "filet";
    case "fleisch":
      return /hahnchen|huhn|pute/.test(t) ? "haehnchen" : /schnitzel|cordon/.test(t) ? "schnitzel" : /wurst/.test(t) ? "wurst" : "frikadellen";
    case "bowl":
      return /chili/.test(t) ? "chili" : /curry|dal\b/.test(t) ? "curry" : "gulasch";
    case "suess":
      return /griess|gries/.test(t) ? "griess" : "milchreis";
    case "kekse":
      return /butter|ausstech/.test(t) ? "butter" : /hafer/.test(t) ? "hafer" : "schoko";
    case "muffins":
      return /blaubeer|heidelbeer/.test(t) ? "blaubeer" : "schoko";
    default:
      return undefined;
  }
}

function sideFor(form: DishForm, t: string, all: string): DishSide | undefined {
  if (form === "pfanne" || form === "bowl") return /reis/.test(t) ? "reis" : undefined;
  if (form !== "fisch" && form !== "fleisch") return undefined;
  if (/puree|stampf/.test(all)) return "pueree";
  if (/ofenkartoffel|wedges|pommes/.test(all)) return "ofenkartoffeln";
  if (/kartoffel/.test(all)) return "kartoffeln";
  if (/reis/.test(all)) return "reis";
  return "gemuese";
}

/**
 * Bild-Rezept eines Gerichts. Erkennt die Form erst am Titel, dann an den
 * Zutaten; ohne Treffer eine allgemeine Form der Kategorie (Pfanne mit
 * Gemüse, Fisch mit Zitrone …). Toppings aus Titel und Zutaten (höchstens 5,
 * immer mindestens eins).
 */
export function dishArt(title: string, ingredients: string[] = [], category?: RecipeCategory | null): DishArt {
  const t = norm(title);
  const ing = norm(ingredients.join(" · "));
  const all = `${t} · ${ing}`;
  const seed = dishSeed(title);

  let form = formFor(t) ?? formFor(ing);
  const guessed = form === null;
  if (!form) form = category === "fisch" ? "fisch" : category === "fleisch" ? "fleisch" : category === "cheatday" ? "pizza" : "pfanne";
  // "Pasta mit …" mit Spaghetti in den Zutaten = lange Nudeln
  if (form === "nudeln-kurz" && /spaghetti|tagliatelle|linguine|bandnudel/.test(all)) form = "nudeln-lang";

  const variant = variantFor(form, t, all);
  const sweet = SWEET.includes(form) || variant === "crumble";
  let toppings = TOPPING_RULES.filter(([top, re]) => {
    if (sweet && !["apfel", "apfelmus", "beeren", "schoko", "rosinen", "zitrone", "quark", "moehre"].includes(top)) return false;
    // Ei im Teig (Pfannkuchen, Frikadellen, Kuchen) nicht als Topping zeigen
    if (top === "ei" && (sweet || ["pfannkuchen", "fleisch", "auflauf", "pizza"].includes(form!) || !re.test(t))) return false;
    // Hauptsache der Form nicht doppelt
    if (form === "fisch" && ["lachs", "fischstaebchen"].includes(top)) return false;
    if (form === "salat" && t.includes("nudel") && top === "kaese") return false;
    return re.test(all);
  }).map(([top]) => top);
  if (toppings.includes("spiegelei") || toppings.includes("ruehrei")) toppings = toppings.filter((x) => x !== "ei");
  if (toppings.includes("burrata") || toppings.includes("mozzarella") || toppings.includes("feta")) toppings = toppings.filter((x) => x !== "kaese");
  if (toppings.includes("apfelmus")) toppings = toppings.filter((x) => x !== "apfel");
  // Titel-Zutaten zuerst, dann die übrigen
  toppings.sort((a, b) => Number(!topIn(a, t)) - Number(!topIn(b, t)));
  toppings = toppings.slice(0, 5);
  if (toppings.filter((x) => !HERBS.includes(x)).length === 0) toppings = [...DEFAULT_TOPS[form].filter((x) => !toppings.includes(x)), ...toppings];
  const herb = HERB_FOR[form];
  if (herb && !toppings.some((x) => HERBS.includes(x))) toppings = [...toppings.slice(0, 4), herb];

  return {
    form,
    toppings,
    bg: pickBg(sweet ? "suess" : form, toppings, category, seed),
    seed,
    variant,
    side: sideFor(form, t, all),
    guessed,
  };
}

const topIn = (top: Topping, t: string) => TOPPING_RULES.find(([x]) => x === top)?.[1].test(t) ?? false;
