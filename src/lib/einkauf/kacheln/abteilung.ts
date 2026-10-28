// Einkauf-Kachel (Auftrag „Sofort-Kachel“): Artikel ohne eigene Zeichnung
// zeigen das Symbol ihrer Abteilung (Kühlregal, Obst, Drogerie …) – nie einen
// Buchstaben. Die Abteilung kommt aus `sectionFor`; was dort „Sonstiges“ ist,
// wird hier noch genauer: Drogerie-Sachen und ein paar Kühlregal-Sachen.
// Obst und Gemüse bekommen getrennte Symbole (Tafel 102: Zucchini ist kein
// Apfel) – Obst ohne eigene Zeichnung den Apfel, Gemüse die Möhre.
// Die Symbole selbst (lucide): components/einkauf/kacheln/ItemSymbol.tsx.

import { sectionFor, type Section } from "@/lib/einkauf/sections";

/** Abteilungs-Symbol: die Abteilungen der Liste plus „Obst“ und „Drogerie“ (nur fürs Symbol) */
export type AbteilungSymbol = Section | "obst" | "drogerie";

const OBST = [
  "obst", "mango", "kiwi", "birne", "ananas", "pfirsich", "nektarine", "pflaume", "zwetschge", "kirsche", "melone", "aprikose",
  "feige", "papaya", "maracuja", "litschi", "physalis", "dattel", "grapefruit", "granatapfel", "quitte", "johannisbeere", "stachelbeere",
];

const DROGERIE = [
  "seife", "duschgel", "shampoo", "spülung", "zahnpasta", "zahncreme", "zahnbürste", "zahnseide", "deo", "creme", "lotion", "sonnenmilch",
  "windel", "feuchttücher", "taschentücher", "klopapier", "toilettenpapier", "küchenrolle", "watte", "pflaster", "tampon", "binden", "rasier",
  "putzmittel", "reiniger", "spülmittel", "spültabs", "waschmittel", "weichspüler", "müllbeutel", "schwamm",
];

const KUEHL = ["pudding", "hummus", "kefir", "aufstrich", "gnocchi", "frischkäse", "kräuterbutter", "wiener"];

/** Abteilung für das Symbol eines Artikels – immer eine, nie leer */
export function abteilungSymbol(name: string): AbteilungSymbol {
  const n = name.trim().toLowerCase();
  const section = sectionFor(n);
  if ((section === "obst-gemuese" || section === "sonstiges") && OBST.some((w) => n.includes(w))) return "obst";
  if (section !== "sonstiges") return section;
  if (DROGERIE.some((w) => n.includes(w))) return "drogerie";
  if (KUEHL.some((w) => n.includes(w))) return "kuehlregal";
  return "sonstiges";
}
