import { Suspense } from "react";
import { HomeView } from "@/components/home/HomeView";

export default function Home() {
  return (
    // Die Seite (?seite=woche|essen) kommt aus der Adresse – useSearchParams braucht eine Suspense-Grenze
    <Suspense fallback={null}>
      <HomeView />
    </Suspense>
  );
}
