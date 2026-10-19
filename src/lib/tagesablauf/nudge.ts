// Bewusste Schritte ("Ich koche jetzt", "Gegessen ✓", Timer gestartet,
// "Alles zeigen") wechseln die Phase sofort – sonst wechselt sie nur beim
// Öffnen/Zurückkehren oder nach 30 s ohne Berührung (nie unter dem Finger).

import { useExternalStore } from "../core/useExternalStore";

let count = 0;
const listeners = new Set<() => void>();

export function nudgePhase() {
  count++;
  listeners.forEach((l) => l());
}

export function usePhaseNudge(): number {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => count,
    () => 0,
  );
}

// --- "Alles zeigen": normale Ansicht bis zum nächsten Phasenwechsel ----------------------

const SHOW_ALL_KEY = "wasgibts.alleszeigen";
const showAllListeners = new Set<() => void>();

const readShowAll = (): string | null => {
  try {
    return sessionStorage.getItem(SHOW_ALL_KEY);
  } catch {
    return null;
  }
};

/** Für diese Phase (Schlüssel "Datum:Phase") die normale Ansicht zeigen; null = zurück */
export function setShowAll(key: string | null) {
  try {
    if (key) sessionStorage.setItem(SHOW_ALL_KEY, key);
    else sessionStorage.removeItem(SHOW_ALL_KEY);
  } catch {
    // ohne Speicher gilt es bis zum Neuladen nicht
  }
  showAllListeners.forEach((l) => l());
}

export function useShowAll(): string | null {
  return useExternalStore(
    (l) => {
      showAllListeners.add(l);
      return () => showAllListeners.delete(l);
    },
    readShowAll,
    () => null,
  );
}
