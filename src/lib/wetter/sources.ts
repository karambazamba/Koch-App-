// Wetterdaten in unser Format bringen – rein, ohne Netz (Abruf in server.ts).
// Hauptquelle: DWD MOSMIX über Bright Sky (api.brightsky.dev, /weather für
// Stunden + /current_weather für die Messung der nächsten Station). Fallback:
// Open-Meteo mit dem DWD-Modell ICON (models=icon_seamless). Beide liefern
// dasselbe Forecast-Format; Tage werden immer selbst aus den Stunden gebaut.

import { buildDays, type Forecast, type ForecastHour } from "./forecast";

type Raw = Record<string, unknown>;
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/** Bright-Sky-Zustand/-Symbol → WMO-Code (für unser Symbol-Set) */
function codeFromBrightSky(condition: unknown, icon: unknown, cloud: number | null): number {
  const c = String(condition ?? "");
  const i = String(icon ?? "");
  if (c === "thunderstorm" || i === "thunderstorm") return 95;
  if (c === "snow" || i === "snow") return 73;
  if (c === "sleet" || i === "sleet" || c === "hail" || i === "hail") return 67;
  if (c === "rain" || i === "rain") return 61;
  if (c === "fog" || i === "fog") return 45;
  if (i.startsWith("clear")) return 0;
  if (i.startsWith("partly-cloudy")) return 2;
  if (i === "cloudy") return 3;
  // "wind" oder unbekannt: nach Bewölkung
  return cloud === null ? 3 : cloud < 25 ? 0 : cloud < 70 ? 2 : 3;
}

/** Regenrisiko: Stundenwert, sonst 6-Stunden-Wert, sonst grob aus der Menge */
const probability = (p: number | null, p6: number | null, mm: number) => p ?? p6 ?? (mm >= 0.2 ? 50 : 0);

/** "2026-10-21T15:00:00+02:00" → Datum + Stunde (Ortszeit, tz=Europe/Berlin angefragt) */
const local = (ts: string) => ({ date: ts.slice(0, 10), hour: Number(ts.slice(11, 13)) });

/** Messung älter als 90 Minuten oder Station weiter als 25 km → nicht nehmen */
const STATION_MAX_AGE_MIN = 90;
const STATION_MAX_KM = 25;

/** Bright Sky (/weather + optional /current_weather) → Forecast @public */
export function fromBrightSky(weather: unknown, current: unknown, place: string, nowIso: string): Forecast | null {
  const rows = (weather as Raw)?.weather;
  if (!Array.isArray(rows) || !rows.length) return null;
  const hours: ForecastHour[] = rows
    .filter((r: Raw) => typeof r?.timestamp === "string")
    .map((r: Raw) => {
      const mm = num(r.precipitation) ?? 0;
      const cloud = num(r.cloud_cover);
      return {
        ...local(r.timestamp as string),
        temp: num(r.temperature) ?? 0,
        code: codeFromBrightSky(r.condition, r.icon, cloud),
        rain: Math.round(probability(num(r.precipitation_probability), num(r.precipitation_probability_6h), mm)),
        gust: num(r.wind_gust_speed) ?? 0,
        mm,
        sun: Math.min(60, num(r.sunshine) ?? 0),
        cloud: cloud ?? 0,
      };
    });
  // Doppelte Stunden (Zeitumstellung) – die erste behalten
  const seen = new Set<string>();
  const unique = hours.filter((h) => !seen.has(`${h.date}:${h.hour}`) && Boolean(seen.add(`${h.date}:${h.hour}`)));
  return { place, fetchedAt: nowIso, source: "dwd", current: currentFrom(current, unique, nowIso), hours: unique, days: buildDays(unique) };
}

/** Jetzt: Messung der Station (frisch und nah) – sonst die Vorhersage der aktuellen Stunde */
function currentFrom(current: unknown, hours: ForecastHour[], nowIso: string): Forecast["current"] {
  const c = (current as Raw)?.weather as Raw | undefined;
  const sources = (current as Raw)?.sources;
  const distance = Array.isArray(sources) ? num((sources[0] as Raw)?.distance) : null;
  const ts = typeof c?.timestamp === "string" ? Date.parse(c.timestamp) : NaN;
  const age = (Date.parse(nowIso) - ts) / 60000;
  const fresh = c && Number.isFinite(age) && age <= STATION_MAX_AGE_MIN && distance !== null && distance / 1000 <= STATION_MAX_KM && num(c.temperature) !== null;
  if (fresh && c) {
    const mm = num(c.precipitation_60) ?? num(c.precipitation_30) ?? num(c.precipitation_10) ?? 0;
    const cloud = num(c.cloud_cover);
    const code = codeFromBrightSky(c.condition, c.icon, cloud);
    const raining = mm >= 0.1 || [61, 67, 73, 95].includes(code);
    return { temp: num(c.temperature) ?? 0, code, measured: true, raining };
  }
  return nowFromHours(hours, nowIso);
}

/** Vorhersage der aktuellen Stunde (Ortszeit Berlin) */
function nowFromHours(hours: ForecastHour[], nowIso: string): Forecast["current"] {
  const berlin = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).format(new Date(nowIso));
  const date = berlin.slice(0, 10);
  const hour = Number(berlin.slice(11, 13));
  const h = hours.find((x) => x.date === date && x.hour === hour) ?? hours[0];
  return { temp: h?.temp ?? 0, code: h?.code ?? 3, measured: false, raining: false };
}

/** Open-Meteo (models=icon_seamless) → Forecast – gleiches Format @public */
export function fromOpenMeteo(json: unknown, place: string, nowIso: string): Forecast | null {
  const h = (json as Raw)?.hourly as Record<string, unknown[]> | undefined;
  if (!h || !Array.isArray(h.time) || !h.time.length) return null;
  const at = (key: string, i: number) => num(h[key]?.[i]);
  const hours: ForecastHour[] = (h.time as string[]).map((t, i) => {
    const mm = at("precipitation", i) ?? 0;
    return {
      date: t.slice(0, 10),
      hour: Number(t.slice(11, 13)),
      temp: at("temperature_2m", i) ?? 0,
      code: at("weather_code", i) ?? 3,
      rain: Math.round(probability(at("precipitation_probability", i), null, mm)),
      gust: at("wind_gusts_10m", i) ?? 0,
      mm,
      // Open-Meteo: Sekunden je Stunde
      sun: Math.min(60, Math.round((at("sunshine_duration", i) ?? 0) / 60)),
      cloud: at("cloud_cover", i) ?? 0,
    };
  });
  const cur = (json as Raw)?.current as Raw | undefined;
  const current = cur && num(cur.temperature_2m) !== null ? { temp: num(cur.temperature_2m)!, code: num(cur.weather_code) ?? 3, measured: false, raining: false } : nowFromHours(hours, nowIso);
  return { place, fetchedAt: nowIso, source: "icon", current, hours, days: buildDays(hours) };
}
