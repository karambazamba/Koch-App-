import { Suspense } from "react";
import { CookMode } from "@/components/essen/rezepte/CookMode";

export const metadata = { title: "Schritt für Schritt" };

function PageContent() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className="fixed inset-0 z-40 bg-cook" />}>
      <CookMode />
    </Suspense>
  );
}

// Immer sichtbar: "Rezept ansehen" auf der Essen-Seite führt hierher
export default function Page() {
  return <PageContent />;
}
