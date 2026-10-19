import { CookbookList } from "@/components/cookbook/CookbookList";
import { FeatureGate } from "@/components/FeatureGate";

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
