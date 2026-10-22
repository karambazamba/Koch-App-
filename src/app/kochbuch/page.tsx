import { CookbookList } from "@/components/essen/rezepte/CookbookList";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Unsere Rezepte" };

function CookbookPageContent() {
  return <CookbookList />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function CookbookPage() {
  return (
    <FeatureGate feature={["rezepte", "backen"]}>
      <CookbookPageContent />
    </FeatureGate>
  );
}
