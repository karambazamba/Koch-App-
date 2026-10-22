import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { RecipeView } from "@/components/essen/rezepte/RecipeView";

export const metadata = { title: "Rezept" };

function PageContent() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <RecipeView />
    </Suspense>
  );
}

// Immer sichtbar: "Rezept ansehen" auf der Essen-Seite führt hierher
export default function Page() {
  return <PageContent />;
}
