import { PantryView } from "@/components/pantry/PantryView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Vorrat" };

function VorratPageContent() {
  return <PantryView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function VorratPage() {
  return (
    <FeatureGate feature="vorrat">
      <VorratPageContent />
    </FeatureGate>
  );
}
