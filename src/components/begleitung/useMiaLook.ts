"use client";

// Wie Mia gerade aussieht (Zubehör, Schlaf) – aus Uhrzeit, Wetter (nur aus
// dem Zwischenspeicher, nie ein eigener Abruf), laufendem Timer und
// Geburtstagen heute. Rechnet jede halbe Minute neu; die Regeln stehen in
// `src/lib/mia/zubehoer.ts`. Dazu die kurzen Momente am Knopf (Sturm wackelt,
// Herbstblatt, Sonnenstrahlen drehen sich einmal) – nur bei sichtbarer Seite, nie als Dauerschleife.

import { useEffect, useState } from "react";
import { berlinTime, now, useMinutes } from "@/lib/core/now";
import { setAvatarSleeping } from "@/lib/core/avatarState";
import { loadForecast } from "@/lib/wetter/client";
import { loadTimers } from "@/lib/timer/store";
import { isRunning } from "@/lib/timer/model";
import { loadEntries } from "@/lib/kalender/store";
import { itemsForDay } from "@/lib/kalender/model";
import { miaLook, miaMoment, miaWetter, type MiaLage, type MiaLook, type MiaMoment } from "@/lib/mia/zubehoer";

const QUIET: MiaLook = { zubehoer: null, schlaeft: false, verschlafen: false, ruhig: false };

function currentLage(): MiaLage {
  const t = berlinTime();
  const forecast = loadForecast();
  return {
    date: t.iso,
    minutes: t.minutes,
    wetter: forecast ? miaWetter(forecast.hours, t.iso, t.minutes) : null,
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

const last: Partial<Record<MiaMoment, number>> = {};
const MOMENT_MS: Record<MiaMoment, number> = { wackeln: 1400, blatt: 2400, sonne: 8000 };

/** Kurzer Moment beim Öffnen bzw. Zurückkommen (sichtbare Seite), danach wieder still */
export function useMiaMoment(): MiaMoment | null {
  const [moment, setMoment] = useState<MiaMoment | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      // Automatisierte Tests (Bildvergleich): keine zufälligen Momente
      if (document.visibilityState !== "visible" || navigator.webdriver) return;
      const nowMs = now().getTime();
      const m = miaMoment(currentLage(), last, nowMs);
      if (!m) return;
      last[m] = nowMs;
      setMoment(m);
      clearTimeout(timer);
      timer = setTimeout(() => setMoment(null), MOMENT_MS[m]);
    };
    const first = setTimeout(check, 1200);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(first);
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return moment;
}
