import { FoodHubView } from "@/components/profile/settings/Hubs";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Essen & Vorlieben" };

function PageContent() {
  return <FoodHubView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
