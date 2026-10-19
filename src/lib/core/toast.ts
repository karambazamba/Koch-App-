"use client";

// Kurze Meldung oben mit "Rückgängig" – nur bei echtem Löschen ("Gelöscht ·
// Rückgängig", 3 Sekunden, dezent: `showDeleted`). Hinzufügen, Abhaken,
// Übernehmen, Sortieren melden sich still (Animation, Vibration). Überlebt
// einen Seitenwechsel.

import { useExternalStore } from "./useExternalStore";

export type Toast = { id: number; text: string; undo?: () => void; undoneText?: string; seconds?: number; small?: boolean };

export const TOAST_SECONDS = 6;

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(toast: Omit<Toast, "id">) {
  current = { ...toast, id: Date.now() };
  if (timer) clearTimeout(timer);
  timer = setTimeout(hideToast, (toast.seconds ?? TOAST_SECONDS) * 1000);
  emit();
}

/** Nach echtem Löschen: kleine Meldung "Gelöscht · Rückgängig" für 3 Sekunden */
export function showDeleted(undo: () => void, text = "Gelöscht") {
  showToast({ text, undo, undoneText: "Wiederhergestellt", seconds: 3, small: true });
}

export function hideToast() {
  current = null;
  emit();
}

export function useToast(): Toast | null {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}
