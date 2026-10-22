"use client";

// Langes Drücken auf der Startseite (`TodayPage`) öffnet den Bearbeiten-Modus;
// normales Tippen und Wischen bleiben unberührt.

import { useRef } from "react";

/** Langes Drücken (500 ms) öffnet "Startseite bearbeiten"; normales Tippen und Wischen bleiben, wie sie sind */
export function Pressable({ children, onLongPress, disabled = false }: { children: React.ReactNode; onLongPress: () => void; disabled?: boolean }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <div
      className="select-none [-webkit-touch-callout:none]"
      onPointerDown={(e) => {
        fired.current = false;
        // Nicht im Bearbeiten-Modus, nicht in Eingabefeldern und Fenstern (Menü, Schnell-Eintrag …)
        if (disabled || (e.target as Element).closest("input, textarea, [role=dialog], [data-no-longpress]")) return;
        start.current = { x: e.clientX, y: e.clientY };
        cancel();
        timer.current = setTimeout(() => {
          fired.current = true;
          onLongPress();
        }, 500);
      }}
      onPointerMove={(e) => {
        if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 10) cancel();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => e.preventDefault()}
      onClickCapture={(e) => {
        // Nach langem Drücken kein zusätzliches Antippen auslösen
        if (fired.current) {
          e.preventDefault();
          e.stopPropagation();
          fired.current = false;
        }
      }}
    >
      {children}
    </div>
  );
}
