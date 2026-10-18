"use client";

import { expectReplace } from "@/lib/navigation";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { openHelper } from "@/lib/assistant/open";

/**
 * Frühere Seite "Was ist noch da?" (/schnellkueche): alte Links und
 * Lesezeichen führen zur Startseite mit Küchenhelfer im Spontan-Modus.
 */
export function SpontanRedirect() {
  const router = useRouter();
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    expectReplace();
    router.replace("/");
    // Der Küchenhelfer lebt im Layout und bleibt beim Seitenwechsel offen;
    // kurz warten, bis er beim ersten Laden zuhört (nicht abbrechen – die
    // Seite selbst ist dann schon weg)
    setTimeout(() => openHelper("spontan"), 80);
  }, [router]);
  return null;
}
