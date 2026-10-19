import { WeekendEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Wochenende" };

function PageContent() {
  return <WeekendEditView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
