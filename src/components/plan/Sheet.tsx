"use client";

import { useEffect, type ReactNode } from "react";

/** Fenster, das von unten hereinkommt (z. B. Aktionen zu einem Eintrag). */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Escape schließt; Seite dahinter nicht mitscrollen
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center" role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/30"
      />
      <div className="safe-bottom relative flex max-h-[85vh] w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pt-4 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-2xl shadow-sm active:scale-95"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
