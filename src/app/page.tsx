import { Suspense } from "react";
import { HomeView } from "@/components/heute/HomeView";

export default function Home() {
  return (
    // Die Seite (?seite=kalender|essen) kommt aus der Adresse – useSearchParams braucht eine Suspense-Grenze
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
