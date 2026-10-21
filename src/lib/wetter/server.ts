// Wetter abrufen (nur auf dem Server): Ort → Koordinaten (Open-Meteo
// Geocoding), Vorhersage von Open-Meteo (nutzt u. a. die DWD-Modelle,
// kostenlos, ohne Schlüssel). 30 Minuten zwischengespeichert. Standort →
// Stadtname über OpenStreetMap (Nominatim). `WETTER_MOCK=1` = Testmodus mit
// festen Werten (ohne Netz).

import { berlinTime, now } from "../core/now";
import type { Forecast } from "./forecast";

const TTL = 30 * 60 * 1000;
const cache = new Map<string, { at: number; data: Forecast }>();

export const weatherMock = () => process.env.WETTER_MOCK === "1";

type Scenario = "regen" | "frost" | "heiss" | "klar" | "sturm" | "schnee" | "gewitter" | "wolkig";
const SCENARIOS: Scenario[] = ["regen", "frost", "heiss", "klar", "sturm", "schnee", "gewitter", "wolkig"];

/** Testmodus: feste Wetterlage rund um heute */
function mockForecast(place: string, scenario: Scenario = "regen", day?: string): Forecast {
  const today = day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : berlinTime().iso;
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const base = scenario === "heiss" ? 22 : scenario === "frost" || scenario === "schnee" ? -3 : 9;
  // Wetter je Stunde des Tages 0 (die übrigen Tage ruhiger)
  const codeFor = (di: number, hour: number) => {
    if (scenario === "regen") return di === 0 && hour >= 15 && hour <= 18 ? 61 : 3;
    if (scenario === "schnee") return di === 0 && hour >= 8 ? 73 : 3;
    if (scenario === "gewitter") return di === 0 && hour >= 14 && hour <= 19 ? 95 : 2;
    if (scenario === "klar" || scenario === "heiss") return 0;
    return 3;
  };
  const hours = days.flatMap((date, di) =>
    Array.from({ length: 24 }, (_, hour) => {
      const temp = base + (hour >= 6 && hour <= 15 ? (hour - 6) * (scenario === "heiss" ? 1.1 : 0.7) : hour > 15 ? (24 - hour) * 0.5 : 0) + di;
      const code = di === 0 ? codeFor(0, hour) : [61, 3, 1, 0, 80, 3, 2][di];
      const rainy = [61, 80, 95].includes(code);
      return { date, hour, temp: Math.round(temp * 10) / 10, code, rain: rainy ? 80 : 10, gust: scenario === "sturm" ? 85 : 20 };
    }),
  );
  return {
    place,
    fetchedAt: now().toISOString(),
    current: { temp: hours.find((h) => h.date === today && h.hour === 12)?.temp ?? base, code: codeFor(0, 12) },
    hours,
    days: days.map((date, i) => ({ date, code: i === 0 ? (scenario === "regen" ? 61 : scenario === "schnee" ? 73 : scenario === "gewitter" ? 95 : codeFor(0, 12)) : [61, 3, 1, 0, 80, 3, 2][i], max: base + 6 + (i % 3), min: base - 2 + (i % 2), rain: i === 0 && scenario === "regen" ? 80 : [10, 40, 5, 0, 70, 20, 10][i] })),
  };
}

export async function geocode(place: string): Promise<{ name: string; lat: number; lon: number } | null> {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1&language=de&countryCode=DE`, { cache: "no-store" });
  if (!res.ok) return null;
  const hit = (await res.json())?.results?.[0];
  return hit ? { name: String(hit.name), lat: Number(hit.latitude), lon: Number(hit.longitude) } : null;
}

/** Vorhersage für einen Ort (Name); null = nicht gefunden oder Dienst nicht erreichbar */
export async function fetchForecast(place: string, scenario?: string, day?: string): Promise<Forecast | null> {
  const key = place.trim().toLowerCase();
  if (weatherMock()) return mockForecast(place.trim() || "Eutin", (SCENARIOS.includes(scenario as Scenario) ? scenario : "regen") as Scenario, day);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.data;
  const geo = await geocode(place);
  if (!geo) return null;
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    current: "temperature_2m,weather_code",
    hourly: "temperature_2m,weather_code,precipitation_probability,wind_gusts_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "Europe/Berlin",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store" });
  if (!res.ok) return null;
  const j = await res.json();
  const h = j.hourly ?? {};
  const d = j.daily ?? {};
  const data: Forecast = {
    place: geo.name,
    fetchedAt: new Date().toISOString(),
    current: { temp: Number(j.current?.temperature_2m ?? 0), code: Number(j.current?.weather_code ?? 3) },
    hours: (h.time ?? []).map((t: string, i: number) => ({
      date: t.slice(0, 10),
      hour: Number(t.slice(11, 13)),
      temp: Number(h.temperature_2m?.[i] ?? 0),
      code: Number(h.weather_code?.[i] ?? 3),
      rain: Number(h.precipitation_probability?.[i] ?? 0),
      gust: Number(h.wind_gusts_10m?.[i] ?? 0),
    })),
    days: (d.time ?? []).map((t: string, i: number) => ({
      date: t,
      code: Number(d.weather_code?.[i] ?? 3),
      max: Number(d.temperature_2m_max?.[i] ?? 0),
      min: Number(d.temperature_2m_min?.[i] ?? 0),
      rain: Number(d.precipitation_probability_max?.[i] ?? 0),
    })),
  };
  cache.set(key, { at: Date.now(), data });
  return data;
}

/** Standort → Stadtname (nur die Stadt wird gespeichert) */
export async function placeFromCoords(lat: number, lon: number): Promise<string | null> {
  if (weatherMock()) return "Eutin";
  const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=de&lat=${lat}&lon=${lon}`, {
    headers: { "User-Agent": "WasGibts-Familienapp/1.0" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const a = (await res.json())?.address ?? {};
  return a.city || a.town || a.village || a.municipality || null;
}
