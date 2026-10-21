// Wetter abrufen (nur auf dem Server): Ort → Koordinaten (Open-Meteo
// Geocoding), Vorhersage vom Deutschen Wetterdienst (MOSMIX über Bright Sky,
// kostenlos, ohne Schlüssel) mit der Messung der nächsten Station; antwortet
// Bright Sky nicht, Open-Meteo mit dem DWD-Modell ICON – gleiches Format.
// 30 Minuten zwischengespeichert. Standort → Stadtname über OpenStreetMap
// (Nominatim). `WETTER_MOCK=1` = Testmodus mit festen Werten (ohne Netz).

import { berlinTime, now } from "../core/now";
import { buildDays, type Forecast } from "./forecast";
import { fromBrightSky, fromOpenMeteo } from "./sources";

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
      // Folgetage: Mo Regen (viele Stunden), Di wolkig, Mi Sonne und Wolken, Do sonnig, Fr ein Schauer, …
      const later = [3, 61, 3, 2, 0, hour === 14 ? 80 : 2, 3, 2][di] ?? 3;
      const code = di === 0 ? codeFor(0, hour) : di === 1 && (hour < 9 || hour > 14) ? 3 : later;
      const rainy = [61, 73, 80, 95].includes(code);
      const sunny = code === 0 ? 50 : code === 1 || code === 2 ? (hour >= 10 && hour <= 13 ? 40 : 10) : 0;
      return { date, hour, temp: Math.round(temp * 10) / 10, code, rain: rainy ? 80 : 10, gust: scenario === "sturm" ? 85 : 20, mm: rainy ? 1.2 : 0, sun: hour >= 7 && hour <= 18 ? sunny : 0, cloud: code === 0 ? 10 : code <= 2 ? 50 : 90 };
    }),
  );
  return {
    place,
    fetchedAt: now().toISOString(),
    source: "mock",
    current: { temp: hours.find((h) => h.date === today && h.hour === 12)?.temp ?? base, code: codeFor(0, 12), measured: false, raining: false },
    hours,
    days: buildDays(hours),
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
  const data = (await fromDwd(geo).catch(() => null)) ?? (await fromIcon(geo).catch(() => null));
  if (!data) return null;
  cache.set(key, { at: Date.now(), data });
  return data;
}

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** DWD MOSMIX über Bright Sky: 7 Tage Stunden + Messung der nächsten Station */
async function fromDwd(geo: { name: string; lat: number; lon: number }): Promise<Forecast | null> {
  const today = berlinTime().iso;
  const at = `lat=${geo.lat}&lon=${geo.lon}&tz=Europe%2FBerlin`;
  const [weather, current] = await Promise.all([
    fetch(`https://api.brightsky.dev/weather?${at}&date=${today}&last_date=${plusDays(today, 7)}`, { cache: "no-store", signal: AbortSignal.timeout(8000) }),
    fetch(`https://api.brightsky.dev/current_weather?${at}`, { cache: "no-store", signal: AbortSignal.timeout(8000) }).catch(() => null),
  ]);
  if (!weather.ok) return null;
  const currentJson = current?.ok ? await current.json().catch(() => null) : null;
  return fromBrightSky(await weather.json(), currentJson, geo.name, now().toISOString());
}

/** Ausweichen: Open-Meteo mit dem DWD-Modell ICON (gleiche Felder) */
async function fromIcon(geo: { name: string; lat: number; lon: number }): Promise<Forecast | null> {
  const params = new URLSearchParams({
    latitude: String(geo.lat),
    longitude: String(geo.lon),
    models: "icon_seamless",
    current: "temperature_2m,weather_code",
    hourly: "temperature_2m,weather_code,precipitation,precipitation_probability,sunshine_duration,cloud_cover,wind_gusts_10m",
    timezone: "Europe/Berlin",
    forecast_days: "7",
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) return null;
  return fromOpenMeteo(await res.json(), geo.name, now().toISOString());
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
