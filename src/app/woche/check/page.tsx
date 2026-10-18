import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { PlanningGate } from "@/components/PlanningGate";
import { WeekCheck } from "@/components/week/WeekCheck";

export const metadata = { title: "Wochen-Check" };

export default function WeekCheckPage() {
  return (
    // useSearchParams (?woche=…) braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <PlanningGate>
        <WeekCheck />
      </PlanningGate>
    </Suspense>
  );
}
