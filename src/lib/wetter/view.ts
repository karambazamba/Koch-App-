// Wetter in Worten – rein, für Kachel, Wetter-Seite und Tests: Wetterlage als
// Farbgruppe (Hintergrund der Kachel), Morgens/Mittags/Abends mit Tipp-Chips,
// EIN Satz zum Tag (mit Bezug auf Termine), 7 Tage in Worten und der beste Tag
// für draußen. Keine Balken, keine Stunden-Tabellen.

import { dayLook, isRainy, round, weatherKind, type Forecast, type ForecastDay, type TipTermin } from "./forecast";

/** Farbgruppe der Kachel (Verlauf): sonnig · bewoelkt · regen · schnee · gewitter */
export type WeatherGroup = "sonnig" | "bewoelkt" | "regen" | "schnee" | "gewitter";

export function weatherGroup(code: number): WeatherGroup {
  const k = weatherKind(code).kind;
  if (k === "klar" || k === "heiter") return "sonnig";
  if (k === "schnee") return "schnee";
  if (k === "gewitter") return "gewitter";
  if (k === "niesel" || k === "regen" || k === "schauer") return "regen";
  return "bewoelkt";
}

export type PartId = "morgens" | "mittags" | "abends";
export type DayPart = { id: PartId; label: string; code: number; text: string; temp: number; rain: number; gust: number; tips: string[] };

const PARTS: { id: PartId; label: string; from: number; to: number }[] = [
  { id: "morgens", label: "Morgens", from: 6, to: 11 },
  { id: "mittags", label: "Mittags", from: 11, to: 17 },
  { id: "abends", label: "Abends", from: 17, to: 23 },
];

/** Kleine Tipps je Tageszeit (höchstens 2) – Schirm nur bei echter Regenstunde */
function partTips(code: number, temp: number, wet: number, gust: number): string[] {
  const tips: string[] = [];
  const g = weatherGroup(code);
  if (g === "gewitter") tips.push("⚡ Lieber drinnen");
  else if (wet > 0) tips.push("☂️ Schirm");
  if (temp <= 0) tips.push("❄️ Glatt");
  else if (temp <= 5) tips.push("🧣 Warm anziehen");
  else if (temp >= 25) tips.push("🧴 Sonnencreme");
  if (gust >= 50 && tips.length < 2) tips.push("🌬️ Windig");
  return tips.slice(0, 2);
}

/** Morgens · Mittags · Abends für einen Tag (nur Tageszeiten mit Stunden), nach derselben Regel wie der Tag */
export function dayParts(fc: Forecast, date: string): DayPart[] {
  const hs = fc.hours.filter((h) => h.date === date);
  return PARTS.flatMap((p) => {
    const part = hs.filter((h) => h.hour >= p.from && h.hour < p.to);
    if (!part.length) return [];
    const look = dayLook(part, false);
    const temp = round(part.reduce((s, h) => s + h.temp, 0) / part.length);
    const rain = Math.max(...part.map((h) => h.rain));
    const gust = Math.max(...part.map((h) => h.gust));
    return [{ id: p.id, label: p.label, code: look.code, text: look.text, temp, rain, gust, tips: partTips(look.code, temp, look.wet, gust) }];
  });
}

const short = (t: string) => (t.length > 24 ? `${t.slice(0, 23)}…` : t);

/** Kurz in Worten: "Sonne und Wolken, 9 bis 15°" */
export function dayWords(d: ForecastDay): string {
  return `${d.text || weatherKind(d.code).text}, ${round(d.min)} bis ${round(d.max)}°`;
}

/** Kleine Zusätze zur 7-Tage-Zeile: Regenrisiko ab 30 %, Sonnenstunden nur über 0 */
export function dayExtras(d: ForecastDay): { rain: string | null; sun: string | null } {
  return { rain: d.rain >= 30 ? `☂ ${d.rain} %` : null, sun: d.sun >= 0.5 ? `☀ ${Math.round(d.sun)} Std.` : null };
}

/**
 * EIN Satz zum Tag mit Bezug auf Termine: "Zu Kinderarzt um 16 Uhr regnet es
 * – Schirm mit." / "Für Elternabend bleibt es trocken." / sonst die Lage in
 * Worten. `fromHour`: nur Stunden ab jetzt (heute).
 */
export function daySentence(fc: Forecast, date: string, termine: TipTermin[] = [], fromHour = 0): string | null {
  const day = fc.days.find((d) => d.date === date);
  const hs = fc.hours.filter((h) => h.date === date && h.hour >= fromHour);
  const timed = termine.filter((t) => /^\d{2}:\d{2}$/.test(t.time) && Number(t.time.slice(0, 2)) >= fromHour).sort((a, b) => a.time.localeCompare(b.time));
  const at = (t: TipTermin) => hs.find((h) => h.hour === Number(t.time.slice(0, 2)));
  const wet = timed.find((t) => {
    const h = at(t);
    return h && isRainy(h);
  });
  if (wet) return `Zu ${short(wet.title)} um ${Number(wet.time.slice(0, 2))} Uhr regnet es – Schirm mit.`;
  const first = timed.find((t) => at(t));
  if (first && hs.length) return `Für ${short(first.title)} bleibt es trocken.`;
  const rain = hs.find(isRainy);
  if (rain && day) return `Ab ${rain.hour} Uhr ${hs.filter(isRainy).length <= 3 ? "Schauer möglich" : "Regen"}, ${round(day.min)} bis ${round(day.max)}°.`;
  return day ? `${dayWords(day)}.` : null;
}

/** Bester Tag für draußen (wenig Regen, hell, angenehm) – oder null, wenn keiner taugt */
export function bestOutdoorDay(fc: Forecast, fromDate: string): ForecastDay | null {
  const score = (d: ForecastDay) => {
    const g = weatherGroup(d.code);
    return (g === "sonnig" ? 30 : g === "bewoelkt" ? 15 : 0) - d.rain / 2 - Math.abs(d.max - 20);
  };
  const ok = fc.days.filter((d) => d.date >= fromDate && d.rain < 40 && weatherGroup(d.code) !== "gewitter" && weatherGroup(d.code) !== "regen");
  return ok.length ? ok.reduce((a, b) => (score(b) > score(a) ? b : a)) : null;
}

/** Ab 18 Uhr öffnet die Wetter-Seite auf "Morgen" */
export const weatherStartTab = (minutes: number): "heute" | "morgen" => (minutes >= 18 * 60 ? "morgen" : "heute");
