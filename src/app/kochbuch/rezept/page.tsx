import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { RecipeView } from "@/components/cookbook/RecipeView";

export const metadata = { title: "Rezept" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <RecipeView />
    </Suspense>
  );
}
