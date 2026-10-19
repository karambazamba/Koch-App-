import { PlanningGate } from "@/components/PlanningGate";
import { StandardWeekEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Standardwoche" };

function PageContent() {
  return (
    <PlanningGate fallback="/profil">
      <StandardWeekEditView />
    </PlanningGate>
  );
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="wochenplan">
      <PageContent />
    </FeatureGate>
  );
}
