import { NeverAgainView } from "@/components/profile/NeverAgainView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Nie wieder" };

function PageContent() {
  return <NeverAgainView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
