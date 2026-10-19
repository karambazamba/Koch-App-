"use client";

// Grill-Idee: Freitags fragt die App (nur mit Zustimmung, Ort grob per PLZ)
// die kostenlose Wettervorhersage von Open-Meteo für Samstag und Sonntag ab.
// Ohne Zustimmung oder ohne Netz passiert einfach nichts.

import { useEffect, useMemo, useState } from "react";
import type { WeatherSettings } from "../einstellungen/profile";

export type WeekendForecast = { good: boolean; maxTemp: number };

const CACHE = "wasgibts.wetter";

/** Gutes Grillwetter: an einem der Tage mind. 20 °C und höchstens 30 % Regenrisiko */
export function isGrillWeather(days: { maxTemp: number; rain: number }[]): boolean {
  return days.some((d) => d.maxTemp >= 20 && d.rain <= 30);
}

async function fetchForecast(postcode: string, saturday: string, sunday: string): Promise<WeekendForecast | null> {
  const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(postcode)}&count=1&language=de&countryCode=DE`);
  if (!geo.ok) return null;
  const place = (await geo.json())?.results?.[0];
  if (!place) return null;
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&daily=temperature_2m_max,precipitation_probability_max&timezone=Europe%2FBerlin&start_date=${saturday}&end_date=${sunday}`,
  );
  if (!res.ok) return null;
  const daily = (await res.json())?.daily;
  if (!daily?.temperature_2m_max) return null;
  const days = (daily.temperature_2m_max as number[]).map((t, i) => ({ maxTemp: t, rain: (daily.precipitation_probability_max?.[i] as number) ?? 0 }));
  return { good: isGrillWeather(days), maxTemp: Math.round(Math.max(...days.map((d) => d.maxTemp))) };
}

function readCache(key: string): { key: string; value: WeekendForecast | null } | null {
  if (!key || typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(CACHE) ?? "null");
    return cached?.key === key ? cached : null;
  } catch {
    return null;
  }
}

/** Vorhersage fürs Wochenende – nur freitags und nur mit Zustimmung (sonst null) */
export function useWeekendForecast(weather: WeatherSettings | undefined, friday: string | null, saturday: string, sunday: string): WeekendForecast | null {
  const [result, setResult] = useState<{ key: string; value: WeekendForecast | null } | null>(null);
  const key = weather?.consent && weather.postcode.length === 5 && friday ? `${weather.postcode}|${friday}` : "";
  const cached = useMemo(() => readCache(key), [key]);
  useEffect(() => {
    if (!key || cached) return;
    let active = true;
    fetchForecast(key.split("|")[0], saturday, sunday)
      .then((value) => {
        if (!active) return;
        const entry = { key, value };
        setResult(entry);
        try {
          sessionStorage.setItem(CACHE, JSON.stringify(entry));
        } catch {
          // egal
        }
      })
      .catch(() => active && setResult({ key, value: null }));
    return () => {
      active = false;
    };
  }, [key, cached, saturday, sunday]);
  if (cached) return cached.value;
  return result && result.key === key ? result.value : null;
}
