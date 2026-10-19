"use client";

import type { ReactNode } from "react";
import { buttonClass } from "@/components/ui/styles";
import { useMobileKeyboard } from "@/lib/core/useMobileKeyboard";

/** Zurück/Abbrechen in der Leiste (schmaler) */
export const SECONDARY_BUTTON = `${buttonClass("secondary", "lg")} flex-1`;
/** Hauptaktion in der Leiste (doppelt so breit) */
export const PRIMARY_BUTTON = `${buttonClass("primary", "lg")} flex-[2]`;

/**
 * Fixierte Button-Leiste am unteren Rand. Bei offener Tastatur ausgeblendet –
 * sonst schiebt iOS die Leiste über das Formular. "invisible" statt "hidden",
 * damit sich die Seitenhöhe nicht ändert und nichts springt.
 */
export function StickyActions({ children }: { children: ReactNode }) {
  const keyboardOpen = useMobileKeyboard();
  return (
    <nav
      data-sticky-actions
      aria-hidden={keyboardOpen}
      className={`safe-bottom sticky bottom-0 flex gap-3 border-t border-line bg-background/95 px-4 pt-3 backdrop-blur ${keyboardOpen ? "pointer-events-none invisible" : ""}`}
    >
      {children}
    </nav>
  );
}
