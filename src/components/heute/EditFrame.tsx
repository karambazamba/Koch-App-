"use client";

// Rahmen einer Kachel auf der Startseite (`HomeBoard`): normal nur die
// Pastell-Farbe (data-tone), im Bearbeiten-Modus "–" und S · M · L.

import type { ReactNode } from "react";
import { Minus } from "lucide-react";
import { tileMeta, type HomeTile, type TileSize } from "@/lib/core/homeLayout";

/** Im Bearbeiten-Modus: "–" oben links, S · M · L unten rechts, Inhalt nicht antippbar */
export function EditFrame({ tile, editing, onRemove, onResize, children }: { tile: HomeTile; editing: boolean; onRemove: () => void; onResize: (s: TileSize) => void; children: ReactNode }) {
  const meta = tileMeta(tile.id);
  // data-tone: Pastell-Farben der Kachel (Fläche, Akzent, innere Karten)
  if (!editing)
    return (
      <div data-tone={tile.id} className="contents">
        {children}
      </div>
    );
  return (
    <div data-tone={tile.id} className="relative min-w-0">
      <div inert className="pointer-events-none min-h-14 select-none pl-3 pb-2">
        {children ?? <div className="flex h-16 items-center rounded-card border border-line bg-surface px-4 text-sm font-bold text-muted">{meta.label}</div>}
      </div>
      <button type="button" onClick={onRemove} aria-label={`${meta.label} entfernen`} className="absolute -left-3 -top-3 z-10 flex h-11 w-11 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card">
          <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />
        </span>
      </button>
      {meta.sizes.length > 1 && (
        <div className="absolute -bottom-2 right-1.5 z-10 flex overflow-hidden rounded-full border border-line bg-surface text-xs font-bold shadow" role="radiogroup" aria-label={`Größe ${meta.label}`}>
          {meta.sizes.map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={tile.size === s}
              aria-label={`${meta.label} ${s === "S" ? "klein" : s === "M" ? "mittel" : "groß"}`}
              onClick={() => onResize(s)}
              className={`hit flex h-8 w-9 items-center justify-center ${tile.size === s ? "bg-accent text-on-accent" : "text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
