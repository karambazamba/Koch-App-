// Regelbasiertes Zerlegen von gesprochenem/getipptem Text in Zutaten.
// Wird später durch die KI ersetzt – siehe ./parser.ts.

import { findFood, foodName, recognizeFood } from "@/lib/essen/leftovers/foods";
import type { ParsedLeftover } from "@/lib/essen/leftovers/parser";

// --- Füllwörter ---------------------------------------------------------------

/** Mehrwort-Phrasen zuerst, dann Einzelwörter (klein geschrieben) */
const FILLER_PHRASES = [
  "wir haben", "ich habe", "ich hab", "habe ich", "hab ich", "haben wir", "da ist", "da sind",
  "es gibt", "gibt es", "im kühlschrank", "in der dose", "noch da", "ein paar", "ein bisschen",
  "ein wenig", "ein rest", "einen rest", "ich glaube", "ich denke", "und zwar", "würde ich sagen",
];
const FILLER_WORDS = new Set([
  "also", "dann", "noch", "und", "äh", "ähm", "öh", "öhm", "hm", "hmm", "mhm", "auch", "mal", "so", "ja",
  "okay", "ok", "bitte", "habe", "haben", "hab", "hat", "etwas", "bisschen", "paar", "da", "hier",
  "nur", "vielleicht", "ich", "wir", "es", "gibt", "sind", "ist", "einige", "mehrere", "rest", "reste",
  "übrig", "kühlschrank", "der", "die", "das", "den", "dem", "des", "von", "vom", "mit", "genau",
  "eigentlich", "irgendwie", "halt", "eben", "doch", "jetzt", "gerade", "schon", "nee", "nein",
  "oder", "aber", "sowie", "plus", "danke", "fertig", "letzte", "letzten", "frisch",
]);

/** Wörter vor einem Lebensmittel, die zum Namen gehören ("rote Zwiebeln") */
const ADJECTIVES = /^(rot|grün|gelb|weiß|schwarz|braun|klein|groß|gekocht|geräuchert|gefroren|tiefgekühlt|getrocknet|gerieben|gehackt|geschält|alt|halbfett|vollfett|griechisch|italienisch|frische?)(e|er|es|en)?$/i;

// --- Zahlen und Einheiten --------------------------------------------------------

const SMALL: Record<string, number> = {
  ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, eins: 1, zwei: 2, drei: 3, vier: 4, fünf: 5,
  sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, dreizehn: 13, vierzehn: 14,
  fünfzehn: 15, sechzehn: 16, siebzehn: 17, achtzehn: 18, neunzehn: 19,
};
const TENS: Record<string, number> = {
  zwanzig: 20, dreißig: 30, vierzig: 40, fünfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
};
const FRACTIONS: Record<string, number> = {
  halb: 0.5, halbe: 0.5, halben: 0.5, halber: 0.5, halbes: 0.5, viertel: 0.25, dreiviertel: 0.75,
  anderthalb: 1.5, eineinhalb: 1.5, zweieinhalb: 2.5, dreieinhalb: 3.5, dutzend: 12,
};

/** Deutsches Zahlwort → Zahl ("zwei" → 2, "fünfundzwanzig" → 25, "zweihundert" → 200) */
export function germanNumber(word: string): number | null {
  const w = word.toLowerCase();
  if (w in SMALL) return SMALL[w];
  if (w in TENS) return TENS[w];
  if (w in FRACTIONS) return FRACTIONS[w];
  const hundred = w.indexOf("hundert");
  if (hundred >= 0) {
    const before = w.slice(0, hundred);
    const after = w.slice(hundred + "hundert".length);
    const factor = before ? germanNumber(before === "ein" ? "eins" : before) : 1;
    const rest = after ? germanNumber(after) : 0;
    return factor !== null && rest !== null ? factor * 100 + rest : null;
  }
  const und = w.match(/^(.+?)und(.+)$/);
  if (und && und[2] in TENS) {
    const ones = germanNumber(und[1] === "ein" ? "eins" : und[1]);
    return ones !== null && ones < 10 ? ones + TENS[und[2]] : null;
  }
  return null;
}

