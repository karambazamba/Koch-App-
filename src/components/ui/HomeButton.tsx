"use client";

// Haus-Knopf im Seitenkopf (Auftrag „Navigation: immer zur Startseite“): auf
// Seiten mehr als eine Ebene unter Heute direkt zurück zur Startseite – im
// Verlauf zurück (dort bleibt die Scrollhöhe), sonst neu auf Heute.

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { House } from "lucide-react";
import { expectReplace, previousUrl, resetNavigation, stepsToHome, subscribeNavigation } from "@/lib/core/navigation";
import { istHeute } from "@/lib/core/heimkehr";

export function HomeButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const prev = useSyncExternalStore(subscribeNavigation, previousUrl, () => null);
  // Eine Ebene unter Heute (vorher Heute): „‹ Heute“ reicht
  if (istHeute(prev ?? fallback)) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const steps = stepsToHome(istHeute);
        if (steps) return window.history.go(-steps);
        resetNavigation();
        expectReplace();
        router.replace("/");
      }}
      aria-label="Zur Startseite"
      className="-ml-1 flex h-11 w-11 shrink-0 items-center justify-center text-accent-strong active:opacity-60"
      data-haus
    >
      <House className="h-[22px] w-[22px]" strokeWidth={2.25} aria-hidden />
    </button>
  );
}
