import { HealthTipsEditView } from "@/components/einstellungen/AreaEditViews";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Gesundheits-Tipps" };

function PageContent() {
  return <HealthTipsEditView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="tipps">
      <PageContent />
    </FeatureGate>
  );
}
