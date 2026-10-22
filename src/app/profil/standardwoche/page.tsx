import { PlanningGate } from "@/components/core/PlanningGate";
import { StandardWeekEditView } from "@/components/einstellungen/AreaEditViews";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Standardwoche" };

function PageContent() {
  return (
    <PlanningGate fallback="/profil">
      <StandardWeekEditView />
    </PlanningGate>
  );
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="wochenplan">
      <PageContent />
    </FeatureGate>
  );
}
