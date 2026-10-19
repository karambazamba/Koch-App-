"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { ICON_BUTTON } from "@/components/ui/styles";

/** Fenster, das von unten hereinkommt (z. B. Aktionen zu einem Eintrag). */
export function Sheet({
  title,
  onClose,
  children,
  above = false,
  header,
  tall = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Über dem Küchenhelfer-Panel öffnen */
  above?: boolean;
  /** Eigener Kopf statt Titel + ✕ (z. B. "✎ Kladde" mit "Fertig") */
  header?: ReactNode;
  /** Feste Höhe (ca. 85 %) statt nach Inhalt */
  tall?: boolean;
}) {
  // Am Kopf nach unten ziehen schließt
  const drag = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
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
    <div className={`fixed inset-0 flex items-end justify-center ${above ? "z-50" : "z-30"}`} role="dialog" aria-modal aria-label={title}>
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="absolute inset-0 bg-black/25"
      />
      <div
        className={`safe-bottom relative flex w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-t-3xl bg-background px-4 pt-2 shadow-sheet ${tall ? "h-[85vh]" : "max-h-[85vh]"}`}
        style={dy ? { transform: `translateY(${dy}px)` } : undefined}
      >
        <div
          className="flex touch-none flex-col gap-2"
          data-no-swipe
          onPointerDown={(e) => {
            if ((e.target as Element).closest("button, input, textarea")) return;
            drag.current = e.clientY;
          }}
          onPointerMove={(e) => drag.current !== null && setDy(Math.max(0, e.clientY - drag.current))}
          onPointerUp={() => {
            if (drag.current !== null && dy > 80) onClose();
            drag.current = null;
            setDy(0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setDy(0);
          }}
        >
          <span className="mx-auto h-1 w-10 rounded-full bg-stone-300" aria-hidden />
          {header ?? (
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-tight">{title}</h2>
              <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
                <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
              </button>
            </div>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
