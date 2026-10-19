"use client";

// "Startseite bearbeiten": aktive Kacheln als Liste (leicht wackelnd), je
// Kachel "–" zum Entfernen (mit Rückgängig), Griff zum Ziehen; unten
// "+ Kachel hinzufügen" → Auswahl im 2er-Raster. Als Fenster (lange drücken,
// Link unten auf Heute) und als Seite in den Einstellungen. Wirkt sofort.

import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Box, CalendarClock, CheckCircle2, GripVertical, ListChecks, Mail, Minus, NotebookPen, PenLine, Plus, Refrigerator, ShoppingCart, Sunrise, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { CARD } from "@/components/ui/styles";
import { HOME_TILES, applyHomeChange, saveHomeTiles, tileMeta, useHomeTiles, type HomeTile, type HomeTileId } from "@/lib/core/homeLayout";
import { showToast } from "@/lib/core/toast";
import { featureOn, setFeature } from "@/lib/core/features";
import { pushUndo } from "@/lib/core/undo";

const ROW_GAP = 8;

export const TILE_ICONS: Record<HomeTileId, LucideIcon> = {
  termine: CalendarClock,
  aufgaben: ListChecks,
  essen: UtensilsCrossed,
  einkauf: ShoppingCart,
  kladde: PenLine,
  notizen: NotebookPen,
  morgen: Sunrise,
  vorrat: Refrigerator,
  post: Mail,
};

/** Kachel entfernen bzw. hinzufügen – mit Rückgängig */
function setTile(all: HomeTile[], id: HomeTileId, show: boolean) {
  const meta = tileMeta(id);
  // Baustein-Kachel (Vorrat): beim Hinzufügen den Baustein einschalten
  const switched = show && meta.feature && !featureOn(meta.feature) ? setFeature(meta.feature, true) : false;
  saveHomeTiles(applyHomeChange(all, { tile: id, action: show ? "zeigen" : "ausblenden" }));
  showToast({
    text: show ? `${meta.label} ist auf der Startseite ✓` : `${meta.label} ist weg ✓`,
    undo: pushUndo(`${meta.label} ${show ? "hinzufügen" : "entfernen"}`, () => {
      saveHomeTiles(all);
      if (switched && meta.feature) setFeature(meta.feature, false);
    }),
    undoneText: "Rückgängig gemacht.",
  });
}

/** Sichtbar auf der Startseite (Bausteine nur, wenn sie an sind) */
const isActive = (t: HomeTile) => t.visible && !tileMeta(t.id).soon && (!tileMeta(t.id).feature || featureOn(tileMeta(t.id).feature!));

