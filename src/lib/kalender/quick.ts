// Schnell-Eintrag einer Aufgabe ("+" bei Aufgaben): Text + WANN (Heute ·
// Morgen) + WO (Familie · Arbeit). Alles ist heute (Tafel 103): ohne Tag
// gehört sie zu heute; steht im Text ein Tag ("morgen", "Freitag"), erscheint
// sie ab diesem Tag. Eine Frist ("bis 24.10.") ändert daran nichts.
// Rein, damit Oberfläche und Tests gleich rechnen.

import { WEEKDAYS_SHORT_SO, WEEKDAYS_SO } from "@/lib/core/days";
import type { Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import type { AufgabeData, Reminder, Repeat } from "@/lib/kalender/model";
import { compareText } from "@/lib/core/sort";
import { genannterTag, guessLabel, guessRoom, parseCalendar, urgentFrom } from "@/lib/kalender/parse";

export type When = "heute" | "morgen" | { date?: string; due?: string };

export const WHEN_CHOICES: { id: "heute" | "morgen"; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "morgen", label: "Morgen" },
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
  // Ohne genannten Tag gilt der vorgegebene (sonst heute)
  const named = genannterTag(a.date, raw, today);
  const when: When | null = a.due
    ? { due: a.due, ...(named && named !== today ? { date: named } : {}) }
    : !named
      ? null
      : named === today
        ? "heute"
        : named === addDays(today, 1)
          ? "morgen"
          : { date: named };
  return { title, when, time: a.time, room: d.raum, label };
}

/** Aufgabe aus Titel und Auswahl – ohne genannten Tag für heute (auch mit Frist) */
export function quickTaskData(title: string, when: When, today: string, opts: { time?: string; reminder?: Reminder; label?: string; dringend?: boolean } = {}): AufgabeData {
  const base: AufgabeData = { title: title.trim().slice(0, 120), reminder: opts.reminder ?? "aus", repeat: null, ...(opts.time ? { time: opts.time } : {}), ...(opts.label ? { label: opts.label } : {}), ...(opts.dringend ? { dringend: true } : {}) };
  if (when === "heute") return { ...base, date: today };
  if (when === "morgen") return { ...base, date: addDays(today, 1) };
  return { ...base, date: when.date ?? today, ...(when.due ? { due: when.due } : {}) };
}

/** Kurz für einen Chip: "Fr 24.10." bzw. "bis Fr 24.10." */
export function whenLabel(when: When): string {
  if (typeof when === "string") return WHEN_CHOICES.find((c) => c.id === when)?.label ?? when;
  const iso = when.due ?? when.date ?? "";
  const [, m, d] = iso.split("-");
  const wd = WEEKDAYS_SHORT_SO[new Date(`${iso}T12:00:00`).getDay()];
  return `${when.due ? "bis " : ""}${wd} ${Number(d)}.${Number(m)}.`;
}

// --- Schnell-Eintrag Termin ("+" bei Termine) ----------------------------------

/** Häufige Uhrzeiten als Chips: eigene häufige zuerst, aufgefüllt mit 08:00 · 12:00 · 15:00 · 19:30 */
const DEFAULT_TIMES = ["08:00", "12:00", "15:00", "19:30"];

export function frequentTimes(starts: string[], count = 4): string[] {
  const tally = new Map<string, number>();
  for (const t of starts) if (/^\d{2}:\d{2}$/.test(t)) tally.set(t, (tally.get(t) ?? 0) + 1);
  const own = [...tally.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || compareText(a[0], b[0])).map(([t]) => t);
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
  return { title: d.data.title || raw, date: d.data.due ?? genannterTag(d.data.date, raw, today) ?? undefined, time: d.data.time, room: d.raum, label: d.data.label };
}

/**
 * Tag für einen neuen Termin: selbst gewählt › im Text genannt › vorgegebener
 * Tag (z. B. im Kalender gewählt) › heute. Die Erkennung setzt ohne Tagesangabe
 * "heute" ein – das zählt nur, wenn "heute" wirklich im Text steht.
 */
export function terminDay(text: string, readDate: string | undefined, picked: string | null, defaultDate: string | undefined, today: string): string {
  const fromText = readDate && (readDate !== today || /\bheute\b/i.test(text)) ? readDate : undefined;
  return picked ?? fromText ?? defaultDate ?? today;
}

/** Kurzer Tag für Chips: "Freitag" bzw. "Fr 24.10." */
export function dayChipLabel(iso: string, long = false): string {
  const wd = new Date(`${iso}T12:00:00`).getDay();
  if (long) return WEEKDAYS_SO[wd];
  const [, m, d] = iso.split("-");
  return `${WEEKDAYS_SHORT_SO[wd]} ${Number(d)}.${Number(m)}.`;
}
