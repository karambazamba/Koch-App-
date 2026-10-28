// Sport (rein): Trainings, Wochenziel (Woche ab Montag), Serien nur in
// Wochen, Statistik und Sätze ohne Druck. Ein Training ist persönlich (nicht
// automatisch mit der Familie geteilt – später optional "Familie in
// Bewegung"). Geplante Trainings sind Termine mit Etikett "Sport"; wird so
// ein Termin abgehakt, zählt er als Training (Dauer aus dem Termin, änderbar).
// Apple Health / Watch kann eine Web-App nicht lesen – Eintragen nur von Hand
// oder per Lotte.

import { createEntry, type Entry } from "@/lib/core/entries";
import { addDays, fromIsoDate } from "@/lib/core/now";
import type { CalendarEntry, DayItem } from "@/lib/kalender/model";
import { itemsForDay, mondayOf, weekdayIndex } from "@/lib/kalender/model";

type SportKind = { id: string; label: string; emoji: string; outdoor: boolean; noun: [string, string]; pack: string[] };

export const SPORTS: SportKind[] = [
  { id: "laufen", label: "Laufen", emoji: "🏃", outdoor: true, noun: ["Lauf", "Läufe"], pack: ["Laufschuhe", "Kopfhörer", "Trinkflasche"] },
  { id: "fitness", label: "Fitnessstudio", emoji: "🏋️", outdoor: false, noun: ["Training", "Trainings"], pack: ["Handtuch", "Trinkflasche", "Hallenschuhe"] },
  { id: "rad", label: "Rad", emoji: "🚴", outdoor: true, noun: ["Radtour", "Radtouren"], pack: ["Helm", "Trinkflasche", "Regenjacke"] },
  { id: "schwimmen", label: "Schwimmen", emoji: "🏊", outdoor: false, noun: ["Schwimmeinheit", "Schwimmeinheiten"], pack: ["Badesachen", "Handtuch", "Duschgel"] },
  { id: "yoga", label: "Yoga", emoji: "🧘", outdoor: false, noun: ["Yoga-Einheit", "Yoga-Einheiten"], pack: ["Matte", "Trinkflasche"] },
  { id: "fussball", label: "Fußball", emoji: "⚽", outdoor: true, noun: ["Fußball-Training", "Fußball-Trainings"], pack: ["Fußballschuhe", "Schienbeinschoner", "Trinkflasche"] },
  { id: "spazieren", label: "Spaziergang", emoji: "🚶", outdoor: true, noun: ["Spaziergang", "Spaziergänge"], pack: ["Bequeme Schuhe"] },
  { id: "volleyball", label: "Volleyball", emoji: "🏐", outdoor: false, noun: ["Volleyball-Training", "Volleyball-Trainings"], pack: ["Hallenschuhe", "Knieschoner", "Trinkflasche"] },
];

const OTHER: Omit<SportKind, "id" | "label"> = { emoji: "💪", outdoor: false, noun: ["Training", "Trainings"], pack: ["Trinkflasche", "Handtuch"] };

export const sportById = (id: string): SportKind => SPORTS.find((s) => s.id === id) ?? { id, label: id, ...OTHER };

export type TrainingData = {
  /** Sportart (id aus SPORTS oder eigener Name) */
  sport: string;
  minutes: number;
  km?: number;
  /** "YYYY-MM-DD" */
  date: string;
  /** "HH:MM", optional */
  time?: string;
  note?: string;
  /** Aus einem abgehakten Sport-Termin ("<id>@<datum>") */
  terminKey?: string;
};

export type Training = Entry<TrainingData> & { typ: "training" };

export type SportState = {
  /** Wochenziel: Trainings pro Woche (1–7), null = ohne Ziel (Stempelkarte mit 3 Feldern) */
  goal: number | null;
  /** Ziel-Frage beim ersten Training schon gestellt (nie zweimal fragen) */
  zielGefragt: boolean;
  /** Erinnerung am Vorabend eines geplanten Trainings (Standard aus) */
  erinnerung: boolean;
  trainings: Training[];
  /** Eigene Packlisten je Sportart */
  packs: Record<string, string[]>;
  /** Wochen (Montag), deren Ziel schon gefeiert wurde */
  celebrated: string[];
  /** Abgehakte Sport-Termine, die bewusst nicht zählen sollen ("Löschen") */
  hidden: string[];
  /** Eigene Sportarten („Andere“ → Tennis), erscheinen künftig als Chip */
  custom: string[];
};

