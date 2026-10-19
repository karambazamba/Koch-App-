// Wetter: Vorhersage-Format, Wetterlage (WMO-Code) und EIN Tipp für heute –
// rein, damit Kachel, Lotte, Server und Tests gleich rechnen. Der Tipp bezieht
// sich wenn möglich auf heutige Termine ("☂️ Ab 15 Uhr Regen – Schirm für
// Kinderarzt"), sonst Frost, Hitze, Wind – oder nichts.

export type ForecastHour = { date: string; hour: number; temp: number; code: number; rain: number; gust: number };
export type ForecastDay = { date: string; code: number; max: number; min: number; rain: number };
export type Forecast = {
  place: string;
  /** Abrufzeit (ISO) */
  fetchedAt: string;
  current: { temp: number; code: number };
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

const RAINY: WeatherKind[] = ["niesel", "regen", "schauer", "gewitter"];
/** Regnet es in dieser Stunde (Code oder Regenrisiko ab 60 %)? */
export const isRainy = (h: ForecastHour) => RAINY.includes(weatherKind(h.code).kind) || h.rain >= 60;

export const round = (n: number) => Math.round(n);

/** Stunden von heute ab jetzt */
export const hoursToday = (fc: Forecast, today: string) => fc.hours.filter((h) => h.date === today);

/** 4 Zeitpunkte für die Kachel: die nächsten vollen Dreierstunden (z. B. 12 · 15 · 18 · 21) */
export function nextSlots(fc: Forecast, today: string, nowMinutes: number, count = 4): ForecastHour[] {
  const from = Math.floor(nowMinutes / 60) + 1;
  const all = fc.hours.filter((h) => h.date > today || (h.date === today && h.hour >= from));
  const slots = all.filter((h) => h.hour % 3 === 0);
  return slots.slice(0, count);
}

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
  const firstRain = ahead.find(isRainy);
  if (firstRain) {
    const rainHours = new Set(ahead.filter(isRainy).map((h) => h.hour));
    const hit = termine
      .filter((t) => /^\d{2}:\d{2}$/.test(t.time) && Number(t.time.slice(0, 2)) >= nowHour)
      .sort((a, b) => a.time.localeCompare(b.time))
      .find((t) => rainHours.has(Number(t.time.slice(0, 2))));
    const start = firstRain.hour <= nowHour ? "Gerade" : `Ab ${firstRain.hour} Uhr`;
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
  const k = weatherKind(d.code);
  const rain = d.rain >= 50 ? ` Regenrisiko ${d.rain} % – lieber einen Schirm mitnehmen ☂️` : "";
  return `${label} in ${fc.place}: ${k.text}, ${round(d.min)} bis ${round(d.max)} °C.${rain}`;
}

/** "Brauch ich heute einen Schirm?" */
export function umbrellaAnswer(fc: Forecast, today: string, nowMinutes: number): string {
  const ahead = hoursToday(fc, today).filter((h) => h.hour >= Math.floor(nowMinutes / 60));
  const first = ahead.find(isRainy);
  if (!first) return `Heute bleibt es trocken in ${fc.place} – kein Schirm nötig ☀️`;
  return `Ja, ab ${first.hour} Uhr regnet es in ${fc.place} – Schirm lohnt sich ☂️`;
}

/** Prüfen, was vom Server kommt */
export function sanitizeForecast(raw: unknown): Forecast | null {
  if (!raw || typeof raw !== "object") return null;
  const f = raw as Forecast;
  if (typeof f.place !== "string" || !Array.isArray(f.hours) || !Array.isArray(f.days) || !f.current) return null;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : 0);
  return {
    place: f.place.slice(0, 60),
    fetchedAt: typeof f.fetchedAt === "string" ? f.fetchedAt : new Date(0).toISOString(),
    current: { temp: num(f.current.temp), code: num(f.current.code) },
    hours: f.hours.filter((h) => h && typeof h.date === "string").map((h) => ({ date: h.date, hour: num(h.hour), temp: num(h.temp), code: num(h.code), rain: num(h.rain), gust: num(h.gust) })),
    days: f.days.filter((d) => d && typeof d.date === "string").map((d) => ({ date: d.date, code: num(d.code), max: num(d.max), min: num(d.min), rain: num(d.rain) })),
  };
}

const WEEKDAYS = ["sonntag", "montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag"];

/** Wetterfrage erkennen: Tag ("morgen", "am Samstag"), Bezeichnung, Schirm-Frage – oder null */
export function weatherQuestion(text: string, today: string): { date: string; label: string; umbrella: boolean } | null {
  const t = text.toLowerCase();
  const umbrella = /\b(schirm|regnet|regen)\b/.test(t) && /\b(brauch|nehm|mitnehmen|wird|gibt)\w*/.test(t);
  if (!umbrella && !(/\bwetter\b/.test(t) && /\?|\bwie\b|\bwird\b/.test(t))) return null;
  const add = (n: number) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  if (/\bübermorgen\b/.test(t)) return { date: add(2), label: "Übermorgen", umbrella };
  if (/\bmorgen\b/.test(t)) return { date: add(1), label: "Morgen", umbrella };
  const wd = WEEKDAYS.findIndex((d) => t.includes(d));
  if (wd >= 0) {
    const cur = new Date(`${today}T12:00:00Z`).getUTCDay();
    const n = (wd - cur + 7) % 7 || 7;
    return { date: add(n), label: `Am ${WEEKDAYS[wd][0].toUpperCase()}${WEEKDAYS[wd].slice(1)}`, umbrella };
  }
  return { date: today, label: "Heute", umbrella };
}
