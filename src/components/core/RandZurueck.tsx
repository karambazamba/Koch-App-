"use client";

// Wischen vom linken Rand auf Unterseiten = eine Ebene zurück (wie der
// Pfeil „‹ …“). Nicht auf den Hauptseiten (dort wechselt Wischen den
// Bereich), nicht in Fenstern und Feldern. Entscheidung rein in `core/leiste`.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { randZurueck, RAND_PX } from "@/lib/core/leiste";
import { useGoBack } from "@/lib/core/useGoBack";

export function RandZurueck() {
  const pathname = usePathname();
  const goBack = useGoBack();
  useEffect(() => {
    if (pathname === "/") return;
    let start: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      const ziel = e.target instanceof Element ? e.target : null;
      start = t && t.clientX <= RAND_PX && !ziel?.closest("[role=dialog], [role=alertdialog], input, textarea, [contenteditable], [data-no-swipe]") ? { x: t.clientX, y: t.clientY } : null;
    };
    const up = (e: TouchEvent) => {
      const t = e.changedTouches[0];
      if (start && t && randZurueck(start.x, t.clientX - start.x, t.clientY - start.y)) goBack("/");
      start = null;
    };
    document.addEventListener("touchstart", down, { passive: true });
    document.addEventListener("touchend", up, { passive: true });
    return () => {
      document.removeEventListener("touchstart", down);
      document.removeEventListener("touchend", up);
    };
  }, [pathname, goBack]);
  return null;
}