/** Ohne Ziel: so viele Felder hat die Stempelkarte (A-044) */
export const OHNE_ZIEL_FELDER = 3;
export const EMPTY_SPORT: SportState = { goal: null, zielGefragt: false, erinnerung: false, trainings: [], packs: {}, celebrated: [], hidden: [], custom: [] };

const SPORT_WORDS: [RegExp, string][] = [
  // auch das Partizip („gelaufen“, „gejoggt“, „geradelt“, „geschwommen“, „gewandert“)
  [/\b(lauf\w*|gelaufen|jogg\w*|gejoggt|renn\w*|gerannt)\b/i, "laufen"],
  [/\b(fitness\w*|gym|studio|kraft\w*|hantel\w*|gewicht\w*)\b/i, "fitness"],
  [/\b(rad\w*|geradelt|fahrrad\w*|bike|biken|radeln|radfahren)\b/i, "rad"],
  [/\b(schwimm\w*|geschwommen|bahnen)\b/i, "schwimmen"],
  [/\byoga\b/i, "yoga"],
  [/\b(fußball|fussball|kicken|kick)\b/i, "fussball"],
  [/\b(spazier\w*|wander\w*|gewandert|gassi)\b/i, "spazieren"],
  [/\bvolleyball\w*\b/i, "volleyball"],
];

/** Sportart aus einem Satz/Titel ("War 5 km laufen" → laufen) */
export const guessSport = (text: string): string | null => SPORT_WORDS.find(([re]) => re.test(text))?.[1] ?? null;

export function createTraining(data: TrainingData): Training {
  return createEntry("training", cleanTraining(data)) as Training;
}

function cleanTraining(d: TrainingData): TrainingData {
  const minutes = Math.max(1, Math.min(600, Math.round(Number(d.minutes) || 30)));
  const km = Number(d.km);
  return {
    sport: String(d.sport || "fitness").slice(0, 30),
    minutes,
    ...(Number.isFinite(km) && km > 0 ? { km: Math.round(km * 10) / 10 } : {}),
    date: d.date,
    ...(d.time && /^\d{2}:\d{2}$/.test(d.time) ? { time: d.time } : {}),
    ...(d.note ? { note: String(d.note).slice(0, 200) } : {}),
    ...(d.terminKey ? { terminKey: d.terminKey } : {}),
  };
}

/** Gültiges Wochenziel (1–7) oder null */
export const validGoal = (g: unknown): number | null => (g !== null && Number.isInteger(Number(g)) && Number(g) >= 1 && Number(g) <= 7 ? Number(g) : null);

export function sanitizeSport(raw: unknown): SportState {
  if (!raw || typeof raw !== "object") return EMPTY_SPORT;
  const r = raw as Partial<SportState>;
  const trainings = (Array.isArray(r.trainings) ? r.trainings : []).filter(
    (t): t is Training => Boolean(t) && typeof t === "object" && typeof t.id === "string" && t.typ === "training" && Boolean(t.data) && typeof t.data.date === "string",
  );
  const packs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(r.packs && typeof r.packs === "object" ? r.packs : {})) if (Array.isArray(v)) packs[k] = v.map(String).filter(Boolean).slice(0, 12);
  return {
    goal: validGoal(r.goal),
    zielGefragt: r.zielGefragt === true,
    erinnerung: r.erinnerung === true,
    trainings: trainings.map((t) => ({ ...t, data: cleanTraining(t.data) })),
    packs,
    celebrated: Array.isArray(r.celebrated) ? r.celebrated.filter((x) => typeof x === "string").slice(-60) : [],
    hidden: Array.isArray(r.hidden) ? r.hidden.filter((x) => typeof x === "string").slice(-200) : [],
    // fehlt in älteren Speicherständen → leer
    custom: Array.isArray(r.custom) ? [...new Set(r.custom.filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, 30)).filter(Boolean))].slice(-12) : [],
  };
}

export const packFor = (state: Pick<SportState, "packs">, sport: string) => state.packs[sport] ?? sportById(sport).pack;

// --- Sport-Termine ------------------------------------------------------------------------

/** Termin mit Etikett "Sport" – und für mich (ohne "wer" oder mit mir) */
function isSportTermin(e: CalendarEntry, me?: string | null): boolean {
  if (e.typ !== "termin" || (e.data.label ?? "").toLowerCase() !== "sport") return false;
  return !e.data.who?.length || !me || e.data.who.includes(me);
}

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
const clock = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

