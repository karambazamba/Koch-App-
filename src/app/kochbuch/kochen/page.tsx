import { Suspense } from "react";
import { CARD } from "@/components/ui/styles";
import { CookMode } from "@/components/cookbook/CookMode";

export const metadata = { title: "Schritt für Schritt" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <CookMode />
    </Suspense>
  );
}
