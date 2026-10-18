import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { PlanningGate } from "@/components/PlanningGate";
import { WeekPlanView } from "@/components/plan/WeekPlanView";

export const metadata = { title: "Wochenplan" };

export default function WochenplanPage() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <PlanningGate>
        <WeekPlanView />
      </PlanningGate>
    </Suspense>
  );
}
