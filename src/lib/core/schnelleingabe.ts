"use client";

// Schnelleingabe (Tafel 76): „＋ = tippen, Mia = sprechen“. Jedes „＋“ öffnet
// ein kleines Fenster mit EINEM Feld; der Satz wird ohne KI gelesen (Tag,
// Uhrzeit, Raum) und darunter als kleine Chips gezeigt – antippen ändert,
// nötig sind sie nie. ➤ speichert, das Feld bleibt für die nächste offen.
// Hier: was ein „＋“ will (Öffnen-Ereignis) und das reine Lesen des Satzes.

import type { Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import { headerDate } from "@/lib/heute/kopfDatum";
import { tomorrowLabel, type Repeat } from "@/lib/kalender/model";
import { readQuickText, readTerminText, type When } from "@/lib/kalender/quick";
import { readSentence, timeLabel } from "@/lib/kalender/sentence";
import type { PinQuote } from "@/lib/pinnwand/model";

export type QuickKind = "termin" | "aufgabe" | "einkauf" | "notiz" | "pinnwand" | "imhaus";

/** Kopf in der Farbe des Bereichs */
export const QUICK_HEADER: Record<QuickKind, string> = {
  termin: "NEUER TERMIN",
  aufgabe: "NEUE AUFGABE",
  einkauf: "AUF DIE LISTE",
  notiz: "NEUE NOTIZ",
  pinnwand: "NACHRICHT AN ALLE",
  imhaus: "IM HAUS",
};

/** Name des Feldes (VoiceOver) */
export const QUICK_LABEL: Record<QuickKind, string> = { termin: "Neuer Termin", aufgabe: "Neue Aufgabe", einkauf: "Auf die Liste", notiz: "Neue Notiz", pinnwand: "Nachricht an alle", imhaus: "Im Haus" };

export const QUICK_PLACEHOLDER: Record<QuickKind, string> = {
  termin: "z. B. Zahnarzt Jonne Fr 16 Uhr",
  aufgabe: "z. B. Malersachen kaufen bis Mittwoch",
  einkauf: "z. B. Milch, Brot und Äpfel",
  notiz: "z. B. WLAN-Passwort: …",
  pinnwand: "z. B. Bin um 20 Uhr da",
  imhaus: "z. B. Kartoffeln, Eier",
};

/** Von Hand gewählt (Chip angetippt) – geht vor dem, was im Text steht */
export type QuickPick = { date?: string; allDay?: boolean; room?: Room; when?: When | null };

export type QuickRead =
  | { kind: "termin"; title: string; date: string; time: string | null; room: Room; label?: string; repeat: Repeat | null }
  | { kind: "aufgabe"; title: string; when: When | null; time?: string; room: Room; label?: string; urgent: boolean }
  | { kind: "einkauf" | "notiz" | "pinnwand" | "imhaus"; title: string };

/** Den Satz lesen: Titel ohne Tag/Uhrzeit, dazu Tag, Uhrzeit, Raum (ohne KI) */
export function readQuick(kind: QuickKind, text: string, today: string, opts: { date?: string; pick?: QuickPick } = {}): QuickRead {
  const pick = opts.pick ?? {};
  if (kind === "termin") {
    const sentence = readSentence(text, today);
    const extra = readTerminText(text, today);
    return {
      kind,
      title: (extra.repeat ? extra.title : sentence.title).trim(),
      date: pick.date ?? sentence.date ?? opts.date ?? today,
      time: pick.allDay ? null : (sentence.time ?? null),
      room: pick.room ?? extra.room,
      ...(extra.label ? { label: extra.label } : {}),
      repeat: extra.repeat ?? null,
    };
  }
  if (kind === "aufgabe") {
    const read = readQuickText(text, today);
    const when = pick.when !== undefined ? pick.when : (read.when ?? (opts.date ? { date: opts.date } : null));
    return { kind, title: read.title.trim(), when, ...(read.time ? { time: read.time } : {}), room: pick.room ?? read.room, ...(read.label ? { label: read.label } : {}), urgent: read.urgent };
  }
  return { kind, title: text.trim() };
}

/** „Fr, 30. Okt“ */
export const shortDay = (iso: string) => headerDate(new Date(`${iso}T12:00:00Z`));

export function dayWord(iso: string, today: string): string {
  if (iso === today) return "Heute";
  if (iso === addDays(today, 1)) return tomorrowLabel(iso);
  return shortDay(iso);
}

/** Tag einer Aufgabe für den Chip: „heute“, „Morgen · Sa“, „Mi, 28. Okt“, „bis Mi, 28. Okt“, „diese Woche“; ohne Tag keiner */
export function whenChip(when: When | null, today: string): string | null {
  if (!when || when === "irgendwann") return null;
  if (when === "heute") return "heute";
  if (when === "morgen") return tomorrowLabel(addDays(today, 1));
  if (when === "woche") return "diese Woche";
  if (when.due) return `bis ${shortDay(when.due)}`;
  return when.date ? (when.date === today ? "heute" : dayWord(when.date, today)) : null;
}

export type QuickChip = { id: "tag" | "raum"; label: string; room?: Room };

/** Live-Chips unter dem Feld (leer bei Einkauf, Notiz, Pinnwand) */
export function quickChips(read: QuickRead, today: string): QuickChip[] {
  if (read.kind === "termin") {
    const day = dayWord(read.date, today);
    return [
      { id: "tag", label: read.time ? `${day} · ${timeLabel(read.time)}` : `${day} · ganztägig` },
      { id: "raum", label: read.room === "arbeit" ? "Arbeit" : "Familie", room: read.room },
    ];
  }
  if (read.kind === "aufgabe") {
    const day = whenChip(read.when, today);
    const time = read.time ? ` · ${timeLabel(read.time)}` : "";
    return [...(day ? [{ id: "tag" as const, label: `${day}${time}` }] : []), { id: "raum", label: read.room === "arbeit" ? "Arbeit" : "Familie", room: read.room }];
  }
  return [];
}

/** Tage zum Antippen (Chip „Tag“): heute, morgen und die nächsten Tage */
export const dayChoices = (today: string, count = 7) => Array.from({ length: count }, (_, i) => ({ iso: addDays(today, i), label: dayWord(addDays(today, i), today) }));

// --- Öffnen ----------------------------------------------------------------------

/**
 * Was ein „＋“ mitgibt: `date` = vorgewählter Tag (Kalender), `more` = das
 * volle Formular („Mehr Details“, bekommt den getippten Text), `me` = wer
 * schreibt (Pinnwand), `quote` = Antwort auf eine Nachricht, `shopping` =
 * Woche und Einstellungen der Einkaufsliste.
 */
export type QuickRequest = {
  kind: QuickKind;
  date?: string;
  more?: (text: string) => void;
  me?: string;
  quote?: PinQuote | null;
  shopping?: { weekStart: string };
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
