"use client";

// Schnelleingabe (Tafel 76): „＋ = schreiben, Mia = sprechen“. Jedes „＋“ öffnet
// ein kleines Fenster mit EINEM Feld; ➤ speichert, das Feld bleibt für die
// nächste offen. Termine und Aufgaben öffnen ihr EINES Fenster „Neuer Termin“
// bzw. „Neue Aufgabe“ (Tafel 114, `kalender/eintragen/oeffnen.ts`).
// Hier: was ein „＋“ will (Öffnen-Ereignis) und das Lesen des Satzes.

import { addDays } from "@/lib/core/now";
import { headerDate } from "@/lib/heute/kopfDatum";
import { tomorrowLabel, type CalendarEntry } from "@/lib/kalender/model";
import type { PinQuote } from "@/lib/pinnwand/model";

type QuickKind = "termin" | "aufgabe" | "einkauf" | "notiz" | "pinnwand" | "imhaus";

/** Arten der kleinen Schnelleingabe (Termine und Aufgaben haben ihr eigenes Fenster, `kalender/eintragen`) */
type KleineArt = Exclude<QuickKind, "termin" | "aufgabe">;

/** Kopf in der Farbe des Bereichs */
export const QUICK_HEADER: Record<KleineArt, string> = {
  einkauf: "AUF DIE LISTE",
  notiz: "NEUE NOTIZ",
  pinnwand: "NACHRICHT AN ALLE",
  imhaus: "IM HAUS",
};

/** Name des Feldes (VoiceOver) */
export const QUICK_LABEL: Record<KleineArt, string> = { einkauf: "Auf die Liste", notiz: "Neue Notiz", pinnwand: "Nachricht an alle", imhaus: "Im Haus" };

export const QUICK_PLACEHOLDER: Record<KleineArt, string> = {
  einkauf: "z. B. Milch, Brot und Äpfel",
  notiz: "z. B. WLAN-Passwort: …",
  pinnwand: "z. B. Bin um 20 Uhr da",
  imhaus: "z. B. Eier, Milch, Hack",
};

export type QuickRead = { kind: KleineArt; title: string };

/** Den Satz lesen: der getippte Text, ohne Ränder */
export const readQuick = (kind: KleineArt, text: string): QuickRead => ({ kind, title: text.trim() });

/** „Fr, 30. Okt“ */
export const shortDay = (iso: string) => headerDate(new Date(`${iso}T12:00:00Z`));

/** „Heute“, „Morgen · Do“, sonst „Fr, 30. Okt“ */
export function dayWord(iso: string, today: string): string {
  if (iso === today) return "Heute";
  if (iso === addDays(today, 1)) return tomorrowLabel(iso);
  return shortDay(iso);
}

// --- Öffnen ----------------------------------------------------------------------

/**
 * Was ein „＋“ mitgibt: `date` = vorgewählter Tag (Kalender), `entry` =
 * bestehender Termin/Aufgabe zum Ändern, `more` = das volle Formular („Mehr
 * Details“ bei Pinnwand/Einkauf, bekommt den getippten Text), `me` = wer
 * schreibt (Pinnwand), `quote` = Antwort auf eine Nachricht, `shopping` =
 * Woche der Einkaufsliste und der Laden.
 */
export type QuickRequest = {
  kind: QuickKind;
  date?: string;
  entry?: CalendarEntry;
  more?: (text: string) => void;
  me?: string;
  quote?: PinQuote | null;
  /** `shop` = offener Laden-Reiter bzw. gewählter Laden („Kommt auf die Liste für“), `picked` = von Hand gewählt */
  shopping?: { weekStart: string; shop?: string; picked?: boolean };
};

const EVENT = "mia:schnelleingabe";
let pending: QuickRequest | null = null;
let listening = 0;

export function openQuick(request: QuickRequest) {
  if (!listening) {
    pending = request;
    return;
  }
  window.dispatchEvent(new CustomEvent<QuickRequest>(EVENT, { detail: request }));
}

export function onOpenQuick(listener: (r: QuickRequest) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<QuickRequest>).detail);
  window.addEventListener(EVENT, handler);
  listening++;
  if (pending) {
    const r = pending;
    pending = null;
    listener(r);
  }
  return () => {
    window.removeEventListener(EVENT, handler);
    listening--;
  };
}
