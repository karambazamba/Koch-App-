"use client";

// Küchenhelfer-Panel von überall öffnen (z. B. Eingabeleiste der Startseite).
// Der Küchenhelfer im Layout hört auf dieses Ereignis.
// "spontan" = Spontan kochen (mit dem, was da ist; früher "reste"),
// "voice" = Mikrofon startet direkt; `ask` = gleich fragen.

import { unlockSpeech } from "./speech";

type HelperMode = "spontan" | "voice";

type Detail = { mode?: HelperMode; ask?: string; filters?: string[] };

const EVENT = "kuechenhelfer:oeffnen";

/** Hört noch niemand zu (z. B. beim ersten Laden über /schnellkueche), wartet die Bitte hier */
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