/** Dauer eines Termins in Minuten (ohne Ende: 60) */
const terminMinutes = (item: Pick<DayItem, "time" | "end">) => (item.time && item.end && toMin(item.end) > toMin(item.time) ? toMin(item.end) - toMin(item.time) : 60);

/** Sport-Termine eines Tages */
function sportItems(entries: CalendarEntry[], date: string, today: string, me?: string | null): DayItem[] {
  return itemsForDay(entries, date, today).filter((i) => isSportTermin(i.entry, me));
}

/**
 * Alle Trainings im Zeitraum: selbst eingetragene plus abgehakte Sport-Termine
 * (ein geänderter Termin-Training ersetzt den abgeleiteten, "hidden" zählt nicht).
 */
export function trainingsBetween(state: SportState, entries: CalendarEntry[], from: string, to: string, today: string, me?: string | null): Training[] {
  const own = state.trainings.filter((t) => t.data.date >= from && t.data.date <= to);
  const keys = new Set(own.flatMap((t) => (t.data.terminKey ? [t.data.terminKey] : [])));
  const derived: Training[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const item of sportItems(entries, d, today, me)) {
      if (!item.done || keys.has(item.key) || state.hidden.includes(item.key)) continue;
      derived.push({
        id: `termin:${item.key}`,
        typ: "training",
        raum: "familie",
        besitzer: item.entry.besitzer,
        erstellt: item.entry.erstellt,
        geaendert: item.entry.geaendert,
        data: { sport: guessSport(item.title) ?? "fitness", minutes: terminMinutes(item), date: d, ...(item.time ? { time: item.time } : {}), note: item.title, terminKey: item.key },
      });
    }
  }
  return [...own, ...derived].sort((a, b) => a.data.date.localeCompare(b.data.date) || (a.data.time ?? "").localeCompare(b.data.time ?? ""));
}

/** Eine Woche: `felder` = Ziel (ohne Ziel 3); geschafft nur mit Ziel; Bonus = mehr als Felder */
type WeekStatus = { monday: string; count: number; goal: number | null; felder: number; reached: boolean; bonus: boolean };

export function weekStatus(state: SportState, entries: CalendarEntry[], today: string, me?: string | null, monday = mondayOf(today)): WeekStatus {
  const count = trainingsBetween(state, entries, monday, addDays(monday, 6), today, me).length;
  const felder = state.goal ?? OHNE_ZIEL_FELDER;
  return { monday, count, goal: state.goal, felder, reached: state.goal !== null && count >= state.goal, bonus: count > felder };
}

/** Serie in WOCHEN: geschaffte Wochen hintereinander bis letzte Woche (+ diese, wenn schon geschafft). Nie in Tagen. */
export function weekStreak(state: SportState, entries: CalendarEntry[], today: string, me?: string | null): number {
  const monday = mondayOf(today);
  let streak = weekStatus(state, entries, today, me, monday).reached ? 1 : 0;
  for (let w = addDays(monday, -7), n = 0; n < 104; w = addDays(w, -7), n++) {
    if (!weekStatus(state, entries, today, me, w).reached) break;
    streak++;
  }
  return streak;
}


const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
export const monthName = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1];

