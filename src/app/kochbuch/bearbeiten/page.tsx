import { Suspense } from "react";
import { RecipeEditor } from "@/components/cookbook/RecipeEditor";

export const metadata = { title: "Rezept bearbeiten" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className="m-4 h-64 animate-pulse rounded-3xl bg-white/70" />}>
      <RecipeEditor />
    </Suspense>
  );
}
