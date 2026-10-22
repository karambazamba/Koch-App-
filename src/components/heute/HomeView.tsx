"use client";

import { CARD } from "@/components/ui/styles";
import { useHomeData } from "@/components/heute/useHomeData";
import { HelloScreen } from "@/components/begleitung/HelloScreen";
import { helloWasShown } from "@/lib/core/hello";
import dynamic from "next/dynamic";

// Die drei Seiten kommen in einem eigenen Teil: Der Hallo-Bildschirm (erster
// Start) erscheint so ohne den ganzen Startseiten-Code. Geladen wird sofort
// parallel, damit es mit Profil nicht später kommt.
const loadPager = () => import("@/components/heute/HomePager").then((m) => m.HomePager);
if (typeof window !== "undefined") void loadPager();
const HomePager = dynamic(loadPager, { ssr: false, loading: () => <Skeleton /> });

function Skeleton() {
  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
      <div className={`${CARD} h-52 animate-pulse`} />
    </main>
  );
}

/**
 * Startseite: drei Seiten Woche · Heute · Essen (HomePager) mit der
 * Lotte-Leiste unten; ohne Profil zuerst der Hallo-Bildschirm.
 */
export function HomeView() {
  const data = useHomeData();
  // Einmal Hallo, immer Hallo – bis es ein Profil gibt. Kurzes "lädt noch" beim
  // Laden der gespeicherten Daten baut den Hallo-Bildschirm sonst neu auf (Flackern).
  if (helloWasShown() && !data) return <HelloScreen />;
  if (data === undefined) return <Skeleton />;
  if (data === null) return <HelloScreen />;
  return <HomePager data={data} />;
}
