import { DisplayView } from "@/components/profile/settings/Hubs";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Darstellung" };

function PageContent() {
  return <DisplayView />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function Page() {
  return (
    <FeatureGate feature="modi">
      <PageContent />
    </FeatureGate>
  );
}
