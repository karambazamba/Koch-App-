// Mia lebt – ohne Ansprüche (Tafel 81/82, Punkt 8): EIN Zubehör, das je nach
// Datum, Uhrzeit, Wetter und Familie passt, dazu ob sie schläft, verschlafen
// ist oder ruhiger atmet. Reine Funktion mit `now` als Parameter – nie
// Bedürfnisse, nie traurig, nie „vermisst“.
// Rangfolge: Familien-Geburtstag > Anlass > Kochen > Wetter > Jahreszeit > Tageszeit.
// Zubehör darf den ganzen Tag bleiben; Bewegung (Blatt, Wackeln) ist nur ein
// kurzer Moment (`miaMoment`).

import { isNight } from "@/lib/wetter/view";

export type Zubehoer = "partyhut" | "kuerbis" | "weihnachtsmuetze" | "konfetti" | "osterei" | "kochmuetze" | "schirm" | "sonnenbrille" | "sonne" | "schal";

export type MiaWetter = {
  /** Regen JETZT oder in der nächsten Stunde */
  regenBald: boolean;
  /** Jetzt sonnig */
  sonnig: boolean;
  /** Temperatur jetzt (°C) */
  grad: number | null;
  /** Böen in der aktuellen Stunde (km/h) */
  boeen: number | null;
};

export type MiaLage = {
  /** Datum und Uhrzeit in Berlin */
  date: string;
  minutes: number;
  wetter: MiaWetter | null;
  /** Heute hat jemand aus der Familie Geburtstag */
  geburtstag: boolean;
  /** Kochmodus oder Küchen-Timer läuft */
  kochen: boolean;
};

export type MiaLook = { zubehoer: Zubehoer | null; schlaeft: boolean; verschlafen: boolean; ruhig: boolean };

/** Ostersonntag (Gauß/Anonymer gregorianischer Algorithmus) */
export function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

const dayShift = (iso: string, days: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

/** Silvester-Fenster: 31.12. 23:55 bis 1.1. 1:00 – dann ist Mia wach */
export const isNewYear = (date: string, minutes: number) => (date.endsWith("-12-31") && minutes >= 23 * 60 + 55) || (date.endsWith("-01-01") && minutes < 60);

/** Anlass des Tages (ohne Geburtstag) */
function anlass(date: string, minutes: number): Zubehoer | null {
  const md = date.slice(5);
  if (isNewYear(date, minutes)) return "konfetti";
  if (md === "10-31") return "kuerbis";
  if (md >= "12-01" && md <= "12-24") return "weihnachtsmuetze";
  const easter = easterSunday(Number(date.slice(0, 4)));
  if (date >= dayShift(easter, -2) && date <= dayShift(easter, 1)) return "osterei";
  return null;
}

/**
 * Wetter (A-033): Regen bald → Schirm (Vorrang). Sonnig nur tagsüber
 * (Sonnenauf- bis -untergang, `sunTimes`): ab 18 °C Sonnenbrille, sonst die
 * kleine Sonne – ganzjährig. Nachts nie Sonne oder Sonnenbrille.
 */
function wetter(w: MiaWetter | null, date: string, minutes: number): Zubehoer | null {
  if (!w) return null;
  if (w.regenBald) return "schirm";
  if (!w.sonnig || isNight(date, minutes)) return null;
  return w.grad !== null && w.grad >= 18 ? "sonnenbrille" : "sonne";
}

/** Wie Mia gerade aussieht */
export function miaLook(l: MiaLage): MiaLook {
  const month = Number(l.date.slice(5, 7));
  const night = (l.minutes >= 22 * 60 || l.minutes < 6 * 60) && !isNewYear(l.date, l.minutes);
  const zubehoer = (l.geburtstag ? "partyhut" : null) ?? anlass(l.date, l.minutes) ?? (l.kochen ? "kochmuetze" : null) ?? wetter(l.wetter, l.date, l.minutes) ?? (month === 12 || month <= 2 ? "schal" : null);
  return {
    zubehoer,
    schlaeft: night,
    verschlafen: !night && l.minutes >= 6 * 60 && l.minutes < 8 * 60,
    ruhig: !night && l.minutes >= 19 * 60,
  };
}

export type MiaMoment = "blatt" | "wackeln" | "sonne";

/** Kurze Momente: Sturm (Böen ≥ 60 km/h jetzt) wackelt höchstens alle 30 Min, Sonnenstrahlen drehen sich einmal (höchstens 1×/h, nur wenn Mia die Sonne trägt), Herbstblatt höchstens 1×/h */
export function miaMoment(l: MiaLage, last: Partial<Record<MiaMoment, number>>, nowMs: number): MiaMoment | null {
  const month = Number(l.date.slice(5, 7));
  if ((l.wetter?.boeen ?? 0) >= 60 && nowMs - (last.wackeln ?? -Infinity) >= 30 * 60_000) return "wackeln";
  if (miaLook(l).zubehoer === "sonne" && nowMs - (last.sonne ?? -Infinity) >= 60 * 60_000) return "sonne";
  if (month >= 9 && month <= 11 && nowMs - (last.blatt ?? -Infinity) >= 60 * 60_000) return "blatt";
  return null;
}

type Stunde = { date: string; hour: number; temp: number; code: number; mm: number; rain: number; gust: number };

/** Wetter für Mia aus den Stunden der Vorhersage (jetzt und die nächste Stunde) */
export function miaWetter(hours: Stunde[], date: string, minutes: number): MiaWetter | null {
  const h = Math.floor(minutes / 60);
  const now = hours.find((x) => x.date === date && x.hour === h);
  if (!now) return null;
  const next = hours.find((x) => x.date === date && x.hour === h + 1);
  const wet = (x: Stunde | undefined) => Boolean(x && x.mm >= 0.2 && x.rain >= 50);
  return { regenBald: wet(now) || wet(next), sonnig: now.code <= 1, grad: now.temp, boeen: now.gust };
}
