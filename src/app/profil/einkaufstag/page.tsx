import { PlanningGate } from "@/components/core/PlanningGate";
import { ShoppingDayEditView } from "@/components/einstellungen/AreaEditViews";

export const metadata = { title: "Einkaufstag" };

export default function Page() {
  return (
    <PlanningGate fallback="/profil">
      <ShoppingDayEditView />
    </PlanningGate>
  );
}
