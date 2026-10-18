// Hilfen für "Zusammen backen": Zeiten in Schritten erkennen (Timer),
// Backofen-Angaben als Text, Kinder-Schritte reihum.

import type { OvenSettings } from "./types";

/** Minuten aus einem Schritt ("30 Minuten ruhen lassen", "1 Stunde gehen lassen") – sonst null */
export function stepMinutes(text: string): number | null {
  const hours = text.match(/(\d+(?:[.,]\d+)?)\s*(?:–|-|bis)?\s*(?:\d+\s*)?(stunden?|std\.?)\b/i);
  if (hours) return Math.round(Number(hours[1].replace(",", ".")) * 60);
  const minutes = text.match(/(\d+)\s*(?:(?:–|-|bis)\s*\d+\s*)?(minuten|min\.?)\b/i);
  return minutes ? Number(minutes[1]) : null;
}

/** "180 °C Ober-/Unterhitze · 40 Min." */
export function ovenText(oven: OvenSettings): string {
  return `${oven.temp} °C ${oven.mode === "umluft" ? "Umluft" : "Ober-/Unterhitze"} · ${oven.minutes} Min.`;
}

/** Wer beim n-ten Kinder-Schritt dran ist (reihum) */
export function kidStepLabel(names: string[], order: number): string {
  return names[order % names.length];
}
