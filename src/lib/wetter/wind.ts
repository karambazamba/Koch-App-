// Wind (Tafel 63 B): Stärke als Windsack in drei Stufen, Richtung als
// Buchstaben (nie als Pfeil). Rein – Seite, Mia und Tests rechnen gleich.
// Tageswert aus den Stunden 7–21 Uhr (wie beim Regen): höchste mittlere
// Windstärke, dazu die stärkste Böe; Richtung als nach Stärke gewichteter
// Vektor-Mittelwert (350° + 10° = Nord, nicht Süd).

import type { ForecastHour } from "@/lib/wetter/forecast";

export type WindLevel = "leicht" | "windig" | "stuermisch";
export type Wind = { speed: number; gust: number; dir: number | null };

const SHORT = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] as const;
const LONG = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"] as const;
/** Woher der Wind kommt, als Satzteil („aus Westen“) */
const FROM = ["aus Norden", "aus Nordosten", "aus Osten", "aus Südosten", "aus Süden", "aus Südwesten", "aus Westen", "aus Nordwesten"] as const;

/** Stufe des Windsacks: leicht < 20 km/h, windig 20–39, stürmisch ab 40 oder Böen ab 60 */
export function windLevel(speed: number, gust = 0): WindLevel {
  if (speed >= 40 || gust >= 60) return "stuermisch";
  return speed >= 20 ? "windig" : "leicht";
}

const LEVEL_WORD: Record<WindLevel, string> = { leicht: "leichter Wind", windig: "windig", stuermisch: "stürmisch" };

/** Grad (0–360, woher der Wind kommt) → eines von 8 Feldern (Grenzen bei 22,5°) */
const sector = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;
export const dirShort = (deg: number) => SHORT[sector(deg)];
export const dirLong = (deg: number) => LONG[sector(deg)];
export const dirFrom = (deg: number) => FROM[sector(deg)];

/** Nach Stärke gewichteter Mittelwert der Richtungen (als Vektor) – null ohne Wind */
export function meanDirection(list: { speed: number; dir: number }[]): number | null {
  let x = 0;
  let y = 0;
  for (const { speed, dir } of list) {
    const w = Math.max(speed, 0.1);
    x += Math.sin((dir * Math.PI) / 180) * w;
    y += Math.cos((dir * Math.PI) / 180) * w;
  }
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return null;
  return Math.round(((Math.atan2(x, y) * 180) / Math.PI + 360) % 360);
}

/**
 * Wind über mehrere Stunden (Tag 7–21 Uhr bzw. eine Tageszeit). null, wenn die
 * Stunden keine Windstärke haben (ältere gespeicherte Vorhersagen) – dann
 * zeigt die Seite keinen Wind statt „0 km/h“.
 */
export function windOf(hours: ForecastHour[], daytime = false): Wind | null {
  const hs = daytime ? hours.filter((h) => h.hour >= 7 && h.hour <= 21) : hours;
  const known = (hs.length ? hs : hours).filter((h) => typeof h.wind === "number");
  if (!known.length) return null;
  const speed = Math.round(Math.max(...known.map((h) => h.wind!)));
  const gust = Math.round(Math.max(0, ...known.map((h) => h.gust)));
  const dir = meanDirection(known.filter((h) => typeof h.dir === "number").map((h) => ({ speed: h.wind!, dir: h.dir! })));
  return { speed, gust, dir };
}

/** Böen nennen erst ab 50 km/h */
const GUST_SHOW = 50;

/** Kurz für Karten: „22 km/h · W“, ab Böen 50 „35 · W · Böen 60“ */
export function windShort(w: Wind): string {
  const d = w.dir === null ? "" : ` · ${dirShort(w.dir)}`;
  return w.gust >= GUST_SHOW ? `${w.speed}${d} · Böen ${w.gust}` : `${w.speed} km/h${d}`;
}

/** Ausgeschrieben: „22 km/h aus West“ */
export const windLong = (w: Wind) => `${w.speed} km/h${w.dir === null ? "" : ` aus ${dirLong(w.dir)}`}`;

/** VoiceOver: „Wind 22 Kilometer pro Stunde aus Westen, windig“ */
export function windSpoken(w: Wind): string {
  const gust = w.gust >= GUST_SHOW ? `, Böen bis ${w.gust} Kilometer pro Stunde` : "";
  return `Wind ${w.speed} Kilometer pro Stunde${w.dir === null ? "" : ` ${dirFrom(w.dir)}`}, ${LEVEL_WORD[windLevel(w.speed, w.gust)]}${gust}`;
}

/** Für Mia: „Morgen weht es windig mit 28 km/h aus Westen, Böen bis 55 km/h.“ */
export function windAnswer(w: Wind, label: string): string {
  const level = windLevel(w.speed, w.gust);
  const how = level === "leicht" ? "weht nur ein leichter Wind" : level === "windig" ? "wird es windig" : "wird es stürmisch";
  const gust = w.gust >= GUST_SHOW ? `, Böen bis ${w.gust} km/h` : "";
  return `${label} ${how} – ${w.speed} km/h${w.dir === null ? "" : ` ${dirFrom(w.dir)}`}${gust}.`;
}
