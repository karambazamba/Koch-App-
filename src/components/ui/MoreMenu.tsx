"use client";

// "…" rechts im Seitenkopf: seltene Aktionen in einem Fenster (Zeilen mit
// Icon), z. B. Vorlage, Teilen, Bearbeiten, Löschen (rot).

import { useState } from "react";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST } from "@/components/ui/styles";

export type MoreItem = { label: string; icon: LucideIcon; onClick: () => void; danger?: boolean; disabled?: boolean };

export function MoreMenu({ title, items, label = "Mehr", light = false }: { title: string; items: MoreItem[]; label?: string; light?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={`hit flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full active:scale-95 ${light ? "bg-surface/90 text-ink shadow-card" : "bg-fill text-ink"}`}>
        <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className={`${CARD_LIST} mb-3`}>
            {items.map(({ label: l, icon: Icon, onClick, danger, disabled }) => (
              <button
                key={l}
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false);
                  onClick();
                }}
                className={`flex h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold active:bg-fill disabled:opacity-40 ${danger ? "text-danger" : ""}`}
              >
                <Icon className={`h-5 w-5 ${danger ? "" : "text-accent"}`} strokeWidth={2} aria-hidden />
                {l}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </>
  );
}
