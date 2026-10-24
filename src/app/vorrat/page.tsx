import { PantryView } from "@/components/vorrat/PantryView";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Im Haus" };

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
