import { KuehlCheck } from "@/components/vorrat/KuehlCheck";
import { FeatureGate } from "@/components/core/FeatureGate";

export const metadata = { title: "Kurz-Check" };

function KuehlCheckPageContent() {
  return <KuehlCheck />;
}

// Kurz-Check „Im Haus“: sichtbar, wenn der Baustein „Im Haus“ an ist
export default function KuehlCheckPage() {
  return (
    <FeatureGate feature="vorrat">
      <KuehlCheckPageContent />
    </FeatureGate>
  );
}
