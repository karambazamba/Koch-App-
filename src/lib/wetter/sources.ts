// Wetterdaten in unser Format bringen – rein, ohne Netz (Abruf in server.ts).
// Hauptquelle: DWD MOSMIX über Bright Sky (api.brightsky.dev, /weather für
// Stunden + /current_weather für die Messung der nächsten Station, /radar für
// „regnet es JETZT hier?“ – 5-Minuten-Werte des DWD-Regenradars, nur der
// Punkt des Orts). Fallback:
// Open-Meteo mit dem DWD-Modell ICON (models=icon_seamless). Beide liefern
// dasselbe Forecast-Format; Tage werden immer selbst aus den Stunden gebaut.

import { buildDays, type Forecast, type ForecastHour } from "@/lib/wetter/forecast";

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

/** Windstärke (km/h) und -richtung (Grad) nur, wenn geliefert */
const windFields = (speed: number | null, dir: number | null) => ({ ...(speed !== null ? { wind: Math.round(speed * 10) / 10 } : {}), ...(dir !== null ? { dir: Math.round(dir) } : {}) });

/** Regenrisiko: Stundenwert, sonst 6-Stunden-Wert, sonst grob aus der Menge */
const probability = (p: number | null, p6: number | null, mm: number) => p ?? p6 ?? (mm >= 0.2 ? 50 : 0);

/** "2026-10-21T15:00:00+02:00" → Datum + Stunde (Ortszeit, tz=Europe/Berlin angefragt) */
const local = (ts: string) => ({ date: ts.slice(0, 10), hour: Number(ts.slice(11, 13)) });

/** Messung älter als 40 Minuten oder Station weiter als 10 km → nicht nehmen (dann die Vorhersage der Stunde) */
const STATION_MAX_AGE_MIN = 40;
const STATION_MAX_KM = 10;

/** Radar am Ort: Regnet es jetzt? Hat es in der letzten halben Stunde geregnet? */
export type RadarNow = { now: boolean; recent: boolean };

/** Ab so viel Niederschlag je 5 Minuten (in 0,01 mm) zählt es als Regen */
const RADAR_MIN = 2;
const RAIN_CODES = [61, 67, 73, 95];

/**
 * Bright Sky /radar (format=plain): je 5 Minuten ein Raster `precipitation_5`
 * (0,01 mm). Gelesen wird nur die Zelle des Orts (`latlon_position`, sonst
 * die Mitte). Fehlt etwas → null (dann wie bisher). @public
 */
export function fromRadar(json: unknown, nowIso: string): RadarNow | null {
  const frames = (json as Raw)?.radar;
  if (!Array.isArray(frames) || !frames.length) return null;
  const pos = (json as Raw)?.latlon_position as Raw | undefined;
  const at = (grid: unknown): number | null => {
    if (!Array.isArray(grid) || !grid.length || !Array.isArray(grid[0])) return null;
    const y = num(pos?.y) !== null ? Math.min(grid.length - 1, Math.max(0, Math.floor(num(pos?.y)!))) : Math.floor(grid.length / 2);
    const row = grid[y] as unknown[];
    const x = num(pos?.x) !== null ? Math.min(row.length - 1, Math.max(0, Math.floor(num(pos?.x)!))) : Math.floor(row.length / 2);
    return num(row[x]);
  };
  const nowMs = Date.parse(nowIso);
  const seen = frames
    .map((f: Raw) => ({ t: typeof f?.timestamp === "string" ? Date.parse(f.timestamp) : NaN, v: at(f?.precipitation_5) }))
    .filter((f) => Number.isFinite(f.t) && f.v !== null && f.t <= nowMs + 60_000)
    .sort((a, b) => a.t - b.t);
  const current = seen[seen.length - 1];
  if (!current || nowMs - current.t > 20 * 60_000) return null;
  const wet = (v: number | null) => (v ?? 0) >= RADAR_MIN;
  return { now: wet(current.v), recent: seen.some((f) => f !== current && nowMs - f.t <= 30 * 60_000 && wet(f.v)) };
}

/** Bright Sky (/weather + optional /current_weather) → Forecast @public */
export function fromBrightSky(weather: unknown, current: unknown, place: string, nowIso: string, radar: RadarNow | null = null): Forecast | null {
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
        ...windFields(num(r.wind_speed), num(r.wind_direction)),
        mm,
        sun: Math.min(60, num(r.sunshine) ?? 0),
        cloud: cloud ?? 0,
      };
    });
  // Doppelte Stunden (Zeitumstellung) – die erste behalten
  const seen = new Set<string>();
  const unique = hours.filter((h) => !seen.has(`${h.date}:${h.hour}`) && Boolean(seen.add(`${h.date}:${h.hour}`)));
  return { place, fetchedAt: nowIso, source: "dwd", current: withRadar(currentFrom(current, unique, nowIso), unique, nowIso, radar), hours: unique, days: buildDays(unique) };
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

/**
 * „Gerade Regen“ nur, wenn das Radar am Ort JETZT Niederschlag zeigt. Hört es
 * auf: „Regen hat aufgehört“ und Sonne/Wolken laut aktueller Stunde (nie
 * ein Regen-Symbol ohne Regen). Ohne Radar bleibt alles wie bisher.
 */
function withRadar(cur: Forecast["current"], hours: ForecastHour[], nowIso: string, radar: RadarNow | null): Forecast["current"] {
  if (!radar) return cur;
  if (radar.now) return { ...cur, raining: true, code: RAIN_CODES.includes(cur.code) ? cur.code : 61 };
  const hourCode = nowFromHours(hours, nowIso).code;
  const code = RAIN_CODES.includes(cur.code) ? (RAIN_CODES.includes(hourCode) ? 3 : hourCode) : cur.code;
  return { ...cur, raining: false, code, ...(radar.recent ? { stopped: true } : {}) };
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
      ...windFields(at("wind_speed_10m", i), at("wind_direction_10m", i)),
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
