import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { RecipeEditor } from "@/components/cookbook/RecipeEditor";
import { FeatureGate } from "@/components/FeatureGate";

export const metadata = { title: "Rezept bearbeiten" };

function PageContent() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <RecipeEditor />
    </Suspense>
  );
}

// Versteckt, bis "Alte Funktionen anzeigen (Test)" an ist
export default function Page() {
  return (
    <FeatureGate feature="rezepte">
      <PageContent />
    </FeatureGate>
  );
}
