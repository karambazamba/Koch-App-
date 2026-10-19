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
      className={`fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] mx-auto flex items-center overflow-hidden bg-ink text-background shadow-lg ${toast.small ? "w-fit max-w-[calc(100%-2rem)] gap-2 rounded-full py-1.5 pl-4 pr-1.5 text-sm" : "w-[calc(100%-2rem)] max-w-md gap-3 rounded-2xl px-4 py-3"}`}
    >
      <span className={toast.small ? "font-semibold" : "flex-1 font-semibold"}>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo?.();
            showToast({ text: toast.undoneText ?? "Rückgängig gemacht – alles wie vorher.", seconds: toast.small ? 2 : undefined, small: toast.small });
          }}
          className={`inline-flex items-center gap-1.5 bg-background/15 font-bold ${toast.small ? "h-9 rounded-full px-3" : "h-10 rounded-xl px-3"}`}
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
        style={{ animation: `shrink ${toast.seconds ?? TOAST_SECONDS}s linear forwards` }}
        aria-hidden
      />
    </div>
  );
}
