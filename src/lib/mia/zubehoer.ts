// Mia lebt – ohne Ansprüche (Tafel 81/82, Punkt 8): EIN Zubehör, das je nach
// Datum, Uhrzeit, Wetter und Familie passt, dazu ob sie schläft, verschlafen
// ist oder ruhiger atmet. Reine Funktion mit `now` als Parameter – nie
// Bedürfnisse, nie traurig, nie „vermisst“.
// Rangfolge: Familien-Geburtstag > Anlass > Kochen > Wetter > Jahreszeit > Tageszeit.
// Zubehör darf den ganzen Tag bleiben; Bewegung (Herbstblätter bei Wind,
// Wackeln, Sonnenstrahlen) ist nur ein kurzer Moment (`miaMoment`).
// A-058: „Sonnig“ ist eine Tagesentscheidung (`sonnigerTag`), gemerkt pro Tag
// in `zubehoerSpeicher.ts` – kein Hin- und Herspringen je Stunde.

import { isNight, sunTimes } from "@/lib/wetter/view";

export type Zubehoer = "partyhut" | "kuerbis" | "weihnachtsmuetze" | "konfetti" | "osterei" | "kochmuetze" | "schirm" | "sonnenbrille" | "sonne" | "schal";

export type MiaWetter = {
  /** Regen JETZT oder in der nächsten Stunde */
  regenBald: boolean;
  /** Heute ein sonniger Tag (Tagesentscheidung, A-058) */
  sonnig: boolean;
  /** Temperatur jetzt (°C) */
  grad: number | null;
  /** Böen in der aktuellen Stunde (km/h) */
  boeen: number | null;
  /** Mittlerer Wind in der aktuellen Stunde (km/h); fehlt in älteren Daten */
  wind?: number | null;
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
 * Wetter (A-033, A-058): Regen bald → Schirm (Vorrang, danach wieder Sonne).
 * Sonniger Tag → den ganzen hellen Tag (Sonnenauf- bis -untergang, `sunTimes`)
 * ab 18 °C Sonnenbrille, sonst die kleine Sonne – ganzjährig. Nachts nie.
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

export type MiaMoment = "blaetter" | "sturm" | "wackeln" | "sonne";
/** Wann welcher Moment zuletzt lief (ms) – je Gerät gemerkt */
export type MiaZuletzt = Partial<Record<"blaetter" | "wackeln" | "sonne", number>>;
/** oeffnen = App geöffnet bzw. zurückgekommen, antippen = Mia-Knopf angetippt */
export type MomentAnlass = "oeffnen" | "antippen";

const MIN = 60_000;
/** Herbstblätter: ab Wind 25 km/h oder Böen 35 km/h (aktuelle Stunde) */
const BLAETTER_WIND = 25;
const BLAETTER_BOEEN = 35;
/** Sturm: Böen ab 60 km/h */
const STURM_BOEEN = 60;

/**
 * Kurze Momente (A-058):
 * - Herbstblätter: Sep–Nov bei Wind ≥ 25 km/h oder Böen ≥ 35 km/h wehen 6–8
 *   Blätter an Mia vorbei, sie kneift die Augen. Beim Öffnen höchstens alle
 *   30 Min, beim Antippen höchstens alle 5 Min. Nicht nachts (Mia schläft),
 *   nicht bei reduzierter Bewegung.
 * - Sturm (Böen ≥ 60 km/h): wackeln, höchstens alle 30 Min – im Herbst mit
 *   den Blättern zusammen („sturm“).
 * - Sonne: die Strahlen drehen sich einmal, höchstens 1×/h, nur mit Sonne.
 * Antippen löst nur die Blätter aus (Wackeln und Sonne bleiben beim Öffnen).
 */
export function miaMoment(l: MiaLage, last: MiaZuletzt, nowMs: number, opt: { anlass?: MomentAnlass; ruhig?: boolean } = {}): MiaMoment | null {
  const month = Number(l.date.slice(5, 7));
  const look = miaLook(l);
  const boeen = l.wetter?.boeen ?? 0;
  const sturm = boeen >= STURM_BOEEN;
  const windig = (l.wetter?.wind ?? 0) >= BLAETTER_WIND || boeen >= BLAETTER_BOEEN;
  const abstand = opt.anlass === "antippen" ? 5 * MIN : 30 * MIN;
  const blaetter = month >= 9 && month <= 11 && windig && !opt.ruhig && !look.schlaeft && nowMs - (last.blaetter ?? -Infinity) >= abstand;
  if (blaetter) return sturm ? "sturm" : "blaetter";
  if (opt.anlass === "antippen") return null;
  if (sturm && nowMs - (last.wackeln ?? -Infinity) >= 30 * MIN) return "wackeln";
  if (look.zubehoer === "sonne" && nowMs - (last.sonne ?? -Infinity) >= 60 * MIN) return "sonne";
  return null;
}

/** Nach einem Moment: Zeit merken (Sturm zählt für Wackeln und Blätter) */
export function momentGemerkt(last: MiaZuletzt, m: MiaMoment, nowMs: number): MiaZuletzt {
  if (m === "sturm") return { ...last, wackeln: nowMs, blaetter: nowMs };
  return { ...last, [m]: nowMs };
}

type Stunde = { date: string; hour: number; temp: number; code: number; mm: number; rain: number; gust: number; sun?: number; wind?: number };

/** Sonnige Stunde (A-058): Wettercode ≤ 2 (klar, fast klar, teils bewölkt) oder mindestens 30 Sonnenminuten */
export const sonnigeStunde = (h: Stunde) => h.code <= 2 || (h.sun ?? 0) >= 30;

/**
 * Tagesentscheidung (A-058): Ist mindestens die Hälfte der hellen Stunden
 * (Mitte der Stunde zwischen Sonnenauf- und -untergang) sonnig – vergangene
 * laut Daten, der Rest laut Vorhersage –, ist heute ein sonniger Tag.
 * null = zu wenig Stunden, um zu entscheiden.
 */
export function sonnigerTag(hours: Stunde[], date: string): boolean | null {
  const { rise, set } = sunTimes(date);
  const hell = hours.filter((x) => x.date === date && x.hour * 60 + 30 >= rise && x.hour * 60 + 30 < set);
  if (hell.length < 3) return null;
  return hell.filter(sonnigeStunde).length * 2 >= hell.length;
}

/** Wetter für Mia aus den Stunden der Vorhersage (jetzt und die nächste Stunde); `tagSonnig` = gemerkte Tagesentscheidung */
export function miaWetter(hours: Stunde[], date: string, minutes: number, tagSonnig?: boolean | null): MiaWetter | null {
  const h = Math.floor(minutes / 60);
  const now = hours.find((x) => x.date === date && x.hour === h);
  if (!now) return null;
  const next = hours.find((x) => x.date === date && x.hour === h + 1);
  const wet = (x: Stunde | undefined) => Boolean(x && x.mm >= 0.2 && x.rain >= 50);
  const sonnig = tagSonnig ?? sonnigerTag(hours, date) ?? sonnigeStunde(now);
  return { regenBald: wet(now) || wet(next), sonnig, grad: now.temp, boeen: now.gust, wind: now.wind ?? null };
}
