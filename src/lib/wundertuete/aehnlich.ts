// Ähnlichkeit von Wundertüte-Texten (A-049): Eine neue Karte von Mia (Notfall
// per KI) darf keiner schon gesehenen ähneln. Einfach und robust: Text
// normalisieren (klein, ohne Fett-Zeichen, Satzzeichen und Umlaut-Varianten),
// dann Buchstaben-Trigramme vergleichen (Jaccard). Ab der Schwelle gilt es
// als zu ähnlich – lieber einmal zu streng als eine gefühlte Wiederholung.

/** Ab diesem Anteil gemeinsamer Trigramme ist ein Text „zu ähnlich“ */
const AEHNLICH_SCHWELLE = 0.4;

/** Klein, ohne `**`, ohne Satzzeichen, ä → ae …, Leerraum einfach */
export function normalisiere(text: string): string {
  return text
    .toLowerCase()
    .replace(/\*\*/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Buchstaben-Trigramme (je Wort mit Rand, damit kurze Wörter zählen) */
function trigramme(text: string): Set<string> {
  const out = new Set<string>();
  for (const wort of normalisiere(text).split(" ")) {
    if (!wort) continue;
    const w = ` ${wort} `;
    for (let i = 0; i + 3 <= w.length; i++) out.add(w.slice(i, i + 3));
  }
  return out;
}

/** Jaccard der Trigramme (0 = nichts gemeinsam, 1 = gleich) */
export function aehnlichkeit(a: string, b: string): number {
  const x = trigramme(a);
  const y = trigramme(b);
  if (!x.size || !y.size) return normalisiere(a) === normalisiere(b) ? 1 : 0;
  return jaccard(x, y);
}

const jaccard = (x: Set<string>, y: Set<string>) => {
  if (!x.size || !y.size) return 0;
  let gemeinsam = 0;
  for (const t of x) if (y.has(t)) gemeinsam++;
  return gemeinsam / (x.size + y.size - gemeinsam);
};

/**
 * Vergleich gegen viele bekannte Texte (Trigramme nur einmal berechnet):
 * `zuAehnlich(text)` prüft, `merke(text)` nimmt einen neuen dazu.
 */
export function aehnlichkeitsIndex(texte: readonly string[]) {
  const liste = texte.map((t) => ({ n: normalisiere(t), g: trigramme(t) }));
  return {
    zuAehnlich(text: string) {
      const n = normalisiere(text);
      const g = trigramme(text);
      return liste.some((x) => x.n === n || jaccard(g, x.g) >= AEHNLICH_SCHWELLE);
    },
    merke(text: string) {
      liste.push({ n: normalisiere(text), g: trigramme(text) });
    },
  };
}

/** Ähnelt `text` einem der schon gesehenen Texte zu sehr? */
export const zuAehnlich = (text: string, gesehen: readonly string[]) => aehnlichkeitsIndex(gesehen).zuAehnlich(text);
