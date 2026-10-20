"use client";

import { expectReplace } from "@/lib/core/navigation";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { openHelper } from "@/lib/lotte/open";

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
    // Der Chat lebt im Layout; hört er beim ersten Laden noch nicht zu,
    // wartet die Bitte, bis er da ist (openHelper)
    openHelper("spontan");
  }, [router]);
  return null;
}
