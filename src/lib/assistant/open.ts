"use client";

// Küchenhelfer-Panel von überall öffnen (z. B. Kachel "Was ist noch da?").
// Der Knopf (KitchenHelper im Layout) hört auf dieses Ereignis.

export type HelperMode = "reste";

const EVENT = "kuechenhelfer:oeffnen";

export function openHelper(mode?: HelperMode) {
  window.dispatchEvent(new CustomEvent<HelperMode | undefined>(EVENT, { detail: mode }));
}

export function onOpenHelper(listener: (mode?: HelperMode) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<HelperMode | undefined>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
