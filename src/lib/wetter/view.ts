// Wetter in Worten – rein, für Kachel, Wetter-Seite und Tests: Wetterlage als
// Farbgruppe (Hintergrund der Kachel), Morgens/Mittags/Abends mit Tipp-Chips,
// EIN Satz zum Tag (mit Bezug auf Termine), 7 Tage in Worten und der beste Tag
// für draußen. Keine Balken, keine Stunden-Tabellen.

import { WEEKDAYS_SO } from "@/lib/core/days";
import { dayLook, isRainy, round, weatherKind, type Forecast, type ForecastDay, type TipTermin } from "@/lib/wetter/forecast";

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

type PartId = "morgens" | "mittags" | "abends";
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

// --- Wetter-Seite v0.47: Himmel-Karte, Wochen-Band, ein Satz zur Woche -------

/** Himmel der großen Karte: Verlauf je Lage, nachts immer Nachtblau */
export type Sky = "sonne" | "wolken" | "regen" | "gewitter" | "schnee" | "nacht";

export function skyFor(code: number, night = false): Sky {
  if (night) return "nacht";
  const k = weatherKind(code).kind;
  if (k === "klar" || k === "heiter") return "sonne";
  if (k === "gewitter") return "gewitter";
  if (k === "schnee") return "schnee";
  if (k === "regen" || k === "niesel" || k === "schauer") return "regen";
  return "wolken";
}

/** Sonnenauf- und -untergang (Minuten, Ortszeit Berlin) – Näherung für Norddeutschland, reicht für „nachts“ */
export function sunTimes(date: string, lat = 54.1, lon = 10.6): { rise: number; set: number } {
  const d = new Date(`${date}T12:00:00Z`);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  const n = Math.floor((d.getTime() - start) / 86_400_000);
  const decl = (-23.44 * Math.cos(((2 * Math.PI) / 365) * (n + 10)) * Math.PI) / 180;
  const phi = (lat * Math.PI) / 180;
  const cosH = (Math.sin((-0.833 * Math.PI) / 180) - Math.sin(phi) * Math.sin(decl)) / (Math.cos(phi) * Math.cos(decl));
  const h = (Math.acos(Math.max(-1, Math.min(1, cosH))) * 180) / Math.PI;
  // Sommerzeit: letzter Sonntag im März bis letzter Sonntag im Oktober
  const lastSunday = (month: number) => {
    const last = new Date(Date.UTC(d.getUTCFullYear(), month + 1, 0));
    return Date.UTC(last.getUTCFullYear(), month, last.getUTCDate() - last.getUTCDay());
  };
  const offset = d.getTime() >= lastSunday(2) && d.getTime() < lastSunday(9) ? 120 : 60;
  const noon = 720 - 4 * lon + offset;
  return { rise: Math.round(noon - 4 * h), set: Math.round(noon + 4 * h) };
}

export const isNight = (date: string, minutes: number) => {
  const { rise, set } = sunTimes(date);
  return minutes < rise || minutes >= set;
};

/** Zeile unter dem Zustand: "Heute 9 bis 12° · ☂ 39 % · ☀ 3 Std." (Regen ab 30 %, Sonne nur > 0) */
export function skyLine(d: ForecastDay, prefix = ""): string {
  const extras = dayExtras(d);
  return [`${prefix ? `${prefix} ` : ""}${round(d.min)} bis ${round(d.max)}°`, extras.rain, extras.sun].filter(Boolean).join(" · ");
}

/** Farbe einer Säule im Wochen-Band: Sonne · Wolken · Regen */
export type ColumnTone = "sonne" | "wolken" | "regen";

export function columnTone(d: ForecastDay): ColumnTone {
  const g = weatherGroup(d.code);
  if (g === "regen" || g === "gewitter") return "regen";
  return g === "sonnig" ? "sonne" : "wolken";
}

const WEEKDAY = WEEKDAYS_SO;
const weekdayOf = (iso: string) => WEEKDAY[new Date(`${iso}T12:00:00Z`).getUTCDay()];
const isWet = (d: ForecastDay) => d.wet >= 2 || d.mm >= 3 || weatherGroup(d.code) === "gewitter";

/**
 * EIN Satz zur Woche bzw. zum Wochenende (rein, ohne KI) und die Farbe der
 * Karte. Ruhig, ohne Druck-Wörter, nie Panik: „Wochenende eher nass. Am
 * Sonntag gibt’s zwischendurch 2 Std. Sonne.“ · „Ab Dienstag wird’s
 * freundlicher.“ · „Die ganze Woche trocken – gut für draußen.“
 */
export function weekSentence(fc: Forecast, today: string): { text: string; tone: ColumnTone } | null {
  const days = fc.days.filter((d) => d.date >= today).slice(0, 7);
  if (days.length < 3) return null;
  const wet = days.map(isWet);
  const name = (d: ForecastDay) => (d.date === days[1]?.date ? "morgen" : weekdayOf(d.date));
  const sunny = (d: ForecastDay) => Math.round(d.sun);
  if (!wet.some(Boolean)) return { text: days.some((d) => d.wet > 0) ? "Fast die ganze Woche trocken – gut für draußen." : "Die ganze Woche trocken – gut für draußen.", tone: "sonne" };
  // Wochenende (Sa/So, nicht heute) – wenn es vorkommt und beide Tage nass sind
  const weekend = days.slice(1).filter((d) => ["Samstag", "Sonntag"].includes(weekdayOf(d.date)));
  if (weekend.length === 2 && weekend.every(isWet)) {
    const bright = [...weekend].sort((a, b) => b.sun - a.sun)[0];
    return { text: `Wochenende eher nass.${sunny(bright) >= 1 ? ` Am ${weekdayOf(bright.date)} gibt’s zwischendurch ${sunny(bright)} Std. Sonne.` : " Gut für drinnen."}`, tone: "regen" };
  }
  // Besserung: erst nass, dann mindestens zwei trockene Tage am Stück bis zum Ende
  const firstDry = wet.findIndex((w) => !w);
  if (wet[0] && firstDry > 0 && wet.slice(firstDry).every((w) => !w) && days.length - firstDry >= 2) {
    const d = days[firstDry];
    return { text: d.date === days[1].date ? "Ab morgen wird’s freundlicher." : `Ab ${weekdayOf(d.date)} wird’s freundlicher.`, tone: "wolken" };
  }
  if (weekend.length === 2 && !weekend.some(isWet)) return { text: "Zum Wochenende wird’s trocken – gut für draußen.", tone: "sonne" };
  // Erst trocken, dann nasser
  const firstWet = wet.findIndex(Boolean);
  if (firstWet >= 2 && wet.slice(firstWet).every(Boolean)) return { text: `Bis ${weekdayOf(days[firstWet - 1].date)} trocken, danach wird’s nasser.`, tone: "wolken" };
  if (wet.every(Boolean)) return { text: "Eine nasse Woche – gemütlich drinnen und mit Schirm raus.", tone: "regen" };
  const best = bestOutdoorDay(fc, today);
  return { text: best ? `Wechselhaft – am besten für draußen: ${best.date === today ? "heute" : name(best)}.` : "Eine wechselhafte Woche.", tone: wet.filter(Boolean).length > days.length / 2 ? "regen" : "wolken" };
}
