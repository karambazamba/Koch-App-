// Schnell-Eintrag einer Aufgabe ("+" bei Aufgaben): Text + WANN (Heute ·
// Morgen · Diese Woche · Irgendwann) + WO (Familie · Arbeit). Steht im Text
// schon ein Tag ("morgen", "Freitag", "bis 24.10."), wird er übernommen.
// Rein, damit Oberfläche und Tests gleich rechnen.

import type { Room } from "../core/entries";
import { addDays } from "../core/now";
import { mondayOf, type AufgabeData, type Reminder, type Repeat } from "./model";
import { guessLabel, guessRoom, parseCalendar, urgentFrom } from "./parse";

export type When = "heute" | "morgen" | "woche" | "irgendwann" | { date?: string; due?: string };

export const WHEN_CHOICES: { id: "heute" | "morgen" | "woche" | "irgendwann"; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "morgen", label: "Morgen" },
  { id: "woche", label: "Diese Woche" },
  { id: "irgendwann", label: "Irgendwann" },
];

/** Was der Text über Tag/Frist sagt (oder null) – plus der bereinigte Titel */

export function readQuickText(text: string, today: string): { title: string; when: When | null; time?: string; room: Room; label?: string; urgent: boolean } {
  const urgent = urgentFrom(text);
  return { ...readPlainQuickText(urgent.text, today), urgent: urgent.urgent };
}

function readPlainQuickText(text: string, today: string): { title: string; when: When | null; time?: string; room: Room; label?: string } {
  const raw = text.trim();
  const cmd = parseCalendar(raw, today);
  const room = guessRoom(raw);
  if (cmd?.kind !== "create") return { title: raw, when: null, room, label: guessLabel(raw) };
  const d = cmd.draft;
  const title = d.data.title || raw;
  const label = d.data.label;
  if (d.typ === "termin") {
    const when: When = d.data.date === today ? "heute" : d.data.date === addDays(today, 1) ? "morgen" : { date: d.data.date };
    return { title, when, time: d.data.start, room: d.raum, label };
  }
  const a = d.data;
  const when: When | null = a.due
    ? { due: a.due }
    : a.date
      ? a.date === today
        ? "heute"
        : a.date === addDays(today, 1)
          ? "morgen"
          : { date: a.date }
      : a.week
        ? a.week <= today
          ? "woche"
          : { date: a.week }
        : null;
  return { title, when, time: a.time, room: d.raum, label };
}

/** Aufgabe aus Titel und Auswahl */
export function quickTaskData(title: string, when: When, today: string, opts: { time?: string; reminder?: Reminder; label?: string; dringend?: boolean } = {}): AufgabeData {
  const base: AufgabeData = { title: title.trim().slice(0, 120), reminder: opts.reminder ?? "aus", repeat: null, ...(opts.time ? { time: opts.time } : {}), ...(opts.label ? { label: opts.label } : {}), ...(opts.dringend ? { dringend: true } : {}) };
  if (when === "heute") return { ...base, date: today };
  if (when === "morgen") return { ...base, date: addDays(today, 1) };
  if (when === "woche") return { ...base, week: mondayOf(today) };
  if (when === "irgendwann") return base;
  return { ...base, ...(when.due ? { due: when.due } : {}), ...(when.date ? { date: when.date } : {}) };
}

/** Kurz für einen Chip: "Fr 24.10." bzw. "bis Fr 24.10." */
export function whenLabel(when: When): string {
  if (typeof when === "string") return WHEN_CHOICES.find((c) => c.id === when)?.label ?? when;
  const iso = when.due ?? when.date ?? "";
  const [, m, d] = iso.split("-");
  const wd = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][new Date(`${iso}T12:00:00`).getDay()];
  return `${when.due ? "bis " : ""}${wd} ${Number(d)}.${Number(m)}.`;
}

// --- Schnell-Eintrag Termin ("+" bei Termine) ----------------------------------

/** Häufige Uhrzeiten als Chips: eigene häufige zuerst, aufgefüllt mit 08:00 · 12:00 · 15:00 · 19:30 */
const DEFAULT_TIMES = ["08:00", "12:00", "15:00", "19:30"];

export function frequentTimes(starts: string[], count = 4): string[] {
  const tally = new Map<string, number>();
  for (const t of starts) if (/^\d{2}:\d{2}$/.test(t)) tally.set(t, (tally.get(t) ?? 0) + 1);
  const own = [...tally.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
  return [...new Set([...own, ...DEFAULT_TIMES])].slice(0, count);
}

/** Was der Text über einen Termin sagt: Tag, Uhrzeit, Raum, Etikett – und der Titel ohne diese Angaben */
export function readTerminText(text: string, today: string): { title: string; date?: string; time?: string; room: Room; label?: string; repeat?: Repeat | null } {
  const raw = text.trim();
  const room = guessRoom(raw);
  const cmd = parseCalendar(raw, today);
  if (cmd?.kind !== "create") return { title: raw, room, label: guessLabel(raw) };
  const d = cmd.draft;
  if (d.typ === "termin") return { title: d.data.title || raw, date: d.data.date, time: d.data.start, room: d.raum, label: d.data.label, repeat: d.data.repeat ?? null };
  return { title: d.data.title || raw, date: d.data.date ?? d.data.due, time: d.data.time, room: d.raum, label: d.data.label };
}

/** Kurzer Tag für Chips: "Freitag" bzw. "Fr 24.10." */
export function dayChipLabel(iso: string, long = false): string {
  const wd = new Date(`${iso}T12:00:00`).getDay();
  if (long) return ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"][wd];
  const [, m, d] = iso.split("-");
  return `${["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"][wd]} ${Number(d)}.${Number(m)}.`;
}
