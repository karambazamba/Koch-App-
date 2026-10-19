import { FoodHubView } from "@/components/profile/settings/Hubs";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Essen & Vorlieben" };

function PageContent() {
  return <FoodHubView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
