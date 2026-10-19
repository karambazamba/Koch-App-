import { FavoritesEditView } from "@/components/profile/AreaEditViews";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Lieblingsgerichte" };

function PageContent() {
  return <FavoritesEditView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="kochstil">
      <PageContent />
    </FeatureGate>
  );
}