/** Monat: Anzahl, Minuten, km */
export function monthStats(state: SportState, entries: CalendarEntry[], today: string, me?: string | null, month = today.slice(0, 7)): { month: string; count: number; minutes: number; km: number } {
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const nextFirst = `${m === 12 ? y + 1 : y}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
  const to = month === today.slice(0, 7) ? today : addDays(nextFirst, -1);
  const list = trainingsBetween(state, entries, from, to, today, me);
  return { month, count: list.length, minutes: list.reduce((s, t) => s + t.data.minutes, 0), km: Math.round(list.reduce((s, t) => s + (t.data.km ?? 0), 0) * 10) / 10 };
}

/** "9 h 20 min" */
export function hoursLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** Feier-Text, wenn das Wochenziel erreicht ist (selten, ohne Zähler) */
export function celebrationText(name: string): string {
  return `Stark${name ? `, ${name}` : ""}! Dein Wochenziel ist geschafft.`;
}

/** Nächstes geplantes Training (heute noch oder in den nächsten 7 Tagen) */
export function nextTraining(entries: CalendarEntry[], today: string, minutes: number, me?: string | null): DayItem | null {
  for (let i = 0; i < 8; i++) {
    const date = addDays(today, i);
    const hit = sportItems(entries, date, today, me).find((x) => !x.done && (i > 0 || !x.time || toMin(x.end ?? x.time) + (x.end ? 0 : 60) > minutes));
    if (hit) return hit;
  }
  return null;
}

/** Heutiges Training (für die Sport-Phase): Start/Ende in Minuten */
export function todaysTraining(entries: CalendarEntry[], today: string, me?: string | null): { start: number; end: number; title: string } | null {
  const t = sportItems(entries, today, today, me).find((x) => x.time && !x.done);
  if (!t?.time) return null;
  const start = toMin(t.time);
  return { start, end: start + terminMinutes(t), title: t.title };
}

// --- Sätze ohne KI: "War heute 5 km laufen" -------------------------------------------------

type SportCommand =
  | { kind: "add"; sport: string; minutes: number | null; km: number | null; date: string }
  | { kind: "goal"; goal: number }
  | { kind: "stats"; what: "woche" | "monat"; km: boolean }
  | { kind: "lage" }
  | { kind: "plan"; count: number; part: DayPart | null; week: "diese" | "naechste" };

export type DayPart = "morgens" | "mittags" | "abends";

const NUMS: Record<string, number> = { ein: 1, einmal: 1, eins: 1, eine: 1, einen: 1, zwei: 2, zweimal: 2, drei: 3, dreimal: 3, vier: 4, viermal: 4, fünf: 5, fünfmal: 5, sechs: 6, sechsmal: 6, sieben: 7, siebenmal: 7 };
const numOf = (s: string) => (/\d/.test(s) ? Number(s.replace(",", ".")) : NUMS[s.toLowerCase()]);

function partOf(text: string): DayPart | null {
  if (/\b(morgens|früh|vormittags|am morgen|vor der arbeit)\b/i.test(text)) return "morgens";
  if (/\b(mittags|mittagspause|in der mittagspause)\b/i.test(text)) return "mittags";
  if (/\b(abends|nach der arbeit|am abend|feierabend)\b/i.test(text)) return "abends";
  return null;
}

export function parseSportCommand(text: string, today: string, others: string[] = []): SportCommand | null {
  const t = text.trim();
  const low = t.toLowerCase();
  // Planen: "Plan mir 3 Trainings nächste Woche, am liebsten morgens"
  const plan = low.match(/\bplan\w*\b.*?\b(\d|ein|zwei|drei|vier|fünf|sechs|sieben)\s*(?:×|x|mal)?\s*(trainings?|sport\w*|läufe|einheiten|workouts?)/);
  if (plan || (/\bplan\w*\b/.test(low) && /\b(trainings?|sporteinheiten)\b/.test(low))) {
    return { kind: "plan", count: Math.min(7, Math.max(1, plan ? numOf(plan[1]) || 3 : 3)), part: partOf(low), week: /\bdiese\s+woche\b/.test(low) ? "diese" : "naechste" };
  }
  // Ziel: "Ich will 4× pro Woche Sport machen"
  const goal = low.match(/\b(\d|ein|zwei|drei|vier|fünf|sechs|sieben)\s*(?:×|x|-?mal)\s*(?:pro|die|in der|jede)\s*woche\b/);
  if (goal && /\b(sport|training|trainieren|laufen|ziel|gehen|machen)\b/.test(low)) {
    const n = numOf(goal[1]);
    if (n >= 1 && n <= 7) return { kind: "goal", goal: n };
  }
  const wochenziel = low.match(/\bwochenziel\b.*?\b(\d)\b/);
  if (wochenziel) return { kind: "goal", goal: Math.min(7, Math.max(1, Number(wochenziel[1]))) };
  // Wie läuft’s? (Stempelkarte: „Mo war Laufen, Do ist geplant.“)
  if (/(?<![a-zäöüß])wie\s+(läuft|laeuft|steht|sieht)\S*\s.*(?<![a-zäöüß])(sport|training)/.test(low)) return { kind: "lage" };
  // Statistik
  if (/\bwie\s+(oft|viele?)\b/.test(low) && /\b(sport|training|trainiert|gelaufen|laufen|kilometer|km|läufe)\b/.test(low)) {
    return { kind: "stats", what: /\b(monat|januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\b/.test(low) ? "monat" : "woche", km: /\b(kilometer|km)\b/.test(low) };
  }
  // Eintragen: "War heute 5 km laufen", "45 Minuten Fitnessstudio gestern"
  const sport = guessSport(low);
  if (!sport || /\?$/.test(t) || /\b(morgen|übermorgen|nächste|plan|um\s+\d)/.test(low)) return null;
  if (!/\b(war|waren|bin|hab|habe|gewesen|gemacht|trainiert|gelaufen|geschwommen|geradelt|gefahren|spazieren|gestern|heute|vorgestern|minuten|min|km|kilometer|stunde)\b/.test(low)) return null;
  // Nur eigenes Training: "Ich war …", "War heute …", "45 Minuten …" – nicht "Mathis war beim Fußball"
  if (!/^(ich\b|war\b|bin\b|hab\w*\b|\d)/.test(low) && !/\bich\b/.test(low)) return null;
  if (others.some((n) => n.length > 1 && new RegExp(`\\b${n.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(low))) return null;
  const km = low.match(/(\d+(?:[.,]\d+)?)\s*(km|kilometer)\b/);
  const mins = low.match(/(\d+)\s*(min|minuten)\b/);
  const hours = low.match(/(\d+(?:[.,]\d+)?|eine|einer|anderthalb)\s*(std|stunden?)\b/);
  const halfHour = /\bhalbe\s+stunde\b/.test(low);
  const minutes = mins ? Number(mins[1]) : hours ? (hours[1] === "anderthalb" ? 90 : (numOf(hours[1]) || 1) * 60) : halfHour ? 30 : null;
  const date = /\bvorgestern\b/.test(low) ? addDays(today, -2) : /\bgestern\b/.test(low) ? addDays(today, -1) : today;
  return { kind: "add", sport, minutes, km: km ? Number(km[1].replace(",", ".")) : null, date };
}

