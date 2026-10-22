import { Suspense } from "react";
import { ShopMode } from "@/components/einkauf/ShopMode";

export const metadata = { title: "Einkaufen" };

export default function EinkaufsmodusPage() {
  // Der Laden kommt aus der Adresse (?name=REWE) – useSearchParams braucht eine Suspense-Grenze
  return (
    <Suspense fallback={null}>
      <ShopMode />
    </Suspense>
  );
}
