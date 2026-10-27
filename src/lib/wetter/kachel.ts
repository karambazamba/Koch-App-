// Wetter-Kachel (Tafel „ruhig mit Regentropfen“, Tafel 87) – rein und testbar:
// die ehrliche Lage jetzt, die eine Zeile („Regen · ab 10 Uhr trocken“), der
// Wind jetzt, die nächsten Stunden im 2-Stunden-Abstand und der Hintergrund
// je Wetter, Tag/Nacht und Look. Nichts bewegt sich: Muster sind still.

import { isRainy, round, weatherKind, type Forecast, type ForecastHour } from "@/lib/wetter/forecast";
import { isNight, type WeatherGroup } from "@/lib/wetter/view";
import { windLevel, windLook, windOf, type Wind } from "@/lib/wetter/wind";
import type { AppLook } from "@/lib/einstellungen/profileModel";

/** Die Stunde jetzt (bzw. die nächste vorhandene heute) */
function hourNow(fc: Forecast, today: string, nowHour: number): ForecastHour | undefined {
  return fc.hours.find((h) => h.date === today && h.hour === nowHour) ?? fc.hours.find((h) => h.date === today && h.hour > nowHour);
}

/**
 * Regnet es JETZT? Gemessen (Radar/Station) zählt immer; ohne Messung die
 * ehrliche Regel für die Stunde jetzt (≥ 0,2 mm UND ≥ 50 %). „Eben aufgehört“
 * bzw. eine Station, die keinen Regen misst, heißt trocken.
 */
export function rainingNow(fc: Forecast, today: string, nowHour: number): boolean {
  if (fc.current.raining) return true;
  if (fc.current.stopped || fc.current.measured) return false;
  const h = fc.hours.find((x) => x.date === today && x.hour === nowHour);
  return h ? isRainy(h) : false;
}

/** Lage der Kachel jetzt – ehrlich: Regen/Schnee/Gewitter nur, wenn es wirklich nass ist */
export function kachelLage(fc: Forecast, today: string, nowHour: number): WeatherGroup {
  const kind = weatherKind(fc.current.code).kind;
  if (rainingNow(fc, today, nowHour)) {
    const kinds = [kind, weatherKind(hourNow(fc, today, nowHour)?.code ?? fc.current.code).kind];
    return kinds.includes("gewitter") ? "gewitter" : kinds.includes("schnee") ? "schnee" : "regen";
  }
  if (kind === "klar" || kind === "heiter") return "sonnig";
  return "bewoelkt";
}

const WORT: Record<WeatherGroup, string> = { sonnig: "Sonnig", bewoelkt: "Bewölkt", regen: "Regen", schnee: "Schnee", gewitter: "Gewitter" };

/**
 * Die eine Zeile (ehrliche Regel, Stunden ab jetzt bis Mitternacht):
 * nass jetzt → „Regen · ab 10 Uhr trocken“ (ohne trockene Stunde nur „Regen“);
 * trocken jetzt, später Regenstunde → „Bewölkt · ab 15 Uhr Regen“; eben
 * aufgehört → „Bewölkt · Regen hat aufgehört“; sonst „Sonnig · bleibt trocken“.
 * `kurz` (S): ohne „Uhr“.
 */
export function kachelZeile(fc: Forecast, today: string, nowHour: number, kurz = false): { wort: string; rest: string | null } {
  const lage = kachelLage(fc, today, nowHour);
  const uhr = (h: number) => (kurz ? `${h}` : `${h} Uhr`);
  const ahead = fc.hours.filter((h) => h.date === today && h.hour > nowHour);
  const wort = lage === "regen" && weatherKind(fc.current.code).kind === "niesel" ? "Niesel" : WORT[lage];
  if (lage === "regen" || lage === "schnee" || lage === "gewitter") {
    const dry = ahead.find((h) => !isRainy(h));
    return { wort, rest: dry ? `ab ${uhr(dry.hour)} trocken` : null };
  }
  const wet = ahead.find(isRainy);
  if (wet) return { wort, rest: `ab ${uhr(wet.hour)} ${weatherKind(wet.code).kind === "schnee" ? "Schnee" : "Regen"}` };
  return { wort, rest: fc.current.stopped ? "Regen hat aufgehört" : "bleibt trocken" };
}

/** Wind jetzt (Stunde jetzt): Stufe, Böen – null bei älteren Daten ohne Wind */
export function kachelWind(fc: Forecast, today: string, nowHour: number): Wind | null {
  const h = hourNow(fc, today, nowHour);
  return h ? windOf([h]) : null;
}

export type ZweiStunden = { key: string; hour: number; code: number; temp: number; rain: number; night: boolean };

/** Unten in der Kachel: ab jetzt alle 2 Stunden (8 · 10 · 12 · 14), auch über Mitternacht */
export function zweiStunden(fc: Forecast, today: string, nowHour: number, count = 4): ZweiStunden[] {
  const start = fc.hours.findIndex((h) => h.date === today && h.hour >= nowHour);
  if (start < 0) return [];
  return fc.hours
    .slice(start)
    .filter((_, i) => i % 2 === 0)
    .slice(0, count)
    .map((h) => ({ key: `${h.date}-${h.hour}`, hour: h.hour, code: h.code, temp: round(h.temp), rain: h.rain, night: isNight(h.date, h.hour * 60 + 30) }));
}

/** Stilles Muster im Hintergrund (inline-SVG, keine Bilder) */
export type HimmelMuster = "sonne" | "mond" | "wolken" | "tropfen" | "punkte" | "blitz";
export type HimmelKey = `${WeatherGroup}` | `${WeatherGroup}-nacht` | "schlicht";

const MUSTER: Record<WeatherGroup, [HimmelMuster, HimmelMuster]> = {
  sonnig: ["sonne", "mond"],
  bewoelkt: ["wolken", "wolken"],
  regen: ["tropfen", "tropfen"],
  schnee: ["punkte", "punkte"],
  gewitter: ["blitz", "blitz"],
};

/** Alle Himmel-Varianten (für Tests und Stilblatt) */
export const HIMMEL_KEYS: HimmelKey[] = (["sonnig", "bewoelkt", "regen", "schnee", "gewitter"] as WeatherGroup[]).flatMap((g) => [g, `${g}-nacht`] as HimmelKey[]);

/**
 * Hintergrund der Kachel: Look „Farbig“ = Himmel je Wetter (Tokens
 * `--app-sky-<key>-a/-b/-ink/-soft/-boeen/-motiv`), nachts die dunklere
 * Variante, dazu ein stilles Muster; Look „Schlicht“ = weiß, kein Muster, nur
 * das Wetter-Symbol farbig. `ton`: ab „Stürmisch“ leicht warm, ab „Sturm“
 * rötlich (beide Looks).
 */
export function kachelHimmel(lage: WeatherGroup, nacht: boolean, look: AppLook, wind: Wind | null = null): { key: HimmelKey; muster: HimmelMuster | null; symbol: boolean; ton: "warm" | "sturm" | null } {
  const ton = wind ? windLook(windLevel(wind.speed)).ton : null;
  if (look === "schlicht") return { key: "schlicht", muster: null, symbol: true, ton };
  return { key: nacht ? `${lage}-nacht` : lage, muster: MUSTER[lage][nacht ? 1 : 0], symbol: false, ton };
}
