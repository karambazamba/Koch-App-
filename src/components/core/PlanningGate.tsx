"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CARD } from "@/components/ui/styles";
import { expectReplace } from "@/lib/core/navigation";
import { usePlanStyle } from "@/lib/essen/usePlanStyle";

/**
 * Planungs-Seiten (Wochenplan, Wochen-Check, Wochenvorlage, Einkaufstag) gibt
 * es bei "Ich koche spontan" nicht – sie leiten weiter. Die Daten bleiben
 * gespeichert und sind beim Zurückwechseln wieder da.
 */
export function PlanningGate({ children, fallback = "/?seite=essen" }: { children: ReactNode; fallback?: string }) {
  const plan = usePlanStyle();
  const router = useRouter();
  const hidden = plan !== undefined && !plan.planning;
  useEffect(() => {
    if (!hidden) return;
    expectReplace();
    router.replace(fallback);
  }, [hidden, fallback, router]);
  if (plan === undefined || hidden) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  return <>{children}</>;
}
