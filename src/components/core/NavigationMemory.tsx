"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { expectReplace, installNavigationMemory, onRouteChange, resetNavigation } from "@/lib/core/navigation";
import { HEIM_MS, merkeWeg, vergissWeg, wegSeit, zurStartseite } from "@/lib/core/heimkehr";
import { closeHelper } from "@/lib/begleitung/open";
import { now } from "@/lib/core/now";

/**
 * Merkt sich den Verlauf und die Scrollhöhe je Ebene (siehe lib/core/navigation.ts).
 * Öffnen = Startseite: nach mehr als 5 Minuten weg (Kaltstart oder aus dem
 * Hintergrund) geht es zurück auf Heute (`core/heimkehr.ts`).
 */
export function NavigationMemory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const router = useRouter();
  useEffect(() => {
    installNavigationMemory();
    const heim = () => {
      const url = `${window.location.pathname}${window.location.search}`;
      const weg = wegSeit();
      vergissWeg();
      // Lange weg: Mia-Bühne zu (der Kochmodus bleibt, siehe heimkehr.ts)
      if (weg !== null && now().getTime() - weg > HEIM_MS) closeHelper();
      if (!zurStartseite(url, weg, now().getTime())) return;
      resetNavigation();
      expectReplace();
      router.replace("/");
    };
    const onVisibility = () => (document.visibilityState === "hidden" ? merkeWeg() : heim());
    heim();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", merkeWeg);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", merkeWeg);
    };
  }, [router]);
  useEffect(() => {
    installNavigationMemory();
    onRouteChange(`${pathname}${search ? `?${search}` : ""}`);
  }, [pathname, search]);
  return null;
}
