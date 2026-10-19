"use client";

import { Undo2 } from "lucide-react";
import { TOAST_SECONDS, hideToast, showToast, useToast } from "@/lib/core/toast";

/** Meldung mit "Rückgängig" (oben, über allem; siehe lib/core/toast.ts) */
export function ToastHost() {
  const toast = useToast();
  if (!toast) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 overflow-hidden rounded-2xl bg-ink px-4 py-3 text-background shadow-lg"
    >
      <span className="flex-1 font-semibold">{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            showToast({ text: toast.undoneText ?? "Rückgängig gemacht – alles wie vorher." });
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-background/15 px-3 font-bold"
        >
          <Undo2 className="h-4 w-4" strokeWidth={2.5} aria-hidden />
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
        style={{ animation: `shrink ${TOAST_SECONDS}s linear forwards` }}
        aria-hidden
      />
    </div>
  );
}
