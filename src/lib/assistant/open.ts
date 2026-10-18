"use client";

// Küchenhelfer-Panel von überall öffnen (z. B. Eingabeleiste der Startseite).
// Der Küchenhelfer im Layout hört auf dieses Ereignis.
// "reste" = Reste-Modus, "voice" = Mikrofon startet direkt; `ask` = gleich fragen.

export type HelperMode = "reste" | "voice";

type Detail = { mode?: HelperMode; ask?: string };

const EVENT = "kuechenhelfer:oeffnen";

export function openHelper(mode?: HelperMode, ask?: string) {
  window.dispatchEvent(new CustomEvent<Detail>(EVENT, { detail: { mode, ask } }));
}

export function onOpenHelper(listener: (mode?: HelperMode, ask?: string) => void): () => void {
  const handler = (e: Event) => {
    const d = (e as CustomEvent<Detail>).detail ?? {};
    listener(d.mode, d.ask);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
