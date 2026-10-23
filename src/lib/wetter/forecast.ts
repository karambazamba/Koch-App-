// Wetter: Vorhersage-Format, Wetterlage (WMO-Code), ehrliche Tagesbeschreibung
// aus den Stunden (`dayLook`, `buildDays`) und EIN Tipp für heute –
// rein, damit Kachel, Lotte, Server und Tests gleich rechnen. Der Tipp bezieht
// sich wenn möglich auf heutige Termine ("☂️ Ab 15 Uhr Regen – Schirm für
// Kinderarzt"), sonst Frost, Hitze, Wind – oder nichts.

import { windOf, type Wind } from "@/lib/wetter/wind";

/** Eine Stunde: rain = Regenrisiko %, mm = Niederschlag, sun = Sonnenminuten, cloud = Bewölkung %,
 *  wind = mittlere Windstärke km/h, dir = Windrichtung in Grad (woher) – beide fehlen in älteren Daten */
export type ForecastHour = { date: string; hour: number; temp: number; code: number; rain: number; gust: number; mm: number; sun: number; cloud: number; wind?: number; dir?: number };
/** Ein Tag (aus den Stunden gebaut): code/text = ehrliche Beschreibung 7–21 Uhr, rain = höchstes Regenrisiko, sun = Sonnenstunden */
export type ForecastDay = { date: string; code: number; text: string; max: number; min: number; rain: number; mm: number; sun: number; wet: number; /** 7–21 Uhr; null in älteren Daten */ wind?: Wind | null };
export type Forecast = {
  place: string;
  /** Abrufzeit (ISO) */
  fetchedAt: string;
  /** dwd = DWD über Bright Sky, icon = Open-Meteo (DWD ICON), mock = Testmodus */
  source?: "dwd" | "icon" | "mock";
  /** measured = Messung einer nahen Station, raining = misst gerade Regen */
  current: { temp: number; code: number; measured?: boolean; raining?: boolean };
  hours: ForecastHour[];
  days: ForecastDay[];
};

export type WeatherKind = "klar" | "heiter" | "wolkig" | "nebel" | "niesel" | "regen" | "schnee" | "schauer" | "gewitter";

