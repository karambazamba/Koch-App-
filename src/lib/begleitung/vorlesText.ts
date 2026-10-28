// Text fürs Vorlesen (rein, ohne Browser): gilt für die Stimme des Handys und
// für Mias Stimme vom Server (`/api/stimme`), damit beide dasselbe sagen.

import { tidyMiaText } from "@/lib/begleitung/tidy";

const UNITS: [RegExp, string][] = [
  [/(\d)\s?kg\b/g, "$1 Kilogramm"],
  [/(\d)\s?g\b/g, "$1 Gramm"],
  [/(\d)\s?ml\b/g, "$1 Milliliter"],
  [/(\d)\s?l\b/g, "$1 Liter"],
  [/(\d)\s?EL\b/g, "$1 Esslöffel"],
  [/(\d)\s?TL\b/g, "$1 Teelöffel"],
  [/(\d)\s?°\s?C\b/g, "$1 Grad"],
  [/\bMin\.(?=\s|$|[,)])/g, "Minuten"],
  [/\bStd\.(?=\s|$|[,)])/g, "Stunden"],
  [/\bPers\.(?=\s|$|[,)])/g, "Personen"],
  [/\bPck\.(?=\s|$|[,)])/g, "Packung"],
  [/\bz\.\s?B\./g, "zum Beispiel"],
  [/\bca\./g, "circa"],
  [/\bbzw\./g, "beziehungsweise"],
  [/\bggf\./g, "gegebenenfalls"],
];

/**
 * Vorlesbarer Text: ohne Emojis, Sonderzeichen und Markdown; Einheiten und
 * Abkürzungen ausgeschrieben, Uhrzeiten natürlich ("17:30" → "17 Uhr 30").
 */
export function cleanForSpeech(text: string): string {
  let t = text
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // Links
    .replace(/\p{Extended_Pictographic}|\p{Emoji_Modifier}|[\u{FE0F}\u{200D}\u{20E3}]/gu, "")
    .replace(/[✓✔✗✕×•]/g, "")
    .replace(/[*_`#>~|]+/g, " ")
    .replace(/\s*[→⇒]\s*/g, ", ")
    .replace(/\s+[·–—]\s+/g, ", ")
    .replace(/[„“”"«»]/g, "")
    // Klammern, Schrägstriche und Auslassungen klingen vorgelesen holprig
    .replace(/\s*\(([^)]*)\)/g, ", $1,")
    .replace(/(\d+)\s*\/\s*(\d+)/g, "$1 von $2")
    .replace(/([A-Za-zÄÖÜäöüß])\s*\/\s*(?=[A-Za-zÄÖÜäöüß])/g, "$1 oder ")
    .replace(/…|\.{3}/g, ".")
    .replace(/\bMo\s*[–-]\s*Fr\b/g, "Montag bis Freitag")
    .replace(/\bSa\s*[–-]\s*So\b/g, "Samstag und Sonntag");
  // Uhrzeiten: "07:30" → "7 Uhr 30", "18:00" → "18 Uhr"
  t = t.replace(/\b([01]?\d|2[0-3]):([0-5]\d)\b/g, (_, h: string, m: string) => `${Number(h)} Uhr${m === "00" ? "" : ` ${Number(m)}`}`);
  for (const [re, to] of UNITS) t = t.replace(re, to);
  return t
    .replace(/\s+([,.!?])/g, "$1")
    .replace(/([,.!?:])(?:\s*,)+/g, "$1")
    .replace(/^[\s,]+/, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** In Sätze bis ~200 Zeichen teilen – Chrome bricht lange Äußerungen sonst nach ~15 s ab */
export function speechChunks(text: string, max = 200): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text];
  const chunks: string[] = [];
  for (const s of sentences) {
    const last = chunks[chunks.length - 1];
    if (last && (last + s).length <= max) chunks[chunks.length - 1] = last + s;
    else chunks.push(s);
  }
  return chunks.map((c) => c.trim()).filter(Boolean);
}

/**
 * Stücke für Mias Stimme vom Server: der erste Satz allein (der erste Ton ist
 * schneller da), danach längere Stücke bis ~300 Zeichen (natürlicher Fluss).
 */
export function stueckeFuerStimme(text: string, max = 300): string[] {
  const [erster, ...rest] = speechChunks(text, 1);
  if (!erster) return [];
  return [erster, ...speechChunks(rest.join(" "), max)];
}

/** Was vorgelesen wird – bereinigt wie jede Antwort, dann sprechbar gemacht */
export const vorlesText = (text: string) => cleanForSpeech(tidyMiaText(text));
