"use client";

// Kachel-Knopf oben rechts = schnell etwas Neues ("+", "⇄", "✎"). Sichtbar
// 26 px hellorange mit dunkelorangem Zeichen, Tippfläche 44 × 44 px. Nie schwarz.

import { Plus, type LucideIcon } from "lucide-react";
import { PAGE_PLUS, TILE_PLUS_DOT } from "@/components/ui/styles";

export function QuickButton({ icon: Icon, label, onClick, className = "" }: { icon: LucideIcon; label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={label}
      className={`hit flex h-[26px] w-[26px] shrink-0 items-center justify-center active:scale-95 ${className}`}
    >
      <span className={TILE_PLUS_DOT}>
        <Icon className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden />
      </span>
    </button>
  );
}

/** Seiten-Plus: 34 px orange, rechts oben im Seitenkopf */
export function PagePlus({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className={PAGE_PLUS}>
      <Plus className="h-5 w-5" strokeWidth={2.75} aria-hidden />
    </button>
  );
}
