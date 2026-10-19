import { IdeasView } from "@/components/ideas/IdeasView";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Ideen" };

function PageContent() {
  return <IdeasView />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="ideen">
      <PageContent />
    </FeatureGate>
  );
}
