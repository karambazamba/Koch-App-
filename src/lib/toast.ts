"use client";

// Kurze Meldung unten mit "Rückgängig" (z. B. nach dem Entfernen einer
// Person). Überlebt einen Seitenwechsel, verschwindet nach ein paar Sekunden.

import { useExternalStore } from "./useExternalStore";

export type Toast = { id: number; text: string; undo?: () => void; undoneText?: string };

export const TOAST_SECONDS = 6;

let current: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function showToast(toast: Omit<Toast, "id">) {
  current = { ...toast, id: Date.now() };
  if (timer) clearTimeout(timer);
  timer = setTimeout(hideToast, TOAST_SECONDS * 1000);
  emit();
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
