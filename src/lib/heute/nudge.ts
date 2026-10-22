// Bewusste Schritte ("Ich koche jetzt", "Gegessen ✓", Timer gestartet)
// wechseln die Phase sofort – sonst wechselt sie nur beim Öffnen/Zurückkehren
// oder nach 30 s ohne Berührung (nie unter dem Finger).

import { useExternalStore } from "@/lib/core/useExternalStore";

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
