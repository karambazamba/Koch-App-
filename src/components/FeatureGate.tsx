"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CARD } from "@/components/ui/styles";
import { useBausteine, useLegacyFeatures, featureOn, type Feature } from "@/lib/core/features";
import { expectReplace } from "@/lib/core/navigation";

/**
 * Seiten eines Bausteins: Ist er aus, geht's zur Startseite (Daten bleiben).
 * Mehrere Bausteine = einer davon reicht (z. B. Rezepte oder Backen).
 */
export function FeatureGate({ feature, children }: { feature: Feature | Feature[]; children: ReactNode }) {
  const list = useBausteine();
  const dev = useLegacyFeatures();
  const on = list === undefined || dev === undefined ? undefined : (Array.isArray(feature) ? feature : [feature]).some((f) => featureOn(f));
  const router = useRouter();
  useEffect(() => {
    if (on !== false) return;
    expectReplace();
    router.replace("/");
  }, [on, router]);
  if (!on) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  return <>{children}</>;
}
