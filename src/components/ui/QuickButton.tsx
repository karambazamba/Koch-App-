"use client";

// Kleiner runder Knopf oben rechts an einer Kachel = schnell etwas Neues
// ("+", "⇄", "✎"). Sichtbar 20 px, hell-orange mit kräftigem Zeichen (Kladde
// gelblich), Tippfläche trotzdem 44 × 44 px. Nie schwarz.

import type { LucideIcon } from "lucide-react";
import { quickDot } from "./styles";

export function QuickButton({ icon: Icon, label, onClick, tone = "quick", className = "" }: { icon: LucideIcon; label: string; onClick: () => void; tone?: "quick" | "kladde"; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`-m-3 flex h-11 w-11 shrink-0 items-center justify-center active:scale-95 ${className}`}
    >
      <span className={quickDot(tone)}>
        <Icon className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
    </button>
  );
}