export function HomeEditorList() {
  const all = useHomeTiles();
  const tiles = all?.filter(isActive);
  const rows = useRef<(HTMLLIElement | null)[]>([]);
  const [drag, setDrag] = useState<{ index: number; startY: number; dy: number; height: number } | null>(null);
  const [picking, setPicking] = useState(false);
  if (!tiles || !all) return <div className={`${CARD} h-64 animate-pulse`} />;

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
      const before = all;
      const copy = [...tiles];
      const [tile] = copy.splice(drag.index, 1);
      copy.splice(target, 0, tile);
      // Nicht aktive Kacheln behalten ihren Platz am Ende
      saveHomeTiles([...copy, ...all.filter((t) => !copy.some((c) => c.id === t.id))]);
      showToast({ text: "Reihenfolge geändert ✓", undo: pushUndo("die Reihenfolge der Startseite", () => saveHomeTiles(before)), undoneText: "Rückgängig gemacht." });
    }
    setDrag(null);
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col" style={{ gap: ROW_GAP }} aria-label="Kacheln der Startseite" data-no-swipe>
        {tiles.map((tile, index) => {
          const meta = tileMeta(tile.id);
          const Icon = TILE_ICONS[tile.id];
          const dragging = drag?.index === index;
          // Andere Zeilen rücken beim Ziehen zur Seite
          const shift = drag && !dragging ? (index > drag.index && index <= target ? -(drag.height + ROW_GAP) : index < drag.index && index >= target ? drag.height + ROW_GAP : 0) : 0;
          return (
            <li
              key={tile.id}
              ref={(el) => {
                rows.current[index] = el;
              }}
              className={`${CARD} relative flex items-center gap-3 py-2.5 pl-2 pr-1 ${dragging ? "z-10 shadow-lg" : drag ? "transition-transform" : "motion-safe:animate-[wiggle_1.4s_ease-in-out_infinite]"}`}
              style={{ transform: `translateY(${dragging ? drag.dy : shift}px)`, animationDelay: `${(index % 3) * 0.15}s` }}
              aria-label={meta.label}
            >
              <button type="button" onClick={() => setTile(all, tile.id, false)} aria-label={`${meta.label} entfernen`} className="flex h-11 w-9 shrink-0 items-center justify-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-300 text-white">
                  <Minus className="h-4 w-4" strokeWidth={3} aria-hidden />
                </span>
              </button>
              <Icon className="h-5 w-5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-base font-bold">{meta.label}</span>
                <span className="block truncate text-sm text-muted">{meta.hint}</span>
              </span>
              <button
                type="button"
                aria-label={`${meta.label} verschieben`}
                onPointerDown={onDown(index)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                onPointerCancel={() => setDrag(null)}
                className="flex h-11 w-10 shrink-0 cursor-grab touch-none items-center justify-center text-muted"
              >
                <GripVertical className="h-5 w-5" strokeWidth={2} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={() => setPicking(true)} className="flex h-14 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-base font-bold text-muted active:bg-stone-100">
        <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        Kachel hinzufügen
      </button>
      {picking && <TilePicker onClose={() => setPicking(false)} />}
    </div>
  );
}

/** "+ Kachel hinzufügen": alle Kacheln im 2er-Raster – aktiv weiß mit ✓ (Tippen = entfernen), sonst grau mit "+" */
function TilePicker({ onClose }: { onClose: () => void }) {
  const all = useHomeTiles();
  if (!all) return null;
  return (
    <Sheet title="Kachel hinzufügen" onClose={onClose} above>
      <ul className="grid grid-cols-2 gap-2 pb-3" aria-label="Kacheln">
        {HOME_TILES.map((meta) => {
          const tile = all.find((t) => t.id === meta.id);
          const active = Boolean(tile && isActive(tile));
          const Icon = TILE_ICONS[meta.id] ?? Box;
          return (
            <li key={meta.id}>
              <button
                type="button"
                disabled={meta.soon}
                aria-pressed={active}
                aria-label={`${meta.label}${meta.soon ? " (bald)" : active ? " – entfernen" : " – hinzufügen"}`}
                onClick={() => setTile(all, meta.id, !active)}
                className={`relative flex h-full w-full flex-col items-start gap-1 rounded-2xl border p-3 text-left transition active:scale-[0.98] disabled:opacity-60 ${active ? "border-line bg-surface shadow-card" : "border-transparent bg-segment"}`}
              >
                <Icon className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
                <span className="text-[15px] font-bold">{meta.label}</span>
                <span className="text-xs leading-snug text-muted">{meta.soon ? "bald" : meta.hint}</span>
                <span className="absolute right-2 top-2">
                  {active ? (
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2.25} aria-hidden />
                  ) : meta.soon ? null : (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-bar text-on-bar">
                      <Plus className="h-4 w-4" strokeWidth={2.75} aria-hidden />
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Bearbeiten-Modus als Fenster (lange drücken, Link unten auf Heute) */
export function HomeEditSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Startseite bearbeiten" onClose={onClose}>
      <div className="-mt-2 mb-3 flex items-center gap-3">
        <p className="flex-1 text-sm text-muted">Ziehen zum Sortieren · – zum Entfernen</p>
        <button type="button" onClick={onClose} className="h-10 rounded-full bg-bar px-5 text-sm font-bold text-on-bar active:scale-95">
          Fertig
        </button>
      </div>
      <div className="pb-3">
        <HomeEditorList />
      </div>
    </Sheet>
  );
}
