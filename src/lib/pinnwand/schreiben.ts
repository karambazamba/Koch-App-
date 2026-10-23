// „＋“ in der Pinnwand = Mia schreibt mit (Tafel 69): Gesagtes wird direkt
// angepinnt – nur Füllwörter („äh“, „also“) fallen weg, der Sinn bleibt 1:1.
// Klingt es nach Einkauf („Milch auf die Liste“) oder nach einem Termin
// („Zahnarzt am Freitag um 16 Uhr“), fragt Mia kurz mit zwei Knöpfen. Rein.

import type { PinQuote } from "@/lib/pinnwand/model";

const FILLERS = /(?<![a-zäöüß])(?:äh+m?|öh+m?|ähm|ehm|hm+|halt so)(?![a-zäöüß])[,.]?\s*/gi;

/** Füllwörter weg, sonst unverändert (erster Buchstabe groß) */
export function cleanFillers(text: string): string {
  const t = text
    .replace(FILLERS, "")
    .replace(/^\s*(?:also|ja also|okay also|so)(?![a-zäöüß])[,]?\s*/i, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,.!?])/g, "$1")
    .trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "";
}

const DAY = /(?<![a-zäöüß])(?:heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|am\s+\d{1,2}\.)(?![a-zäöüß])/i;
const TIME = /(?<![a-zäöüß\d])(?:um\s+)?\d{1,2}(?::\d{2})?\s*uhr(?![a-zäöüß])|(?<![a-zäöüß])um\s+\d{1,2}(?::\d{2})?(?![\d])/i;
/** „Ich bin um 20 Uhr da“, „Komme später“ – Absprachen sind Pinnwand, keine Termine */
const SELF = /^(?:ich|wir|bin|sind|komme|kommen|hol|hole|bring|bringe)(?![a-zäöüß])/i;
const SHOP = /(?<![a-zäöüß])(?:auf\s+die\s+(?:einkaufs)?liste|einkaufsliste|einkaufen|besorgen|kaufen)(?![a-zäöüß])/i;

/** Klingt es nach Einkauf oder Termin? Dann fragt Mia kurz nach (sonst null = anpinnen) */
export function pinIntent(text: string): "einkauf" | "termin" | null {
  const t = text.trim();
  if (SHOP.test(t)) return "einkauf";
  if (!SELF.test(t) && DAY.test(t) && TIME.test(t)) return "termin";
  return null;
}

/** Die zwei Knöpfe der Rückfrage */
export const pinChoiceLabels = (intent: "einkauf" | "termin") => ["An die Pinnwand", intent === "einkauf" ? "Auf die Einkaufsliste" : "In den Kalender"] as const;

/** Mias Bestätigung (darunter der Knopf „Rückgängig“) */
export const pinnedText = (text: string) => `Steht für alle an der Pinnwand:\n„${text}“\n✓ Angepinnt`;

/** Zitat für eine Antwort (Sprachnachrichten: „Sprachnachricht“) */
export function quoteOf(item: { id: string; data: { author: string; text?: string } }): PinQuote {
  return { id: item.id, author: item.data.author, text: (item.data.text ?? "Sprachnachricht").slice(0, 80) };
}
