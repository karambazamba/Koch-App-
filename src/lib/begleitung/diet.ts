// Allergien und "mag nicht" streng prüfen: Welche Zutaten eines Rezepts
// treffen eine Person? Lieber einmal zu oft warnen als einmal zu wenig.

import { ingredientStem } from "@/lib/vorrat/pantry";
import type { Person } from "@/lib/einstellungen/profile";

/** Allergie → typische Zutaten, in denen sie steckt (klein geschrieben) */
const HIDDEN_IN: Record<string, string[]> = {
  gluten: ["weizen", "mehl", "dinkel", "roggen", "gerste", "hafer", "nudel", "spaghetti", "penne", "pasta", "lasagne", "brot", "brötchen", "semmel", "paniermehl", "semmelbrösel", "couscous", "bulgur", "grieß", "spätzle", "gnocchi", "tortellini", "ravioli", "teig", "toast", "sojasoße", "sojasauce", "bier"],
  laktose: ["milch", "sahne", "butter", "käse", "joghurt", "quark", "schmand", "crème fraîche", "creme fraiche", "mascarpone", "mozzarella", "parmesan", "feta", "ricotta", "frischkäse", "gouda", "emmentaler", "pudding", "kefir", "buttermilch", "rahm"],
  ei: ["ei", "eier", "eigelb", "eiweiß", "mayonnaise", "mayo", "eiernudeln", "spätzle"],
  nüsse: ["nuss", "nüsse", "mandel", "haselnuss", "walnuss", "cashew", "pistazie", "pekannuss", "macadamia", "pinienkern", "nutella"],
  erdnüsse: ["erdnuss", "erdnüsse", "erdnussbutter"],
  fisch: ["fisch", "lachs", "thunfisch", "forelle", "kabeljau", "seelachs", "hering", "makrele", "sardine", "sardelle", "matjes", "zander", "dorade", "scholle", "pangasius", "rotbarsch"],
  meeresfrüchte: ["garnele", "shrimp", "krabbe", "muschel", "tintenfisch", "calamari", "scampi", "hummer", "meeresfrüchte"],
  soja: ["soja", "tofu", "tempeh", "edamame", "miso"],
  sellerie: ["sellerie", "selleriesalz"],
  senf: ["senf"],
  sesam: ["sesam", "tahin", "tahini"],
};

const norm = (s: string) => s.toLowerCase().trim();

/** Kommt `term` in `text` vor? Kurze Begriffe nur als ganzes Wort ("Ei" ≠ "Reis") */
function mentions(text: string, term: string): boolean {
  const t = norm(text);
  const w = norm(term);
  if (!w) return false;
  if (w.length <= 3) return new RegExp(`(^|[^a-zäöüß])${w}([^a-zäöüß]|$)`).test(t);
  return t.includes(w);
}

type DietConflict = { person: string; kind: "Allergie" | "mag nicht"; term: string; found: string };

/** Konflikte eines Rezepts (Titel + Zutaten) mit Allergien und Abneigungen */
export function dietConflicts(title: string, ingredients: string[], persons: Person[]): DietConflict[] {
  const texts = [title, ...ingredients];
  const conflicts: DietConflict[] = [];
  for (const person of persons) {
    const name = person.name.trim() || (person.role === "kind" ? "ein Kind" : "ein:e Erwachsene:r");
    const check = (kind: DietConflict["kind"], term: string) => {
      const terms = [term, ...(kind === "Allergie" ? (HIDDEN_IN[norm(term)] ?? []) : [])];
      for (const t of terms) {
        // Wortteil oder gleiche Zutat unter anderem Namen ("Pilze" = "Champignons")
        const found = texts.find((text) => mentions(text, t) || ingredientStem(text) === ingredientStem(t));
        if (found) {
          conflicts.push({ person: name, kind, term, found });
          return;
        }
      }
    };
    person.allergies.forEach((a) => check("Allergie", a));
    person.dislikes.forEach((d) => check("mag nicht", d));
  }
  return conflicts;
}
