import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { CookMode } from "@/components/essen/rezepte/CookMode";

export const metadata = { title: "Schritt für Schritt" };

function PageContent() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <CookMode />
    </Suspense>
  );
}

// Immer sichtbar: "Rezept ansehen" auf der Essen-Seite führt hierher
export default function Page() {
  return <PageContent />;
}