const isHalf = (word: string) => /^halbe?[nrs]?$/i.test(word);

/** Gesprochene/geschriebene Einheit → Einheit im Vorrat */
const UNIT_WORDS: Record<string, string> = {
  g: "g", gr: "g", gramm: "g", kg: "kg", kilo: "kg", kilogramm: "kg", pfund: "Pfund",
  ml: "ml", milliliter: "ml", l: "l", liter: "l",
  el: "EL", esslöffel: "EL", tl: "TL", teelöffel: "TL",
  stück: "Stück", stücke: "Stück", stk: "Stück", prise: "Prise", prisen: "Prise",
  dose: "Dose", dosen: "Dose", büchse: "Dose", büchsen: "Dose", bund: "Bund", bünde: "Bund", bündel: "Bund",
  packung: "Packung", packungen: "Packung", päckchen: "Packung", pck: "Packung", pack: "Packung", packerl: "Packung",
  becher: "Becher", glas: "Glas", gläser: "Glas", scheibe: "Scheibe", scheiben: "Scheibe",
  flasche: "Flasche", flaschen: "Flasche", tüte: "Tüte", tüten: "Tüte", beutel: "Tüte",
  zehe: "Zehe", zehen: "Zehe", kopf: "Kopf", köpfe: "Kopf", netz: "Netz", schale: "Schale", schalen: "Schale",
};

const NUMBER_RE = /^\d+(?:[.,]\d+)?$/;
const NUMBER_UNIT_RE = /^(\d+(?:[.,]\d+)?)([a-zäöü]+)$/i;

function isAmountStart(word: string): boolean {
  return NUMBER_RE.test(word) || NUMBER_UNIT_RE.test(word) || germanNumber(word) !== null || /^[½¼¾]$/.test(word);
}

// --- Zerlegen --------------------------------------------------------------------

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Füllwörter/-phrasen entfernen (ganze Wörter, ohne Groß/Klein) */
function removeFillers(words: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const phrase = FILLER_PHRASES.find((p) => {
      const parts = p.split(" ");
      return parts.every((part, k) => words[i + k]?.toLowerCase() === part);
    });
    if (phrase) {
      i += phrase.split(" ").length - 1;
      continue;
    }
    if (!FILLER_WORDS.has(words[i].toLowerCase())) out.push(words[i]);
  }
  return out;
}

type Chunk = { amount: number | null; unit: string; words: string[] };

/** Wörter in Abschnitte "Menge Einheit Name…" teilen; ein Zahlwort beginnt einen neuen Abschnitt */
function chunksOf(words: string[]): Chunk[] {
  const chunks: Chunk[] = [];
  let i = 0;
  while (i < words.length) {
    const chunk: Chunk = { amount: null, unit: "", words: [] };
    const w = words[i];
    const fraction: Record<string, number> = { "½": 0.5, "¼": 0.25, "¾": 0.75 };
    if (NUMBER_RE.test(w)) {
      chunk.amount = Number(w.replace(",", "."));
      i++;
    } else if (NUMBER_UNIT_RE.test(w)) {
      // "200g" → 200 + "g"
      const [, num, unitWord] = w.match(NUMBER_UNIT_RE)!;
      chunk.amount = Number(num.replace(",", "."));
      words[i] = unitWord;
    } else if (w in fraction) {
      chunk.amount = fraction[w];
      i++;
    } else if (germanNumber(w) !== null && i + 1 < words.length) {
      chunk.amount = germanNumber(w);
      i++;
    }
    // "ein halbes Brot" → 0,5 / "zwei halbe" bleibt 1
    if (chunk.amount !== null && i + 1 < words.length && isHalf(words[i])) {
      chunk.amount *= 0.5;
      i++;
    }
    const maybeUnit = words[i]?.toLowerCase().replace(/\.$/, "");
    if (maybeUnit && maybeUnit in UNIT_WORDS && i + 1 < words.length) {
      chunk.unit = UNIT_WORDS[maybeUnit];
      i++;
    }
    while (i < words.length && !(chunk.words.length > 0 && isAmountStart(words[i]))) {
      chunk.words.push(words[i]);
      i++;
    }
    if (chunk.words.length > 0) chunks.push(chunk);
  }
  return chunks;
}

