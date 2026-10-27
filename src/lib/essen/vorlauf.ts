// Essen mit Vorlauf (Tafel 98, Jetzt-Karte abends): Braucht das Gericht von
// morgen schon heute einen Handgriff? Fleisch/Fisch aus dem Tiefkühler holen,
// über Nacht marinieren, Teig über Nacht gehen lassen. Ein Satz, vorbereitend,
// nie „vergiss nicht“. Rein: Zutaten, Schritte und was im Tiefkühler liegt.

import { sameIngredient } from "@/lib/vorrat/pantry";
import { sectionFor } from "@/lib/einkauf/sections";

/** Braucht Stunden: „über Nacht“, „am Vortag“ oder ab 4 Stunden */
const LANGE = /über\s+nacht|am\s+vortag|vorabend|(\d+)\s*(?:std|stunden)(?![a-zäöüß])/i;
const lange = (s: string) => {
  const m = s.match(LANGE);
  if (!m) return false;
  return m[1] === undefined || Number(m[1]) >= 4;
};

const TK_NAME = /^(tk|tiefkühl)|(^|[\s-])tk([\s-]|$)|tiefgekühlt|gefroren/i;

/** Hinweis für heute Abend – oder null, wenn das Gericht nichts vorab braucht */
export function vorlaufHinweis(o: { ingredients: string[]; steps: string[]; frozen: string[] }): string | null {
  // Fleisch oder Fisch aus dem Tiefkühler (laut „Im Haus“ oder schon im Namen)
  const auftauen = o.ingredients.flatMap((name) => {
    const tk = o.frozen.find((f) => sameIngredient(f, name));
    const welches = tk ?? (TK_NAME.test(name) ? name : null);
    const rein = welches?.replace(/^(tk|tiefkühl)[\s-]*/i, "").trim();
    return rein && sectionFor(rein) === "fleisch-fisch" ? [rein] : [];
  });
  if (auftauen.length) return `${auftauen[0]} heute aus dem Gefrierfach.`;
  const text = o.steps.join(" ");
  if (/marinier/i.test(text) && (lange(text) || !/minuten/i.test(text))) return "Heute schon marinieren, dann zieht’s über Nacht.";
  if (/teig/i.test(text) && lange(text)) return "Teig heute schon ansetzen, dann geht er über Nacht.";
  return null;
}
