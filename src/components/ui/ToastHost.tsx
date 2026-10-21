"use client";

import { Check } from "lucide-react";
import { TOAST_SECONDS, hideToast, showToast, useToast } from "@/lib/core/toast";

/** Meldung mit "Rückgängig": weiße Karte, grüner Haken, "Rückgängig" dunkelorange (oben, über allem; siehe lib/core/toast.ts) */
export function ToastHost() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] mx-auto flex items-center overflow-hidden border border-line bg-surface text-ink shadow-sheet ${toast.small ? "w-fit max-w-[calc(100%-2rem)] gap-2 rounded-full py-1.5 pl-2 pr-1.5 text-sm" : "w-[calc(100%-2rem)] max-w-md gap-3 rounded-card px-4 py-3"}`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-good-soft text-good-ink" aria-hidden>
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
      <span className={toast.small ? "font-semibold" : "flex-1 font-semibold"}>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            showToast({ text: toast.undoneText ?? "Rückgängig gemacht – alles wie vorher.", seconds: toast.small ? 2 : undefined, small: toast.small });
          }}
          className={`hit inline-flex items-center font-extrabold text-accent-strong ${toast.small ? "h-9 px-3" : "h-10 px-2"}`}
        >
          Rückgängig
        </button>
      )}
      {!toast.undo && (
        <button type="button" onClick={hideToast} className="sr-only">
          Schließen
        </button>
      )}
      <span
        key={toast.id}
        className="absolute bottom-0 left-0 h-1 w-full origin-left bg-accent"
        style={{ animation: `shrink ${toast.seconds ?? TOAST_SECONDS}s linear forwards` }}
        aria-hidden
      />
    </div>
  );
}
