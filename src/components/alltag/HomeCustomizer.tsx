"use client";

// "Startseite anpassen": Reihenfolge ziehen, Größe (kompakt/ausführlich),
// ausblenden/einblenden. Als Fenster (langes Drücken auf eine Kachel) und als
// Seite in den Einstellungen. Wirkt sofort, mit Rückgängig-Toast.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Eye, EyeOff, GripVertical, Plus } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { CARD } from "@/components/ui/styles";
import { HOME_TILES, applyHomeChange, saveHomeTiles, useHomeTiles, type HomeChange, type HomeTile } from "@/lib/core/homeLayout";
import { showToast } from "@/lib/core/toast";
import { useFeature } from "@/lib/core/features";
import { pushUndo } from "@/lib/core/undo";

const ROW_GAP = 8;

function change(tiles: HomeTile[], c: HomeChange) {
  saveHomeTiles(applyHomeChange(tiles, c));
}

export function HomeCustomizerList() {
  const all = useHomeTiles();
  const pantryOn = useFeature("vorrat");
  // Kacheln von ausgeschalteten Bausteinen erscheinen hier nicht
  const tiles = all?.filter((t) => HOME_TILES.find((h) => h.id === t.id)?.feature !== "vorrat" || pantryOn);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<{ index: number; startY: number; dy: number; height: number } | null>(null);
  if (!tiles) return <div className={`${CARD} h-64 animate-pulse`} />;

  const target = drag ? Math.max(0, Math.min(tiles.length - 1, drag.index + Math.round(drag.dy / (drag.height + ROW_GAP)))) : -1;
  const onDown = (index: number) => (e: ReactPointerEvent) => {
    const el = rows.current[index];
    if (!el) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ index, startY: e.clientY, dy: 0, height: el.offsetHeight });
  };
  const onMove = (e: ReactPointerEvent) => drag && setDrag({ ...drag, dy: e.clientY - drag.startY });
  const onUp = () => {
    if (!drag) return;
    if (target !== drag.index) {
      const before = all ?? tiles;
      const copy = [...tiles];
      const [tile] = copy.splice(drag.index, 1);
      copy.splice(target, 0, tile);
      // Ausgeblendete Baustein-Kacheln behalten ihren Platz am Ende
      saveHomeTiles([...copy, ...(all ?? []).filter((t) => !copy.some((c) => c.id === t.id))]);
      showToast({ text: "Reihenfolge geändert ✓", undo: pushUndo("die Reihenfolge der Startseite", () => saveHomeTiles(before)), undoneText: "Rückgängig gemacht." });
    }
    setDrag(null);
  };

  return (
    <ul className="flex flex-col" style={{ gap: ROW_GAP }} aria-label="Kacheln der Startseite" data-no-swipe>
      {tiles.map((tile, index) => {
        const meta = HOME_TILES.find((t) => t.id === tile.id)!;
        const dragging = drag?.index === index;
        // Andere Zeilen rücken beim Ziehen zur Seite
        const shift = drag && !dragging ? (index > drag.index && index <= target ? -(drag.height + ROW_GAP) : index < drag.index && index >= target ? drag.height + ROW_GAP : 0) : 0;
        return (
          <li
            key={tile.id}
            ref={(el) => {
              rows.current[index] = el;
            }}
            className={`${CARD} flex items-center gap-2 p-2 pr-3 ${tile.visible ? "" : "opacity-70"} ${dragging ? "relative z-10 shadow-lg" : "transition-transform"}`}
            style={{ transform: `translateY(${dragging ? drag.dy : shift}px)` }}
            aria-label={meta.label}
          >
            <button
              type="button"
              aria-label={`${meta.label} verschieben`}
              onPointerDown={onDown(index)}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => setDrag(null)}
              className="flex h-11 w-9 shrink-0 cursor-grab touch-none items-center justify-center text-muted"
            >
              <GripVertical className="h-5 w-5" strokeWidth={2} aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold">{meta.label}</p>
              {tile.visible ? (
                <div className="mt-1 flex gap-1" role="radiogroup" aria-label={`Größe ${meta.label}`}>
                  {(["kompakt", "ausfuehrlich"] as const).map((size) => (
                    <button
                      key={size}
                      type="button"
                      role="radio"
                      aria-checked={tile.size === size}
                      onClick={() => change(tiles, { tile: tile.id, action: size })}
                      className={`h-8 rounded-lg px-2.5 text-sm font-bold ${tile.size === size ? "bg-accent-soft text-accent-strong" : "text-muted"}`}
                    >
                      {size === "kompakt" ? "Kompakt" : "Ausführlich"}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted">ausgeblendet</p>
              )}
            </div>
            {tile.visible ? (
              <button type="button" onClick={() => change(tiles, { tile: tile.id, action: "ausblenden" })} aria-label={`${meta.label} ausblenden`} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-stone-100">
                <EyeOff className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={() => change(tiles, { tile: tile.id, action: "zeigen" })} aria-label={`${meta.label} zeigen`} className="inline-flex h-10 shrink-0 items-center gap-1 rounded-xl bg-accent-soft px-3 text-sm font-bold text-accent-strong">
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                zeigen
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function HomeCustomizerSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Startseite anpassen" onClose={onClose}>
      <p className="-mt-2 flex items-center gap-1.5 text-sm text-muted">
        <Eye className="h-4 w-4" strokeWidth={2} aria-hidden /> Ziehen zum Sortieren · Ausblenden löscht nichts.
      </p>
      <div className="pb-3">
        <HomeCustomizerList />
      </div>
    </Sheet>
  );
}
