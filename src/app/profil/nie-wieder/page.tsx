import { NeverAgainView } from "@/components/einstellungen/NeverAgainView";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Nie wieder" };

function PageContent() {
  return <NeverAgainView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
