// Kleine Feier – nur bei echten Meilensteinen (Wochenziel Sport): eine
// Pokal-Karte für 2 Sekunden, Antippen schließt. Nicht bei jedem Abhaken.

import { triggerAvatar } from "@/lib/core/avatarState";
import { useExternalStore } from "@/lib/core/useExternalStore";

type Celebration = { id: number; text: string };

let current: Celebration | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function celebrate(text: string) {
  current = { id: Date.now(), text };
  triggerAvatar("freuen");
  emit();
}

export function endCelebration() {
  current = null;
  emit();
}

export function useCelebration(): Celebration | null {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
