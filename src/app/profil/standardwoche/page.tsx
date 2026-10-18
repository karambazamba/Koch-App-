import { PlanningGate } from "@/components/PlanningGate";
import { StandardWeekEditView } from "@/components/profile/AreaEditViews";

export const metadata = { title: "Standardwoche" };

export default function Page() {
  return (
    <PlanningGate fallback="/profil">
      <StandardWeekEditView />
    </PlanningGate>
  );
}