/** Geschätzte Dauer, wenn keine genannt ist (Laufen: aus km, ca. 6 min/km) */
export function guessMinutes(sport: string, km: number | null): number {
  if (km && sport === "laufen") return Math.round(km * 6);
  if (km && sport === "rad") return Math.round(km * 3);
  return sport === "spazieren" ? 45 : sport === "yoga" ? 45 : 60;
}

// --- Trainings planen: freie Lücken, Abstand zu Arbeit, Wunsch-Tageszeit, Wetter -------------

type PlanSlot = { date: string; start: string; end: string; sport: string; title: string; note?: string };
type PlanInput = {
  entries: CalendarEntry[];
  today: string;
  count: number;
  part: DayPart | null;
  week: "diese" | "naechste";
  sport?: string | null;
  minutes?: number;
  me?: string | null;
  /** Wetter (optional): Regen je Stunde */
  rainAt?: (date: string, hour: number) => boolean | null;
};

const CANDIDATES: Record<DayPart | "egal", number[]> = {
  morgens: [7 * 60, 6 * 60 + 30, 8 * 60, 9 * 60],
  mittags: [12 * 60 + 15, 12 * 60 + 45, 13 * 60],
  abends: [18 * 60, 19 * 60, 17 * 60 + 30, 20 * 60],
  egal: [18 * 60, 7 * 60, 19 * 60, 17 * 60],
};

