// Sport-Fenster der Startseite (A-050, Tafel 137/2) – rein und testbar:
// Unterzeile „Ziel 2× · Mo geschafft, Do geplant“, die Woche Mo–So als
// Kreise (geschafft = voll mit Symbol, geplant = gestrichelt mit Symbol,
// frei = Plus; vergangene freie Tage still) und der Satz auf dem großen
// Knopf „Sa 10:00 Volleyball planen“. Geplant wird ein Termin im Raum „Ich“
// (`plannedEntry(…, "ich")`), ohne Druck: keine Zähler, kein „noch offen“.

import { addDays } from "@/lib/core/now";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort, type CalendarEntry } from "@/lib/kalender/model";
import { plannedOn, sportById, trainingsBetween, type SportState } from "@/lib/sport/model";
import { sportOfTitle } from "@/lib/sport/plan";
import type { Stempelkarte } from "@/lib/sport/stempel";

/** „Ziel 2× · Mo geschafft, Do geplant“ (ohne Ziel: „Ohne Ziel · …“, nichts da: „… · Diese Woche ist frei“) */
export function wochenUnterzeile(karte: Pick<Stempelkarte, "ziel" | "felder" | "geschafft" | "bonus">, today: string): string {
  const kopf = karte.ziel ? `Ziel ${karte.ziel}×` : "Ohne Ziel";
  if (karte.geschafft) return `${kopf} · Woche geschafft`;
  const tag = (date: string) => (date === today ? "Heute" : weekdayShort(date));
  const tage = (dates: string[]) => [...new Set(dates)].map(tag).join(", ");
  const geschafft = [...karte.felder.flatMap((f) => (f.art === "stempel" ? [f.stempel.date] : [])), ...karte.bonus.map((b) => b.stempel.date)];
  const geplant = karte.felder.flatMap((f) => (f.art === "geplant" ? [f.date] : []));
  const teile = [geschafft.length ? `${tage(geschafft)} geschafft` : null, geplant.length ? `${tage(geplant)} geplant` : null].filter(Boolean);
  return `${kopf} · ${teile.length ? teile.join(", ") : "Diese Woche ist frei"}`;
}

export type WochenTag = {
  date: string;
  /** „Mo“ … „So“ */
  kurz: string;
  art: "geschafft" | "geplant" | "frei";
  /** Sportart fürs Symbol (geschafft/geplant) */
  sport: string | null;
  /** Schon vorbei – planen geht nicht mehr (nur „Schon trainiert? Eintragen“) */
  vorbei: boolean;
};

/** Die Woche Mo–So (ab `monday`) als Kreise */
export function wochenTage(state: SportState, entries: CalendarEntry[], today: string, monday: string, me?: string | null): WochenTag[] {
  const trainings = trainingsBetween(state, entries, monday, addDays(monday, 6), today, me);
  return Array.from({ length: 7 }, (_, n) => {
    const date = addDays(monday, n);
    const done = trainings.find((t) => t.data.date === date);
    const plan = date >= today ? plannedOn(entries, date, today, me)[0] : undefined;
    const art = done ? "geschafft" : plan ? "geplant" : "frei";
    const sport = done ? (done.data.terminKey && done.data.note ? sportOfTitle(done.data.note) : done.data.sport) : plan ? sportOfTitle(plan.title) : null;
    return { date, kurz: weekdayShort(date), art, sport, vorbei: date < today };
  });
}

/** Feste Uhrzeiten als Chips (dazu „andere“) */
export const PLAN_ZEITEN = ["08:00", "10:00", "18:00"];

/** Sportarten als Chips: eigene zuerst (zuletzt trainiert, eigene Namen), dann die übrigen – höchstens `max` */
export function sportChips(recent: string[], custom: string[], all: string[], max = 4): string[] {
  return [...new Set([...recent, ...custom, ...all])].slice(0, max);
}

/** Großer Knopf: „Sa 10:00 Volleyball planen“ (heute: „Heute 10:00 …“) */
export function planenText(date: string, time: string, sport: string, today: string): string {
  return `${date === today ? "Heute" : weekdayShort(date)} ${clockLabel(time)} ${sportById(sport).label} planen`;
}
