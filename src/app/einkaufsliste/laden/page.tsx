import { Suspense } from "react";
import { LadenSeite } from "@/components/einkauf/LadenSeite";

export const metadata = { title: "Laden" };

export default function LadenPage() {
  // Der Laden kommt aus der Adresse (?name=Rewe) – useSearchParams braucht eine Suspense-Grenze
  return (
    <Suspense fallback={null}>
      <LadenSeite />
    </Suspense>
  );
}
