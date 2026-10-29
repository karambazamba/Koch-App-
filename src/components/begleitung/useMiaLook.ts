"use client";

// Wie Mia gerade aussieht (Zubehör, Schlaf) – aus Uhrzeit, Wetter (nur aus
// dem Zwischenspeicher, nie ein eigener Abruf), laufendem Timer und
// Geburtstagen heute. Rechnet jede halbe Minute neu; die Regeln stehen in
// `src/lib/mia/zubehoer.ts`. Dazu die kurzen Momente (Sturm wackelt,
// Herbstblätter bei Wind, Sonnenstrahlen drehen sich einmal) – nur bei
// sichtbarer Seite, nie als Dauerschleife; beim Antippen des Knopfs die
// Blätter auf der Bühne (A-058). Abstände je Gerät in `zubehoerSpeicher.ts`.

import { useEffect, useSyncExternalStore } from "react";
import { berlinTime, now, useMinutes } from "@/lib/core/now";
import { setAvatarSleeping } from "@/lib/core/avatarState";
import { loadForecast } from "@/lib/wetter/client";
import { loadTimers } from "@/lib/timer/store";
import { isRunning } from "@/lib/timer/model";
import { loadEntries } from "@/lib/kalender/store";
import { itemsForDay } from "@/lib/kalender/model";
import { reducedMotion } from "@/lib/core/hello";
import { miaLook, miaWetter, type MiaLage, type MiaLook, type MiaMoment, type MomentAnlass } from "@/lib/mia/zubehoer";
import { momentJetzt, tagSonnig } from "@/lib/mia/zubehoerSpeicher";

const QUIET: MiaLook = { zubehoer: null, schlaeft: false, verschlafen: false, ruhig: false };

function currentLage(): MiaLage {
  const t = berlinTime();
  const forecast = loadForecast();
  return {
    date: t.iso,
    minutes: t.minutes,
    wetter: forecast ? miaWetter(forecast.hours, t.iso, t.minutes, tagSonnig(forecast.hours)) : null,
    geburtstag: itemsForDay(loadEntries(), t.iso, t.iso).some((i) => /geburtstag/i.test(i.title)),
    kochen: loadTimers().timers.some((x) => isRunning(x, now().getTime())),
  };
}

export function useMiaLook(): MiaLook {
  const minutes = useMinutes();
  const look = minutes === undefined ? QUIET : miaLook(currentLage());
  const sleep = look.schlaeft;
  useEffect(() => {
    setAvatarSleeping(sleep);
  }, [sleep]);
  return look;
}

const MOMENT_MS: Record<MiaMoment, number> = { wackeln: 1400, blaetter: 2800, sturm: 2800, sonne: 8000 };

// Ein gemeinsamer Moment für Knopf und Bühne
let aktuell: MiaMoment | null = null;
let ende: ReturnType<typeof setTimeout> | undefined;
const hoerer = new Set<() => void>();
const melden = () => hoerer.forEach((h) => h());
const abonnieren = (h: () => void) => (hoerer.add(h), () => void hoerer.delete(h));

/** Moment prüfen und ggf. starten (öffnen/zurückkommen oder Mia angetippt) */
export function miaMomentPruefen(anlass: MomentAnlass) {
  // Automatisierte Tests (Bildvergleich): keine zufälligen Momente
  if (typeof document === "undefined" || document.visibilityState !== "visible" || navigator.webdriver) return;
  const m = momentJetzt(currentLage(), anlass, reducedMotion());
  if (!m) return;
  aktuell = m;
  melden();
  clearTimeout(ende);
  ende = setTimeout(() => ((aktuell = null), melden()), MOMENT_MS[m]);
}

/** Kurzer Moment (Knopf prüft beim Öffnen bzw. Zurückkommen), danach wieder still */
export function useMiaMoment(pruefen = false): MiaMoment | null {
  useEffect(() => {
    if (!pruefen) return;
    const check = () => miaMomentPruefen("oeffnen");
    const first = setTimeout(check, 1200);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(first);
      document.removeEventListener("visibilitychange", check);
    };
  }, [pruefen]);
  return useSyncExternalStore(abonnieren, () => aktuell, () => null);
}
