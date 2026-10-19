import { WeekendEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Wochenende" };

function PageContent() {
  return <WeekendEditView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
