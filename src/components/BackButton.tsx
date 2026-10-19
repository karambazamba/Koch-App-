"use client";

import { ChevronLeft } from "lucide-react";
import { ICON_BUTTON } from "@/components/ui/styles";
import { useGoBack } from "@/lib/core/useGoBack";

/** Zurück-Pfeil: genau eine Ebene zurück (wie die Geste), sonst `fallback` */
export function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack();
  return (
    <a
      href={fallback}
      onClick={(e) => {
        e.preventDefault();
        goBack(fallback);
      }}
      aria-label="Zurück"
      className={ICON_BUTTON}
    >
      <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
    </a>
  );
}
