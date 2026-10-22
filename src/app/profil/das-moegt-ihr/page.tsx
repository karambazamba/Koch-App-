import { LikesEditView } from "@/components/einstellungen/AreaEditViews";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Das mögt ihr" };

function PageContent() {
  return <LikesEditView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
