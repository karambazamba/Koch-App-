import { CookbookList } from "@/components/cookbook/CookbookList";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Unsere Rezepte" };

function CookbookPageContent() {
  return <CookbookList />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function CookbookPage() {
  return (
    <FeatureGate feature="rezepte">
      <CookbookPageContent />
    </FeatureGate>
  );
}
