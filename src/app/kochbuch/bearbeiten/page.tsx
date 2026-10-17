import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { RecipeEditor } from "@/components/cookbook/RecipeEditor";

export const metadata = { title: "Rezept bearbeiten" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <RecipeEditor />
    </Suspense>
  );
}
