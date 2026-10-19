import { PantryView } from "@/components/pantry/PantryView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Vorrat" };

function VorratPageContent() {
  return <PantryView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function VorratPage() {
  return (
    <FeatureGate feature="vorrat">
      <VorratPageContent />
    </FeatureGate>
  );
}
