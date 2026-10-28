"use client";

// Lange drücken (500 ms) auf eine Zeile – Bewegung über 10 px bricht ab, der
// Klick danach zählt nicht. Liefert die Zeiger-Griffe für einen Knopf und
// `geklickt()`: false, wenn der Klick zum langen Drücken gehörte.

import { useRef } from "react";

const HALTEN_MS = 500;

export function useLangDruecken(onLang: (() => void) | null) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null);
  const clear = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    if (press.current) press.current.timer = null;
  };
  const griffe = onLang
    ? {
        onPointerDown: (e: { clientX: number; clientY: number }) => {
          const timer = setTimeout(() => {
            if (press.current) press.current.fired = true;
            onLang();
          }, HALTEN_MS);
          press.current = { x: e.clientX, y: e.clientY, timer, fired: false };
        },
        onPointerMove: (e: { clientX: number; clientY: number }) => {
          const p = press.current;
          if (p?.timer && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) clear();
        },
        onPointerUp: clear,
        onPointerCancel: clear,
        onContextMenu: (e: { preventDefault: () => void }) => e.preventDefault(),
      }
    : {};
  /** Normaler Klick? (nach langem Drücken: nein) */
  const geklickt = () => {
    const fired = press.current?.fired ?? false;
    press.current = null;
    return !fired;
  };
  return { griffe, geklickt };
}
