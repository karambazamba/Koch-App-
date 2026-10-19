import { SpontanRedirect } from "@/components/pantry/SpontanRedirect";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Spontan kochen" };

// Früher "Was ist noch da?" – geht jetzt im Spontan-Modus auf
function SchnellkuechePageContent() {
  return <SpontanRedirect />;
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function SchnellkuechePage() {
  return (
    <FeatureGate feature="spontan">
      <SchnellkuechePageContent />
    </FeatureGate>
  );
}
