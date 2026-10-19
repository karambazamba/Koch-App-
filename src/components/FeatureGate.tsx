"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { CARD } from "@/components/ui/styles";
import { useFeature, type Feature } from "@/lib/core/features";
import { expectReplace } from "@/lib/core/navigation";

/**
 * Versteckte (alte) Seiten: Ohne "Alte Funktionen anzeigen (Test)" geht's
 * zur Startseite. Die Seite und ihre Daten bleiben unverändert erhalten.
 */
export function FeatureGate({ feature, children }: { feature: Feature; children: ReactNode }) {
  const on = useFeature(feature);
  const router = useRouter();
  useEffect(() => {
    if (on !== false) return;
    expectReplace();
    router.replace("/");
  }, [on, router]);
  if (!on) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  return <>{children}</>;
}
