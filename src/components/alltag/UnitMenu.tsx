"use client";

// Menü einer Kachel im Bearbeiten-Modus der Startseite (`HomeBoard`):
// verschieben ohne Ziehen, Größe, Entfernen.

import { ChevronDown, ChevronUp, ChevronsUp } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { CARD_LIST, buttonClass, chipClass } from "@/components/ui/styles";
import { tileMeta, type HomeTileId, type TileSize } from "@/lib/core/homeLayout";
import type { Unit } from "@/lib/core/homeUnits";

/** Kurz angetippt im Bearbeiten-Modus: verschieben ohne Ziehen, Größe, Entfernen (jede Auswahl schließt) */
export function UnitMenu({ unit, first, last, onMove, onResize, onRemove, onClose }: { unit: Unit; first: boolean; last: boolean; onMove: (to: "top" | "up" | "down") => void; onResize: (id: HomeTileId, s: TileSize) => void; onRemove: (id: HomeTileId) => void; onClose: () => void }) {
  const pick = (fn: () => void) => () => {
    fn();
    onClose();
  };
  const title = unit.tiles.length === 2 ? "Essen und Einkauf" : tileMeta(unit.tiles[0].id).label;
  const row = "flex min-h-12 w-full items-center gap-3 px-4 text-left text-base font-semibold disabled:opacity-40";
  return (
    <Sheet title={title} onClose={onClose}>
      <ul className={CARD_LIST}>
        <li>
          <button type="button" disabled={first} onClick={pick(() => onMove("top"))} className={row}>
            <ChevronsUp className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden /> Ganz nach oben
          </button>
        </li>
        <li>
          <button type="button" disabled={first} onClick={pick(() => onMove("up"))} className={row}>
            <ChevronUp className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden /> Nach oben
          </button>
        </li>
        <li>
          <button type="button" disabled={last} onClick={pick(() => onMove("down"))} className={row}>
            <ChevronDown className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden /> Nach unten
          </button>
        </li>
      </ul>
      {unit.tiles.map((tile) => {
        const meta = tileMeta(tile.id);
        return (
          <div key={tile.id} className="flex flex-col gap-2">
            {meta.sizes.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="flex-1 text-base font-bold">{unit.tiles.length === 2 ? `Größe ${meta.label}` : "Größe"}</span>
                {meta.sizes.map((s) => (
                  <button key={s} type="button" onClick={pick(() => onResize(tile.id, s))} aria-pressed={tile.size === s} className={`${chipClass(tile.size === s)} min-w-11 justify-center`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            <button type="button" onClick={pick(() => onRemove(tile.id))} className={buttonClass("danger", "md")}>
              {meta.label} entfernen
            </button>
          </div>
        );
      })}
    </Sheet>
  );
}
