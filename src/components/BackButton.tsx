"use client";

import { useSyncExternalStore } from "react";
import { ChevronLeft } from "lucide-react";
import { previousUrl, subscribeNavigation } from "@/lib/core/navigation";
import { pageLabel } from "@/lib/core/pageLabel";
import { useGoBack } from "@/lib/core/useGoBack";

/**
 * Zurück: "‹ <vorherige Seite>" – genau eine Ebene zurück (wie die Geste),
 * ohne Verlauf in der App zu `fallback`.
 */
export function BackButton({ fallback }: { fallback: string }) {
  const goBack = useGoBack();
  const prev = useSyncExternalStore(subscribeNavigation, previousUrl, () => null);
  const label = pageLabel(prev ?? fallback);
  return (
    <a
      href={fallback}
      onClick={(e) => {
        e.preventDefault();
        goBack(fallback);
      }}
      aria-label={`Zurück: ${label}`}
      className="-ml-2 flex h-11 min-w-0 items-center gap-0.5 pr-2 text-[17px] font-semibold text-accent-strong transition active:opacity-60"
    >
      <ChevronLeft className="h-6 w-6 shrink-0" strokeWidth={2.5} aria-hidden />
      <span className="truncate">{label}</span>
    </a>
  );
}
