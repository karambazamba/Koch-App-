"use client";

// Weiße Pille oben links auf einer Bild-Kachel (Tafel 133): „Was anderes?“,
// „Idee für morgen“ – überall dieselbe, 30 px hoch, 12 px fett, Tippfläche
// 44 px (`hit`). Nie ein oranger Kreis (der sähe aus wie ein zweiter
// Mia-Knopf), Text nie gekürzt.

import type { LucideIcon } from "lucide-react";

const KACHEL_PILLE = "inline-flex h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full bg-on-color px-3 text-[12px] font-extrabold text-on-photo-ink shadow-float";

export function KachelPille({ label, icon: Icon, aria, onClick, className = "" }: { label: string; icon?: LucideIcon; aria: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-label={aria}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`hit absolute left-2.5 top-2.5 z-10 flex items-center active:scale-95 ${className}`}
      data-kachel-pille
    >
      <span className={KACHEL_PILLE}>
        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />}
        {label}
      </span>
    </button>
  );
}
