import { PlanningGate } from "@/components/PlanningGate";
import { ShoppingDayEditView } from "@/components/profile/AreaEditViews";

export const metadata = { title: "Einkaufstag" };

export default function Page() {
  return (
    <PlanningGate fallback="/profil">
      <ShoppingDayEditView />
    </PlanningGate>
  );
}
