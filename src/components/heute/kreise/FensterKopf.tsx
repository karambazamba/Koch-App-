"use client";

// Kopf der Kreis-Fenster (A-050, Tafel 137): rundes Symbol in der Farbe des
// Kreises, Titel fett, Unterzeile grau, rechts ✕. Das Fenster selbst ist das
// eine `ui/Sheet` (✕, Runterwischen, Danebentippen, Zurück schließen).

import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { ICON_BUTTON } from "@/components/ui/styles";

export function FensterKopf({ icon: Icon, tone, titel, unter, onClose }: { icon: LucideIcon; tone: string; titel: string; unter: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-3" data-fenster-kopf>
      <span data-tone={tone} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tile text-tile-accent" aria-hidden>
        <Icon className="h-[22px] w-[22px]" strokeWidth={2} />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-extrabold leading-tight tracking-tight">{titel}</h2>
        <p className="text-[14px] leading-snug text-muted">{unter}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}