/** WMO-Code → Art + Beschreibung */
export function weatherKind(code: number): { kind: WeatherKind; text: string } {
  if (code === 0) return { kind: "klar", text: "Sonnig" };
  if (code <= 2) return { kind: "heiter", text: "Heiter" };
  if (code === 3) return { kind: "wolkig", text: "Bewölkt" };
  if (code === 45 || code === 48) return { kind: "nebel", text: "Nebel" };
  if (code >= 51 && code <= 57) return { kind: "niesel", text: "Nieselregen" };
  if ((code >= 61 && code <= 67) || code === 80 || code === 81 || code === 82) return { kind: code >= 80 ? "schauer" : "regen", text: code >= 80 ? "Schauer" : "Regen" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { kind: "schnee", text: "Schnee" };
  if (code >= 95) return { kind: "gewitter", text: "Gewitter" };
  return { kind: "wolkig", text: "Bewölkt" };
}

/**
 * Echte Regenstunde: mindestens 0,2 mm UND Regenrisiko ab 50 % – nicht der
 * Wettercode allein (ein einzelner Schauer-Code machte früher den Tag zu „Regen“).
 */
export const isRainy = (h: ForecastHour) => h.mm >= 0.2 && h.rain >= 50;

const DAY_FROM = 7;
const DAY_TO = 21;
const SNOW = (c: number) => (c >= 71 && c <= 77) || c === 85 || c === 86;

/**
 * Ehrliche Beschreibung eines Tages aus den Stunden 7–21 Uhr: Gewitter/Schnee
 * nur ab echter Stunde, Sturm ab Böen 75 km/h, „Regnerisch“ ab 4 Regenstunden
 * oder 3 mm, „Schauer möglich“ bei 1–3, sonst nach Sonnenstunden: Sonnig (≥ 6),
 * Sonne und Wolken (2–6), Wolkig – bzw. Bedeckt bei dichten Wolken.
 */
export function dayLook(hours: ForecastHour[], daytime = true): { code: number; text: string; wet: number; mm: number; sun: number } {
  const day = daytime ? hours.filter((h) => h.hour >= DAY_FROM && h.hour <= DAY_TO) : hours;
  const hs = day.length ? day : hours;
  // Sonnenstunden-Grenzen für 15 Tagesstunden (6 / 2), für kürzere Abschnitte anteilig
  const share = hs.length / (DAY_TO - DAY_FROM + 1);
  const wet = hs.filter(isRainy);
  const mm = Math.round(hs.reduce((s, h) => s + h.mm, 0) * 10) / 10;
  const sun = Math.round((hs.reduce((s, h) => s + h.sun, 0) / 60) * 10) / 10;
  const cloud = hs.length ? hs.reduce((s, h) => s + h.cloud, 0) / hs.length : 0;
  const base = { wet: wet.length, mm, sun };
  if (wet.some((h) => h.code >= 95)) return { ...base, code: 95, text: "Gewitter" };
  if (wet.some((h) => SNOW(h.code))) return { ...base, code: 73, text: "Schnee" };
  if (wet.length >= 4 || mm >= 3) return { ...base, code: 61, text: "Regnerisch" };
  if (wet.length >= 1) return { ...base, code: 80, text: "Schauer möglich" };
  if (Math.max(0, ...hs.map((h) => h.gust)) >= 75) return { ...base, code: 3, text: "Stürmisch" };
  if (sun >= 6 * share) return { ...base, code: 0, text: "Sonnig" };
  if (sun >= 2 * share) return { ...base, code: 2, text: "Sonne und Wolken" };
  if (hs.some((h) => h.code === 45 || h.code === 48) && hs.filter((h) => h.code === 45 || h.code === 48).length >= hs.length / 2) return { ...base, code: 45, text: "Neblig" };
  return cloud >= 85 ? { ...base, code: 3, text: "Bedeckt" } : { ...base, code: 3, text: "Wolkig" };
}

/** Tage aus den Stunden (nur Tage mit mindestens 12 Stunden) */
export function buildDays(hours: ForecastHour[]): ForecastDay[] {
  const dates = [...new Set(hours.map((h) => h.date))];
  return dates.flatMap((date) => {
    const hs = hours.filter((h) => h.date === date);
    if (hs.length < 12) return [];
    const look = dayLook(hs);
    const daytime = hs.filter((h) => h.hour >= DAY_FROM && h.hour <= DAY_TO);
    return [{ date, code: look.code, text: look.text, max: Math.max(...hs.map((h) => h.temp)), min: Math.min(...hs.map((h) => h.temp)), rain: Math.max(0, ...(daytime.length ? daytime : hs).map((h) => h.rain)), mm: look.mm, sun: look.sun, wet: look.wet, wind: windOf(hs, true) }];
  });
}

export const round = (n: number) => Math.round(n);

/** Stunden von heute ab jetzt */
export const hoursToday = (fc: Forecast, today: string) => fc.hours.filter((h) => h.date === today);

/** Tief/Hoch von heute */
export function todayRange(fc: Forecast, today: string): { min: number; max: number } | null {
  const day = fc.days.find((d) => d.date === today);
  if (day) return { min: round(day.min), max: round(day.max) };
  const hs = hoursToday(fc, today);
  return hs.length ? { min: round(Math.min(...hs.map((h) => h.temp))), max: round(Math.max(...hs.map((h) => h.temp))) } : null;
}

export type TipTermin = { title: string; time: string };

/**
 * EIN Tipp für heute (oder null): Regen zur Zeit eines Termins → "☂️ Ab 15 Uhr
 * Regen – Schirm für Kinderarzt"; sonst Regen später → "☂️ Ab 15 Uhr Regen";
 * Frost morgens → "Heute früh glatt ❄️"; ab 25 °C → Sonnencreme; Sturm/Wind.
 */
export function weatherTip(fc: Forecast, today: string, nowMinutes: number, termine: TipTermin[] = []): string | null {
  const hs = hoursToday(fc, today);
  const nowHour = Math.floor(nowMinutes / 60);
  const ahead = hs.filter((h) => h.hour >= nowHour);
  // „Gerade“ nur, wenn die Station wirklich Regen misst – sonst die nächste echte Regenstunde
  const raining = Boolean(fc.current.raining);
  const firstRain = raining ? (ahead.find(isRainy) ?? { hour: nowHour }) : ahead.find((h) => isRainy(h) && h.hour > nowHour);
  if (firstRain) {
    const rainHours = new Set(ahead.filter(isRainy).map((h) => h.hour));
    if (raining) rainHours.add(nowHour);
    const hit = termine
      .filter((t) => /^\d{2}:\d{2}$/.test(t.time) && Number(t.time.slice(0, 2)) >= nowHour)
      .sort((a, b) => a.time.localeCompare(b.time))
      .find((t) => rainHours.has(Number(t.time.slice(0, 2))));
    const start = raining ? "Gerade" : `Ab ${firstRain.hour} Uhr`;
    if (hit) return `☂️ ${start} Regen – Schirm für ${hit.title.length > 24 ? `${hit.title.slice(0, 23)}…` : hit.title}`;
    return `☂️ ${start} Regen`;
  }
  const early = hs.filter((h) => h.hour >= 5 && h.hour <= 9);
  if (nowHour < 11 && early.length && Math.min(...early.map((h) => h.temp)) <= 0) return "Heute früh glatt ❄️";
  const gust = Math.max(0, ...ahead.map((h) => h.gust));
  if (gust >= 75) return `Sturmböen bis ${Math.round(gust / 5) * 5} km/h 🌬️`;
  const range = todayRange(fc, today);
  if (range && range.max >= 25 && nowHour < 18) return "Sonnencreme einpacken ☀️";
  if (gust >= 50) return `Windig – Böen bis ${Math.round(gust / 5) * 5} km/h 🌬️`;
  return null;
}

/** Kurze Antwort für Lotte: "Morgen in Eutin: Regen, 9 bis 14 °C." */
export function dayAnswer(fc: Forecast, date: string, label: string): string | null {
  const d = fc.days.find((x) => x.date === date);
  if (!d) return null;
  const rain = d.wet > 0 ? ` Regenrisiko ${d.rain} % – lieber einen Schirm mitnehmen ☂️` : d.rain >= 30 ? ` Regenrisiko ${d.rain} %, eher trocken.` : "";
  const sun = d.sun >= 1 && d.wet === 0 ? ` Etwa ${Math.round(d.sun)} Std. Sonne.` : "";
  return `${label} in ${fc.place}: ${d.text}, ${round(d.min)} bis ${round(d.max)} °C.${rain}${sun}`;
}

/** "Brauch ich heute einen Schirm?" */
export function umbrellaAnswer(fc: Forecast, today: string, nowMinutes: number): string {
  const nowHour = Math.floor(nowMinutes / 60);
  if (fc.current.raining) return `Ja, gerade regnet es in ${fc.place} – Schirm lohnt sich ☂️`;
  const ahead = hoursToday(fc, today).filter((h) => h.hour >= nowHour);
  const first = ahead.find(isRainy);
  if (!first) return `Heute bleibt es trocken in ${fc.place} – kein Schirm nötig ☀️`;
  const wet = ahead.filter(isRainy).length;
  return wet <= 3 ? `Ab ${first.hour} Uhr sind Schauer möglich in ${fc.place} – ein Schirm schadet nicht ☂️` : `Ja, ab ${first.hour} Uhr regnet es in ${fc.place} – Schirm lohnt sich ☂️`;
}

/** Prüfen, was vom Server kommt */
export function sanitizeForecast(raw: unknown): Forecast | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Forecast;
  if (typeof f.place !== "string" || !Array.isArray(f.hours) || !Array.isArray(f.days) || !f.current) return null;
  const isNum = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n);
  const num = (n: unknown) => (isNum(n) ? n : 0);
  const hours = f.hours
    .filter((h) => h && typeof h.date === "string")
    .map((h) => ({
      date: h.date,
      hour: num(h.hour),
      temp: num(h.temp),
      code: num(h.code),
      rain: num(h.rain),
      gust: num(h.gust),
      mm: num(h.mm),
      sun: num(h.sun),
      cloud: num(h.cloud),
      // Wind nur, wenn er wirklich da ist (ältere Daten: keine Anzeige statt „0 km/h“)
      ...(isNum(h.wind) ? { wind: h.wind } : {}),
      ...(isNum(h.dir) ? { dir: h.dir } : {}),
    }));
  // Tage immer selbst aus den Stunden (auch für ältere gespeicherte Daten ohne Beschreibung)
  const built = buildDays(hours);
  const days = built.length ? built : f.days.filter((d) => d && typeof d.date === "string").map((d) => ({ date: d.date, code: num(d.code), text: weatherKind(num(d.code)).text, max: num(d.max), min: num(d.min), rain: num(d.rain), mm: 0, sun: 0, wet: 0 }));
  return {
    place: f.place.slice(0, 60),
    fetchedAt: typeof f.fetchedAt === "string" ? f.fetchedAt : new Date(0).toISOString(),
    ...(f.source === "dwd" || f.source === "icon" || f.source === "mock" ? { source: f.source } : {}),
    current: { temp: num(f.current.temp), code: num(f.current.code), measured: f.current.measured === true, raining: f.current.raining === true },
    hours,
    days,
  };
}

