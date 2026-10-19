import { IdeasView } from "@/components/ideas/IdeasView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Ideen" };

function PageContent() {
  return <IdeasView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="ideen">
      <PageContent />
    </FeatureGate>
  );
}
