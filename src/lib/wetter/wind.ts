// Wind (Tafel 87, früher Tafel 63 B): Stärke in Worten nach der Beaufort-Skala
// (Mittelwind) und als Windsack, Richtung als Buchstaben (nie als Pfeil).
// EINE Stelle für alle: Kachel, Wetter-Seite, Mia und Jetzt-Karte rechnen und
// sagen hier dasselbe. Tageswert aus den Stunden 7–21 Uhr (wie beim Regen):
// höchste mittlere Windstärke, dazu die stärkste Böe; Richtung als nach
// Stärke gewichteter Vektor-Mittelwert (350° + 10° = Nord, nicht Süd).

import type { ForecastHour } from "@/lib/wetter/forecast";

export type WindLevel = "kaum" | "leicht" | "maessig" | "frisch" | "lebhaft" | "stark" | "stuermisch" | "sturm" | "orkan";
export type Wind = { speed: number; gust: number; dir: number | null };

/** Die neun Stufen (Tafel 87): ab welcher mittleren Windstärke (km/h), Wort, Beaufort */
export const WIND_STUFEN: { id: WindLevel; ab: number; wort: string; bft: string }[] = [
  { id: "kaum", ab: 0, wort: "Kaum Wind", bft: "0–2" },
  { id: "leicht", ab: 12, wort: "Leichter Wind", bft: "3" },
  { id: "maessig", ab: 20, wort: "Mäßiger Wind", bft: "4" },
  { id: "frisch", ab: 29, wort: "Frischer Wind", bft: "5" },
  { id: "lebhaft", ab: 39, wort: "Lebhafter Wind", bft: "6" },
  { id: "stark", ab: 50, wort: "Starker Wind", bft: "7" },
  { id: "stuermisch", ab: 62, wort: "Stürmischer Wind", bft: "8" },
  { id: "sturm", ab: 75, wort: "Sturm", bft: "9–10" },
  { id: "orkan", ab: 103, wort: "Orkanartiger Wind", bft: "11–12" },
];

/** Böen nennen erst ab 60 km/h (auch wenn der Mittelwind niedriger ist) */
const GUST_SHOW = 60;

const SHORT = ["N", "NO", "O", "SO", "S", "SW", "W", "NW"] as const;
const LONG = ["Nord", "Nordost", "Ost", "Südost", "Süd", "Südwest", "West", "Nordwest"] as const;
/** Woher der Wind kommt, als Satzteil („aus Westen“) */
const FROM = ["aus Norden", "aus Nordosten", "aus Osten", "aus Südosten", "aus Süden", "aus Südwesten", "aus Westen", "aus Nordwesten"] as const;

/** Stufe nach dem Mittelwind (gerundet): Kaum Wind < 12 · 12–19 · 20–28 · 29–38 · 39–49 · 50–61 · 62–74 · 75–102 · ab 103 */
export function windLevel(speed: number): WindLevel {
  const s = Math.round(speed);
  return [...WIND_STUFEN].reverse().find((x) => s >= x.ab)!.id;
}

/** Rang der Stufe (0 = Kaum Wind … 8 = Orkanartig) – zum Vergleichen */
const windRank = (level: WindLevel) => WIND_STUFEN.findIndex((x) => x.id === level);
/** Das Wort der Stufe: „Frischer Wind“ */
export const windWord = (level: WindLevel) => WIND_STUFEN[windRank(level)].wort;

/**
 * Fällt der Wind auf? Erst ab „Frischer Wind“ (Mittelwind ≥ 29 km/h) oder
 * Böen ≥ 60 km/h zeigen Kachel und Wetter-Seite Windsack und Wind-Zeile;
 * darunter nichts (Seite: nur klein die Zahl in den Details).
 */
export const windZeigen = (w: Wind | null | undefined): w is Wind => !!w && (windRank(windLevel(w.speed)) >= windRank("frisch") || w.gust >= GUST_SHOW);

/** Windsack (Tafel 87): Windstriche ab „Lebhaft“, Karte warm ab „Stürmisch“, Windsack rot ab „Sturm“ */
export function windLook(level: WindLevel): { striche: number; ton: "warm" | "sturm" | null; rot: boolean } {
  const r = windRank(level);
  const striche = r >= windRank("lebhaft") ? [1, 1, 2, 3, 4][r - windRank("lebhaft")] : 0;
  return { striche, ton: r >= windRank("sturm") ? "sturm" : r >= windRank("stuermisch") ? "warm" : null, rot: r >= windRank("sturm") };
}

/** Grad (0–360, woher der Wind kommt) → eines von 8 Feldern (Grenzen bei 22,5°) */
const sector = (deg: number) => Math.round((((deg % 360) + 360) % 360) / 45) % 8;
export const dirShort = (deg: number) => SHORT[sector(deg)];
export const dirLong = (deg: number) => LONG[sector(deg)];
export const dirFrom = (deg: number) => FROM[sector(deg)];

/** Nach Stärke gewichteter Mittelwert der Richtungen (als Vektor) – null ohne Wind */
export function meanDirection(list: { speed: number; dir: number }[]): number | null {
  let x = 0;
  let y = 0;
  for (const { speed, dir } of list) {
    const w = Math.max(speed, 0.1);
    x += Math.sin((dir * Math.PI) / 180) * w;
    y += Math.cos((dir * Math.PI) / 180) * w;
  }
  if (Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9) return null;
  return Math.round(((Math.atan2(x, y) * 180) / Math.PI + 360) % 360);
}

