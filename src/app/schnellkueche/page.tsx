import { SpontanRedirect } from "@/components/pantry/SpontanRedirect";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Spontan kochen" };

// Früher "Was ist noch da?" – geht jetzt im Spontan-Modus auf
function SchnellkuechePageContent() {
  return <SpontanRedirect />;
}

// Sichtbar, wenn der passende Baustein an ist (Einstellungen → Bausteine)
export default function SchnellkuechePage() {
  return (
    <FeatureGate feature="spontan">
      <SchnellkuechePageContent />
    </FeatureGate>
  );
}
