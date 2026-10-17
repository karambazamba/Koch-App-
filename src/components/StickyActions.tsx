"use client";

import type { ReactNode } from "react";
import { useMobileKeyboard } from "@/lib/useMobileKeyboard";

export const SECONDARY_BUTTON =
  "flex h-16 flex-1 items-center justify-center rounded-2xl bg-white text-lg font-bold text-stone-700 shadow-sm active:scale-95";
export const PRIMARY_BUTTON =
  "h-16 flex-[2] rounded-2xl bg-orange-500 text-lg font-extrabold text-white shadow-md active:scale-95 disabled:opacity-40";

/**
 * Fixierte Button-Leiste am unteren Rand. Bei offener Tastatur ausgeblendet –
 * sonst schiebt iOS die Leiste über das Formular. "invisible" statt "hidden",
 * damit sich die Seitenhöhe nicht ändert und nichts springt.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  const keyboardOpen = useMobileKeyboard();
  return (
    <nav
      aria-hidden={keyboardOpen}
      className={`safe-bottom sticky bottom-0 flex gap-3 bg-background/95 px-4 pt-3 backdrop-blur ${keyboardOpen ? "pointer-events-none invisible" : ""}`}
    >
      {children}
    </nav>
  );
}