/**
 * Wind über mehrere Stunden (Tag 7–21 Uhr bzw. eine Tageszeit). null, wenn die
 * Stunden keine Windstärke haben (ältere gespeicherte Vorhersagen) – dann
 * zeigt die Seite keinen Wind statt „0 km/h“.
 */
export function windOf(hours: ForecastHour[], daytime = false): Wind | null {
  const hs = daytime ? hours.filter((h) => h.hour >= 7 && h.hour <= 21) : hours;
  const known = (hs.length ? hs : hours).filter((h) => typeof h.wind === "number");
  if (!known.length) return null;
  const speed = Math.round(Math.max(...known.map((h) => h.wind!)));
  const gust = Math.round(Math.max(0, ...known.map((h) => h.gust)));
  const dir = meanDirection(known.filter((h) => typeof h.dir === "number").map((h) => ({ speed: h.wind!, dir: h.dir! })));
  return { speed, gust, dir };
}

/** Böen-Zusatz „Böen 85“ – erst ab 60 km/h, sonst null */
export const gustText = (w: Wind) => (w.gust >= GUST_SHOW ? `Böen ${w.gust}` : null);

/** Kachel und Seite: fett das Wort, leise die Zahl, Böen extra: „Frischer Wind“ · „32 km/h aus West“ · „Böen 85“ */
export function windLine(w: Wind): { wort: string; zahl: string; boeen: string | null } {
  return { wort: windWord(windLevel(w.speed)), zahl: windLong(w), boeen: gustText(w) };
}

/** Kurz für Karten: „22 km/h · W“, ab Böen 60 „35 · W · Böen 60“ */
export function windShort(w: Wind): string {
  const d = w.dir === null ? "" : ` · ${dirShort(w.dir)}`;
  return w.gust >= GUST_SHOW ? `${w.speed}${d} · Böen ${w.gust}` : `${w.speed} km/h${d}`;
}

/** Ausgeschrieben: „22 km/h aus West“ */
export const windLong = (w: Wind) => `${w.speed} km/h${w.dir === null ? "" : ` aus ${dirLong(w.dir)}`}`;

/** Satzteil für Mia: „Frischer Wind, 32 km/h aus Westen, Böen bis 85 km/h“ */
export function windWords(w: Wind): string {
  const gust = w.gust >= GUST_SHOW ? `, Böen bis ${w.gust} km/h` : "";
  return `${windWord(windLevel(w.speed))}, ${w.speed} km/h${w.dir === null ? "" : ` ${dirFrom(w.dir)}`}${gust}`;
}

/** VoiceOver: „Mäßiger Wind, 22 Kilometer pro Stunde aus Westen“ */
export function windSpoken(w: Wind): string {
  const gust = w.gust >= GUST_SHOW ? `, Böen bis ${w.gust} Kilometer pro Stunde` : "";
  return `${windWord(windLevel(w.speed))}, ${w.speed} Kilometer pro Stunde${w.dir === null ? "" : ` ${dirFrom(w.dir)}`}${gust}`;
}

/** Für Mia: „Morgen: Frischer Wind, 32 km/h aus Westen, Böen bis 85 km/h.“ */
export const windAnswer = (w: Wind, label: string) => `${label}: ${windWords(w)}.`;

/** Kurzwort für die Jetzt-Karte ab „Stürmisch“: „Stürmisch“ · „Sturm“ · „Orkan“ */
const STURM_WORT: Partial<Record<WindLevel, string>> = { stuermisch: "Stürmisch", sturm: "Sturm", orkan: "Orkan" };

/** Was man bei Sturm draußen tut – je Stichwort eine kurze Frage */
const STURM_FRAGEN: [RegExp, string][] = [
  [/trampolin/i, "Trampolin sichern?"],
  [/grill/i, "Grill lieber drinnen lassen?"],
  [/wäsche|waesche/i, "Wäsche lieber drinnen trocknen?"],
  [/fahrrad|radtour|\brad(?![a-zäöüß])/i, "Heute lieber ohne Rad?"],
  [/garten|balkon|terrasse/i, "Lose Sachen reinholen?"],
];

/**
 * Jetzt-Karte (Tafel 87): Wind nur ab „Stürmisch“ (Mittelwind ≥ 62) und nur
 * mit Planbezug – zur Stunde eines Draußen-Plans heute. „Stürmisch ab 14 Uhr“
 * nennt die erste stürmische Stunde ab jetzt bis zum Plan; dazu eine kurze
 * Frage passend zum Plan („Trampolin sichern?“). Ältere Daten ohne Wind: null.
 */
export function stormForPlan(hours: ForecastHour[], today: string, nowHour: number, plans: { key: string; title: string; time: string }[]): { key: string; title: string; time: string; head: string; detail: string } | null {
  const day = hours.filter((h) => h.date === today && h.hour >= nowHour && typeof h.wind === "number");
  const stormy = (h: ForecastHour) => windRank(windLevel(h.wind!)) >= windRank("stuermisch");
  for (const p of plans) {
    const at = Number(p.time.slice(0, 2));
    const hit = day.find((h) => h.hour === at);
    if (!hit || !stormy(hit)) continue;
    const first = day.find((h) => h.hour <= at && stormy(h))!;
    const word = STURM_WORT[windLevel(Math.max(...day.filter((h) => h.hour >= first.hour && h.hour <= at).map((h) => h.wind!)))]!;
    const ask = STURM_FRAGEN.find(([re]) => re.test(p.title))?.[1] ?? `${p.title.length > 24 ? `${p.title.slice(0, 23)}…` : p.title} lieber drinnen?`;
    return { key: p.key, title: p.title, time: p.time, head: `${word} ab ${first.hour} Uhr`, detail: ask };
  }
  return null;
}