/** Namen eines Abschnitts in bekannte Lebensmittel bzw. unbekannte Wörter aufteilen */
function itemsOf(chunk: Chunk): ParsedLeftover[] {
  const items: ParsedLeftover[] = [];
  const { words } = chunk;
  let unknown: string[] = [];
  let adjective = "";

  const push = (item: Omit<ParsedLeftover, "amount" | "unit">) => {
    // Menge und Einheit gehören zur ersten Zutat des Abschnitts
    const first = items.length === 0;
    items.push({ ...item, amount: first ? chunk.amount : null, unit: first ? chunk.unit : "" });
  };
  const flushUnknown = () => {
    if (unknown.length === 0) return;
    const heard = unknown.join(" ");
    const result = recognizeFood(heard);
    push({
      name: capitalize(heard),
      heard,
      known: false,
      suggestion: result.known ? null : (result.suggestion?.singular ?? null),
    });
    unknown = [];
  };

  const pushKnown = (result: ReturnType<typeof recognizeFood>, phrase: string) => {
    if (!result.known) return;
    flushUnknown();
    const first = items.length === 0;
    const name = result.match
      ? foodName(result.match.food, first ? chunk.amount : null, first ? chunk.unit : "", result.match.form)
      : capitalize(phrase);
    push({ name: capitalize(adjective ? `${adjective} ${name}` : name), heard: phrase, known: true, suggestion: null });
    adjective = "";
  };

  for (let i = 0; i < words.length; ) {
    // 1. Längste exakt bekannte Wortfolge ("saure Sahne", "Crème fraîche", "Eier")
    const len = [3, 2, 1].find((n) => i + n <= words.length && findFood(words.slice(i, i + n).join(" ")));
    if (len) {
      const phrase = words.slice(i, i + len).join(" ");
      pushKnown(recognizeFood(phrase), phrase);
      i += len;
      continue;
    }
    // 2. Adjektiv vor einem Lebensmittel ("frische Petersilie") – nicht als Tippfehler werten
    if (ADJECTIVES.test(words[i]) && i + 1 < words.length) {
      flushUnknown();
      adjective = words[i].toLowerCase();
      i++;
      continue;
    }
    // 3. Zusammengesetzt oder mit Tippfehler ("Kirschtomaten", "Brokoli")
    const result = recognizeFood(words[i]);
    if (result.known) {
      pushKnown(result, words[i]);
    } else {
      if (adjective) unknown.push(adjective);
      adjective = "";
      unknown.push(words[i]);
    }
    i++;
  }
  if (adjective) unknown.push(adjective);
  flushUnknown();
  return items;
}

/**
 * "also dann noch zwei Brokoli und äh ein Becher Sahne" →
 * [{2, "", "Brokkoli"}, {1, "Becher", "Sahne"}]
 */
export function ruleParseLeftovers(text: string): ParsedLeftover[] {
  return text
    // Komma zwischen Ziffern ist ein Dezimalkomma ("1,5 Liter"), kein Trenner
    .split(/(?<!\d),|,(?!\d)|;|\n|\.(?!\d)|!|\?|\bund\b|\bsowie\b|\bplus\b/i)
    .map((part) => removeFillers(part.split(/\s+/).map((w) => w.replace(/^[„“"'(]+|[„“"')]+$/g, "")).filter(Boolean)))
    .filter((words) => words.length > 0)
    .flatMap(chunksOf)
    .flatMap(itemsOf)
    .filter((item) => item.name.trim());
}
