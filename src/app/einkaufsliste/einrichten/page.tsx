import { Suspense } from "react";
import { EinrichtenSeite } from "@/components/einkauf/einrichten/EinrichtenSeite";

export const metadata = { title: "Läden einrichten" };

export default function EinrichtenPage() {
  // ?nur=was-wo = nur „Meine Läden & was wo“ – useSearchParams braucht eine Suspense-Grenze
  return (
    <Suspense fallback={null}>
      <EinrichtenSeite />
    </Suspense>
  );
}
