import { DisplayView } from "@/components/profile/settings/Hubs";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Darstellung" };

function PageContent() {
  return <DisplayView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="modi">
      <PageContent />
    </FeatureGate>
  );
}
