import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { PlanningGate } from "@/components/PlanningGate";
import { WeekPlanView } from "@/components/plan/WeekPlanView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Wochenplan" };

function WochenplanPageContent() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <PlanningGate>
        <WeekPlanView />
      </PlanningGate>
    </Suspense>
  );
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function WochenplanPage() {
  return (
    <FeatureGate feature="wochenplan">
      <WochenplanPageContent />
    </FeatureGate>
  );
}
