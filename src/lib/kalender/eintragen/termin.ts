// Fenster „Neuer Termin“ (Tafel 114, Bild 4): EIN Feld („Zahnarzt Freitag
// 13 Uhr“). Mia liest Tag, Uhrzeit und Dauer heraus und zeigt sie als blaue
// Chips zum Ändern. Ohne Uhrzeit steht „Uhrzeit?“ hervorgehoben da –
// gespeichert wird erst danach (oder ganztägig über „Mehr“). Glocke =
// Erinnern vorher. „Mehr“: Ort, Wiederholen, ganztägig, Personen. Rein.

import type { Room } from "@/lib/core/entries";
import { REMINDERS, type Reminder, type Repeat, type TerminData } from "@/lib/kalender/model";
import { ohneRaumWorte, raumAusText } from "@/lib/kalender/parse";
import { readTerminText } from "@/lib/kalender/quick";
import { readSentence } from "@/lib/kalender/sentence";
import { minutenVon, uhrVon } from "@/lib/kalender/eintragen/tage";

export type TerminGelesen = {
  title: string;
  /** Genannter Tag (sonst null) */
  date: string | null;
  time: string | null;
  /** Genannte Dauer in Minuten (sonst null) */
  dauer: number | null;
  raum: Room | null;
  repeat: Repeat | null;
  label?: string;
};

const B = "(?<![a-zäöüß0-9])";
const E = "(?![a-zäöüß])";
const DAUER = new RegExp(`${B}(?:für\\s+)?(\\d+(?:[.,]5)?|eine?|einer|anderthalb|halbe?)\\s*(std\\.?|stunden?|h|min\\.?|minuten)${E}`, "i");

/** „1 Std“, „90 Minuten“, „eine Stunde“, „anderthalb Stunden“ → Minuten (und die Stelle im Text) */
export function dauerAusText(text: string): { min: number; match: string } | null {
  const m = text.match(DAUER);
  if (!m) return null;
  const word = m[1].toLowerCase();
  const n = word === "anderthalb" ? 1.5 : word.startsWith("halb") ? 0.5 : /^ein/.test(word) ? 1 : Number(word.replace(",", "."));
  const min = /^min/i.test(m[2]) ? n : n * 60;
  return min >= 5 && min <= 12 * 60 ? { min: Math.round(min), match: m[0] } : null;
}

/** Den Satz lesen (ohne KI) – Dauer zuerst heraus, damit „1 Std“ keine Uhrzeit wird */
export function terminLesen(text: string, today: string, arbeitWorte: readonly string[] = []): TerminGelesen {
  const dauer = dauerAusText(text);
  const rest = dauer ? text.replace(dauer.match, " ").replace(/\s+/g, " ").trim() : text;
  const sentence = readSentence(rest, today);
  const extra = readTerminText(rest, today);
  return {
    title: ohneRaumWorte(extra.repeat ? extra.title : sentence.title),
    date: sentence.date ?? null,
    time: sentence.time ?? null,
    dauer: dauer?.min ?? null,
    raum: raumAusText(text, arbeitWorte),
    repeat: extra.repeat ?? null,
    ...(extra.label ? { label: extra.label } : {}),
  };
}

export const STANDARD_DAUER = 60;
export const DAUER_WAHL = [30, 60, 90, 120, 180];

/** „30 Min“, „1 Std“, „1,5 Std“ */
export const dauerLabel = (min: number) => (min < 60 ? `${min} Min` : `${String(min / 60).replace(".", ",")} Std`);

/** Ende aus Beginn und Dauer (über Mitternacht = ohne Ende) */
export function endeVon(start: string, dauer: number): string | undefined {
  const end = minutenVon(start) + dauer;
  return end < 24 * 60 ? uhrVon(end) : undefined;
}

/** Dauer eines bestehenden Termins (ohne Ende: null = Standard 1 Stunde, ohne Ende gespeichert) */
export const dauerVon = (start: string, end?: string): number | null => (start && end && minutenVon(end) > minutenVon(start) ? minutenVon(end) - minutenVon(start) : null);

/** Uhrzeiten zum Antippen */
export const UHR_WAHL = ["08:00", "09:00", "10:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:30"];

/** Glocke beim Termin: Erinnern vorher */
export const VORHER_WAHL: Reminder[] = ["15", "30", "60", "vorabend"];

/** „Erinnern 1 Std vorher“, „Erinnern am Vorabend“ */
export const vorherText = (r: Reminder) => `Erinnern ${REMINDERS.find((x) => x.value === r)?.short ?? ""}`.trim();

/** Speichern geht erst mit Titel und Uhrzeit (oder ganztägig) */
export const terminBereit = (o: { title: string; time: string | null; ganztaegig: boolean }) => Boolean(o.title.trim()) && (o.ganztaegig || Boolean(o.time));

/** Daten des Termins – beim Bearbeiten bleibt alles andere (Etikett, Link, Herkunft, Abgehaktes) */
export function terminDaten(o: { title: string; date: string; time: string | null; ganztaegig: boolean; dauer: number | null; reminder: Reminder; repeat: Repeat | null; place: string; who: string[]; label?: string; vorher?: TerminData }): TerminData {
  const start = o.ganztaegig || !o.time ? "" : o.time;
  const data: TerminData = {
    ...(o.vorher ?? { reminder: "aus", ...(o.label ? { label: o.label } : {}) }),
    title: o.title.trim().slice(0, 120),
    date: o.date,
    start,
    end: start && o.dauer ? endeVon(start, o.dauer) : undefined,
    place: o.place.trim() ? o.place.trim().slice(0, 120) : undefined,
    repeat: o.repeat,
    reminder: o.reminder,
    who: o.who.length ? o.who : undefined,
  } as TerminData;
  for (const k of ["end", "place", "who"] as const) if (data[k] === undefined) delete data[k];
  return data;
}
