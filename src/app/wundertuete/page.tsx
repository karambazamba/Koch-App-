import { Suspense } from "react";
import { WundertueteSeite } from "@/components/wundertuete/WundertueteSeite";

export const metadata = { title: "Wundertüte" };

// `?sorte=raetsel` (Mia: „Gib mir ein Rätsel“, A-064) liest die Seite im Browser – daher die Suspense-Grenze
export default function Page() {
  return (
    <Suspense>
      <WundertueteSeite />
    </Suspense>
  );
}
