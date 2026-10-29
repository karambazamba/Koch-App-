"use client";

// "…" rechts im Seitenkopf: seltene Aktionen in einem Fenster (Zeilen mit
// Icon), z. B. Vorlage, Teilen, Bearbeiten, Löschen (rot). Zeilen, die auf
// eine andere Seite führen, haben `href`: erst schließt das Fenster samt
// Verlaufseintrag, dann geht es weiter – so öffnet „Einstellungen“ auch
// direkt nach dem Start beim ersten Tippen (A-059, `nachDemFenster`).

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST } from "@/components/ui/styles";
import { nachDemFenster } from "@/lib/core/useBackCloses";

/** `href` = Ziel-Seite (als Funktion, wenn vorher etwas passieren muss); sonst `onClick` */
export type MoreItem = { label: string; icon: LucideIcon; onClick?: () => void; href?: string | (() => string); danger?: boolean; disabled?: boolean };

export function MoreMenu({ title, items, label = "Mehr", light = false }: { title: string; items: MoreItem[]; label?: string; light?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  // Ziel einer Zeile mit `href`: erst nach dem Schließen (Verlaufseintrag des Fensters ist dann weg)
  const ziel = useRef<string | null>(null);
  useEffect(() => {
    if (open || !ziel.current) return;
    const href = ziel.current;
    ziel.current = null;
    nachDemFenster(() => router.push(href));
  }, [open, router]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label={label} className={`hit flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full active:scale-95 ${light ? "bg-surface/90 text-ink shadow-card" : "bg-fill text-ink"}`}>
        <MoreHorizontal className="h-5 w-5" strokeWidth={2.5} aria-hidden />
      </button>
      {open && (
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className={`${CARD_LIST} mb-3`}>
            {items.map(({ label: l, icon: Icon, onClick, href, danger, disabled }) => (
              <button
                key={l}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (href) ziel.current = typeof href === "function" ? href() : href;
                  setOpen(false);
                  onClick?.();
                }}
                className={`flex h-14 w-full items-center gap-3 px-4 text-left text-base font-semibold active:bg-fill disabled:opacity-40 ${danger ? "text-danger" : ""}`}
                data-menue-punkt={l}
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
