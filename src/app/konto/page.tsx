import { Suspense } from "react";
import { KontoView } from "@/components/konten/KontoView";
import { CARD } from "@/components/ui/styles";

export const metadata = { title: "Familie verbinden" };

export default function Page() {
  return (
    // useSearchParams braucht eine Suspense-Grenze, damit die Seite statisch bleibt.
    <Suspense fallback={<div className={`${CARD} m-4 h-64 animate-pulse`} />}>
      <KontoView />
    </Suspense>
  );
}