const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];

/** Wetterfrage erkennen: Tag ("morgen", "am Samstag"), Bezeichnung, Schirm-Frage – oder null */
export function weatherQuestion(text: string, today: string): { date: string; label: string; umbrella: boolean; wind: boolean } | null {
  const t = text.toLowerCase();
  const umbrella = /\b(schirm|regnet|regen)\b/.test(t) && /\b(brauch|nehm|mitnehmen|wird|gibt)\w*/.test(t);
  // „Ist es windig?“, „Woher kommt der Wind morgen?“, „Stürmt es?“
  const wind = /\b(windig|wind|stürm\w*|sturm|böen)(?![a-zäöüß])/.test(t) && /\?|\b(ist|wird|woher|wie|kommt|weht)\b/.test(t);
  if (!umbrella && !wind && !(/\bwetter\b/.test(t) && /\?|\bwie\b|\bwird\b/.test(t))) return null;
  const add = (n: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  // Kein \b vor „ü“: in JS-Regex ist „ü“ kein Wortzeichen, \bübermorgen griff nie
  if (/übermorgen\b/.test(t)) return { date: add(2), label: "Übermorgen", umbrella, wind };
  if (/\bmorgen\b/.test(t)) return { date: add(1), label: "Morgen", umbrella, wind };
  const wd = WEEKDAYS.findIndex((d) => t.includes(d));
  if (wd >= 0) {
    const cur = new Date(`${today}T12:00:00Z`).getUTCDay();
    const n = (wd - cur + 7) % 7 || 7;
    return { date: add(n), label: `Am ${WEEKDAYS[wd][0].toUpperCase()}${WEEKDAYS[wd].slice(1)}`, umbrella, wind };
  }
  return { date: today, label: "Heute", umbrella, wind };
}
