"use client";

// Gastgeber fürs Durchatmen (A-051) – im Layout über den KitchenHelper: hört auf
// `oeffneDurchatmen()` / `starteDurchatmen()` und lädt Fenster bzw. Vollbild
// erst bei Bedarf (das Layout lädt sonst nichts davon).

import dynamic from "next/dynamic";
import type { AssistantData } from "@/lib/begleitung/ops";
import { beendeDurchatmen, schliesseDurchatmen, useDurchatmenZustand } from "@/lib/durchatmen/oeffnen";
import { useFeature } from "@/lib/core/features";

const DurchatmenFenster = dynamic(() => import("@/components/durchatmen/DurchatmenFenster").then((m) => m.DurchatmenFenster), { ssr: false });
const UebungVollbild = dynamic(() => import("@/components/durchatmen/UebungVollbild").then((m) => m.UebungVollbild), { ssr: false });

export function DurchatmenHost({ data }: { data: AssistantData | null | undefined }) {
  const z = useDurchatmenZustand();
  const an = useFeature("durchatmen");
  return (
    <>
      {z.fenster && an !== false && <DurchatmenFenster onClose={schliesseDurchatmen} />}
      {z.uebung && <UebungVollbild key={z.start} id={z.uebung} data={data ?? null} onClose={beendeDurchatmen} />}
    </>
  );
}
