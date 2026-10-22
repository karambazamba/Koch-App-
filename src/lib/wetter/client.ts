"use client";

// Wetter in der App: Ort (`wasgibts.wetterort` v1, Standard Eutin) und die
// letzte Vorhersage (`wasgibts.wetterdaten` v1) – offline zeigt die Kachel die
// letzten Werte mit "Stand 8:10". Abruf über die eigene Route /api/wetter,
// höchstens alle 30 Minuten.

import { useEffect, useState } from "react";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { now, todayIso } from "@/lib/core/now";
import { sanitizeForecast, type Forecast } from "@/lib/wetter/forecast";
import type { StorageKey } from "@/lib/core/storage";

const DEFAULT_PLACE = "Eutin";
const FRESH_MS = 30 * 60 * 1000;

type PlaceStore = { version: 1; city: string };
const placeStore = createLocalStore("wasgibts.wetterort", (raw: unknown): PlaceStore | null => {
  if (!raw || typeof raw !== "object" || (raw as PlaceStore).version !== 1) return null;
  const city = String((raw as PlaceStore).city ?? "").trim().slice(0, 60);
  return { version: 1, city: city || DEFAULT_PLACE };
});

export const loadPlace = () => placeStore.load()?.city ?? DEFAULT_PLACE;
export const savePlace = (city: string) => placeStore.save({ version: 1, city: city.trim().slice(0, 60) || DEFAULT_PLACE });

export function usePlace(): string {
  const data = useExternalStore(placeStore.subscribe, placeStore.load, () => null);
  return data?.city ?? DEFAULT_PLACE;
}

type DataStore = { version: 1; forecast: Forecast };
const dataStore = createLocalStore("wasgibts.wetterdaten", (raw: unknown): DataStore | null => {
  if (!raw || typeof raw !== "object" || (raw as DataStore).version !== 1) return null;
  const forecast = sanitizeForecast((raw as DataStore).forecast);
  return forecast ? { version: 1, forecast } : null;
});

export const loadForecast = () => dataStore.load()?.forecast ?? null;

/** Testmodus: `?szenario=` wird an die Route durchgereicht (nur dort wirksam) */
const scenario = () => {
  try {
    return sessionStorage.getItem("wasgibts.wetterszenario" satisfies StorageKey) ?? "";
  } catch {
    return "";
  }
};

let inflight: Promise<Forecast | null> | null = null;

/** Vorhersage holen (mit Zwischenspeicher); null = offline/unbekannt – dann bleibt die letzte */
export async function refreshForecast(place: string, force = false): Promise<Forecast | null> {
  const last = loadForecast();
  if (!force && last && last.place.toLowerCase() === place.toLowerCase() && now().getTime() - new Date(last.fetchedAt).getTime() < FRESH_MS) return last;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const sz = scenario();
      const res = await fetch(`/api/wetter?ort=${encodeURIComponent(place)}&heute=${todayIso()}${sz ? `&szenario=${encodeURIComponent(sz)}` : ""}`);
      if (!res.ok) return null;
      const fc = sanitizeForecast(await res.json());
      if (fc) dataStore.save({ version: 1, forecast: { ...fc, place: place.trim() || fc.place, fetchedAt: now().toISOString() } });
      return fc;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Ort aus dem Standort (nur der Stadtname wird gespeichert) */
export async function placeFromLocation(): Promise<string | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  const pos = await new Promise<GeolocationPosition | null>((resolve) => navigator.geolocation.getCurrentPosition(resolve, () => resolve(null), { timeout: 10000, maximumAge: 600000 }));
  if (!pos) return null;
  try {
    const res = await fetch(`/api/wetter?lat=${pos.coords.latitude.toFixed(2)}&lon=${pos.coords.longitude.toFixed(2)}`);
    if (!res.ok) return null;
    return ((await res.json()) as { ort?: string }).ort ?? null;
  } catch {
    return null;
  }
}

/**
 * Vorhersage für den eingestellten Ort: `forecast` (auch die letzte, falls
 * offline), `stale` = nicht frisch (für "Stand 8:10"), `failed` = noch nie
 * geladen und gerade nicht erreichbar.
 */
export function useForecast(): { forecast: Forecast | null; stale: boolean; failed: boolean; place: string } {
  const place = usePlace();
  const stored = useExternalStore(dataStore.subscribe, dataStore.load, () => null);
  const [failed, setFailed] = useState(false);
  const forecast = stored?.forecast && stored.forecast.place.toLowerCase() === place.toLowerCase() ? stored.forecast : null;
  useEffect(() => {
    let alive = true;
    refreshForecast(place).then((fc) => alive && setFailed(!fc));
    const timer = setInterval(() => refreshForecast(place), FRESH_MS);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [place]);
  const stale = Boolean(forecast && (failed || now().getTime() - new Date(forecast.fetchedAt).getTime() > FRESH_MS + 60_000));
  return { forecast, stale, failed: failed && !forecast, place };
}
