"use client";

// Küchenhelfer-Panel von überall öffnen (z. B. Eingabeleiste der Startseite).
// Der Küchenhelfer im Layout hört auf dieses Ereignis.
// "spontan" = Spontan kochen (mit dem, was da ist; früher "reste"),
// "voice" = Mikrofon startet direkt; "wochencheck" = Wochencheck (eigenes
// Fenster, Tafel 36); "eintragen" = ein „＋“ wurde getippt: erst Mia fragen
// (Erzählen statt ausfüllen), das Formular bleibt über „Lieber Formular“;
// `ask` = gleich fragen.

import { unlockSpeech } from "@/lib/begleitung/speech";

type HelperMode = "spontan" | "voice" | "wochencheck" | "kochtipp" | "eintragen";

/** Was ein „＋“ eintragen will – Mia fragt passend */
export type EntryKind = "termin" | "aufgabe" | "einkauf" | "notiz" | "pinnwand" | "eintrag";

type Detail = { mode?: HelperMode; ask?: string; filters?: string[] };

const EVENT = "kuechenhelfer:oeffnen";

/** Hört noch niemand zu (z. B. direkt nach dem Laden), wartet die Bitte hier */
let listeners = 0;
let pending: Detail | null = null;

/** `filters`: im Spontan-Modus schon gewählte Filter-Chips (z. B. "reste") */
export function openHelper(mode?: HelperMode, ask?: string, filters?: string[]) {
  // Wird beim Antippen aufgerufen – schaltet auf dem iPhone die Sprachausgabe frei
  unlockSpeech();
  if (!listeners) {
    pending = { mode, ask, filters };
    return;
  }
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { mode, ask, filters } }));
}

export function onOpenHelper(listener: (mode?: HelperMode, ask?: string, filters?: string[]) => void): () => void {
  const handler = (e: Event) => {
    const d = (e as CustomEvent<Detail>).detail ?? {};
    listener(d.mode, d.ask, d.filters);
  };
  window.addEventListener(EVENT, handler);
  listeners++;
  if (pending) {
    const d = pending;
    pending = null;
    listener(d.mode, d.ask, d.filters);
  }
  return () => {
    listeners--;
    window.removeEventListener(EVENT, handler);
  };
}

// --- Lange drücken auf den Mia-Knopf: Loslassen schickt ab ---------------------

const RELEASE = "kuechenhelfer:loslassen";

export const releaseHelperVoice = () => window.dispatchEvent(new Event(RELEASE));

export function onReleaseHelperVoice(listener: () => void): () => void {
  window.addEventListener(RELEASE, listener);
  return () => window.removeEventListener(RELEASE, listener);
}

// --- „＋“: erst Mia, das Formular nur auf Wunsch ---------------------------------

let formular: (() => void) | null = null;

/** „＋“ getippt: Mia fragt („Was soll ich eintragen?“), „Lieber Formular“ öffnet `form` */
export function askMiaFirst(kind: EntryKind, form: () => void) {
  formular = form;
  openHelper("eintragen", undefined, [kind]);
}

/** Das gemerkte Formular (einmal) – für „Lieber Formular“ */
export function takeFormular(): (() => void) | null {
  const f = formular;
  formular = null;
  return f;
}

export const hasFormular = () => formular !== null;