const IDEAL: Record<number, number[]> = { 1: [2], 2: [1, 3], 3: [0, 2, 4], 4: [0, 1, 3, 5], 5: [0, 1, 2, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
const DAY_SHORT = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const PART_WORD: Record<DayPart | "egal", string> = { morgens: "früh", mittags: "mittags", abends: "abends", egal: "" };

/** Belegte Zeiten eines Tages (15 Min Luft, 60 Min zu Arbeit) */
function busyOn(entries: CalendarEntry[], date: string, today: string) {
  return itemsForDay(entries, date, today)
    .filter((i) => i.time)
    .map((i) => {
      const s = toMin(i.time!);
      const e = i.end ? toMin(i.end) : s + 60;
      const pad = i.room === "arbeit" ? 60 : 15;
      return { from: s - pad, to: e + pad, title: i.title, work: i.room === "arbeit" };
    });
}

const isFree = (entries: CalendarEntry[], date: string, today: string, start: number, minutes: number) => !busyOn(entries, date, today).some((b) => start < b.to && start + minutes > b.from);

/** Freie Startzeiten an einem Tag (Vorschläge für "Training planen"), früh bis abends sortiert */
export function freeStarts(entries: CalendarEntry[], date: string, today: string, minutes: number, max = 3, after = -1): string[] {
  const order = [18 * 60, 7 * 60, 19 * 60, 17 * 60 + 30, 12 * 60 + 15, 8 * 60, 20 * 60];
  // heute nur, was noch kommt (`after` = Minuten jetzt)
  return order.filter((m) => m > after && isFree(entries, date, today, m, minutes)).slice(0, max).sort((a, b) => a - b).map(clock);
}

/** Ende eines Trainings ("18:00" + 45 → "18:45"), höchstens bis 23:59 (nie über Mitternacht) */
export const endOf = (start: string, minutes: number) => clock(Math.min(toMin(start) + minutes, 23 * 60 + 59));

/** Geplante (noch nicht abgehakte) Sport-Termine eines Tages */
export const plannedOn = (entries: CalendarEntry[], date: string, today: string, me?: string | null): DayItem[] => sportItems(entries, date, today, me).filter((x) => !x.done);

/** Das letzte Training (für "Wie letztes Mal") */
export function lastTraining(state: SportState, entries: CalendarEntry[], today: string, me?: string | null): TrainingData | null {
  const list = trainingsBetween(state, entries, addDays(today, -90), today, today, me);
  return list.length ? list[list.length - 1].data : null;
}

/**
 * Trainings in freie Lücken legen: keine Überschneidung mit Terminen (15 Min
 * Luft), 60 Min Abstand zu Arbeit-Terminen, Wunsch-Tageszeit zuerst, Tage
 * möglichst verteilt. Draußen-Sport bei Regen auf eine trockene Zeit, sonst
 * drinnen vorschlagen. Liefert die Vorschläge und kurze Erklärungen ("Fr früh
 * frei gelassen – da kommt der Großhandel").
 */
export function planTrainings(input: PlanInput): { slots: PlanSlot[]; notes: string[] } {
  const minutes = input.minutes ?? 60;
  const sport = input.sport ?? "laufen";
  const kind = sportById(sport);
  const monday = input.week === "naechste" ? addDays(mondayOf(input.today), 7) : mondayOf(input.today);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).filter((d) => d > input.today);
  const part = input.part ?? "egal";
  const notes: string[] = [];
  const busy = (date: string) => busyOn(input.entries, date, input.today);
  const free = (date: string, start: number) => isFree(input.entries, date, input.today, start, minutes);
  const choose = (date: string): { slot: PlanSlot | null; note?: string } => {
    const wanted = CANDIDATES[part];
    const clash = busy(date).find((b) => wanted.some((c) => c < b.to && c + minutes > b.from));
    for (const start of wanted) {
      if (!free(date, start)) continue;
      const rainy = kind.outdoor && input.rainAt ? input.rainAt(date, Math.floor(start / 60)) : null;
      if (rainy) {
        // Andere trockene Zeit am selben Tag – sonst drinnen
        const dry = [...wanted, ...CANDIDATES.egal].find((c) => free(date, c) && !input.rainAt!(date, Math.floor(c / 60)));
        if (dry !== undefined) return { slot: { date, start: clock(dry), end: clock(dry + minutes), sport, title: kind.label }, note: `${DAY_SHORT[weekdayIndex(date)]}: auf ${clock(dry)} gelegt – vorher regnet es` };
        return { slot: { date, start: clock(start), end: clock(start + minutes), sport: "fitness", title: "Fitnessstudio" }, note: `${DAY_SHORT[weekdayIndex(date)]}: Regen angesagt – lieber drinnen` };
      }
      return { slot: { date, start: clock(start), end: clock(start + minutes), sport, title: kind.label } };
    }
    return { slot: null, note: clash ? `${DAY_SHORT[weekdayIndex(date)]} ${PART_WORD[part] || "da"} frei gelassen – da ${clash.work ? "ist Arbeit" : `kommt ${clash.title}`}` : undefined };
  };
  const order = [...(IDEAL[Math.min(7, input.count)] ?? IDEAL[3]).map((i) => addDays(monday, i)), ...days].filter((d, i, all) => days.includes(d) && all.indexOf(d) === i);
  const slots: PlanSlot[] = [];
  const near = (d: string) => slots.some((s) => Math.abs(fromIsoDate(s.date).getTime() - fromIsoDate(d).getTime()) <= 86_400_000);
  for (const pass of [0, 1]) {
    for (const date of order) {
      if (slots.length >= input.count) break;
      if (slots.some((s) => s.date === date)) continue;
      if (pass === 0 && near(date)) continue;
      const { slot, note } = choose(date);
      if (slot) {
        slots.push(slot);
        if (note) notes.push(note);
      } else if (note && pass === 0 && !notes.includes(note)) notes.push(note);
    }
  }
  slots.sort((a, b) => a.date.localeCompare(b.date));
  if (slots.length < input.count) notes.push(`Nur ${slots.length} freie Lücken gefunden.`);
  return { slots, notes: notes.slice(0, 3) };
}
