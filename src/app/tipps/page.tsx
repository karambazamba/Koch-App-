import { Suspense } from "react";
import { TipsView } from "@/components/tipps/TipsView";

export const metadata = { title: "Tipps" };

export default function Page() {
  return (
    <Suspense fallback={null}>
      <TipsView />
    </Suspense>
  );
}
