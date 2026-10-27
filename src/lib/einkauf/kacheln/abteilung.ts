// Einkauf-Kachel (Auftrag „Sofort-Kachel“): Artikel ohne eigene Zeichnung
// zeigen das Symbol ihrer Abteilung (Kühlregal, Obst, Drogerie …) – nie einen
// Buchstaben. Die Abteilung kommt aus `sectionFor`; was dort „Sonstiges“ ist,
// wird hier noch genauer: Drogerie-Sachen und ein paar Kühlregal-Sachen.
// Die Symbole selbst (lucide): components/einkauf/kacheln/ItemSymbol.tsx.

import { sectionFor, type Section } from "@/lib/einkauf/sections";

/** Abteilungs-Symbol: die Abteilungen der Liste plus „Drogerie“ (nur fürs Symbol) */
export type AbteilungSymbol = Section | "drogerie";

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
  if (section !== "sonstiges") return section;
  if (DROGERIE.some((w) => n.includes(w))) return "drogerie";
  if (KUEHL.some((w) => n.includes(w))) return "kuehlregal";
  return "sonstiges";
}
