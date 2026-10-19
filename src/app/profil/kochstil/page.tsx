import { CookingStyleEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "So kocht ihr" };

function PageContent() {
  return <CookingStyleEditView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
