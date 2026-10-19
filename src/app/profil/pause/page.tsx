import { PauseEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Pause" };

function PageContent() {
  return <PauseEditView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="modi">
      <PageContent />
    </FeatureGate>
  );
}
