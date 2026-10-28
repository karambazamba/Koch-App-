// Wofür die Wundertüte gerade aussucht (rein): Tag, Uhrzeit, Haushalt,
// Wetter von heute (Regen inkl. Niesel, Schauer, Gewitter), Gericht des Tages
// und Feiertag. „Schietwedder“ & Co. kommen nur an echten Regentagen.

import type { Haushalt } from "@/lib/core/haushalt";
import { feiertage } from "@/lib/core/feiertage";
import { weatherKind, type Forecast } from "@/lib/wetter/forecast";
import type { Lage } from "@/lib/wundertuete/auswahl";

/** Wetter heute für den Anlass: Regen, Schnee, Sonne oder nichts Besonderes */
export function wetterHeute(forecast: Forecast | null | undefined, heute: string): Lage["wetter"] {
  if (!forecast) return null;
  if (forecast.current.raining) return "regen";
  const day = forecast.days.find((d) => d.date === heute);
  if (!day) return null;
  const kind = weatherKind(day.code).kind;
  if (kind === "regen" || kind === "niesel" || kind === "schauer" || kind === "gewitter") return "regen";
  if (kind === "schnee") return "schnee";
  if (kind === "klar" || kind === "heiter") return "sonne";
  return null;
}

export function lageAus(o: { heute: string; minuten: number; haushalt: Haushalt; forecast?: Forecast | null; gericht?: string | null }): Lage {
  return {
    heute: o.heute,
    minuten: o.minuten,
    haushalt: o.haushalt,
    wetter: wetterHeute(o.forecast, o.heute),
    gericht: o.gericht ?? null,
    feiertag: feiertage(Number(o.heute.slice(0, 4)))[o.heute] ?? null,
  };
}
