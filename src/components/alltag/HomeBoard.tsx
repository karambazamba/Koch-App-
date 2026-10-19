"use client";

// Die Kacheln auf "Heute" – normal in Reihen (zwei S nebeneinander, einzelne
// S breit) und im Bearbeiten-Modus DIREKT auf der Startseite: alle Kacheln
// wackeln dezent, Inhalte sind nicht antippbar, "–" oben links entfernt (mit
// "Gelöscht · Rückgängig"), "S · M · L" unten rechts ändert die Größe.
// Festhalten (ca. 0,2 s) und ziehen: die Kachel hebt sich, die anderen
// rutschen zur Seite, ein gestrichelter Platzhalter zeigt den Platz; am
// Bildschirmrand scrollt die Seite mit. Essen + Einkauf (beide S) wandern
// zusammen. Pointer-Events (Maus und Touch), Seite scrollt beim Ziehen nicht.

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Minus, Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { applyHomeChange, reorderVisible, saveHomeTiles, standardLayout, tileMeta, type HomeTile, type HomeTileId, type TileSize } from "@/lib/core/homeLayout";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { TilePicker } from "./HomeCustomizer";
import { buzz } from "./actions";

type Unit = { key: string; tiles: HomeTile[] };
type Box = { key: string; top: number; bottom: number; left: number; right: number; half: boolean };
type Drag = { key: string; x: number; y: number; offX: number; offY: number; w: number; h: number; target: number };

const HOLD_MS = 200;
const PLACEHOLDER = "__platz";

/** Essen + Einkauf (beide S, direkt hintereinander) = eine Einheit, sonst je Kachel eine */
export function unitsOf(tiles: HomeTile[]): Unit[] {
  const units: Unit[] = [];
  for (let i = 0; i < tiles.length; i++) {
    const a = tiles[i];
    const b = tiles[i + 1];
    if (a.id === "essen" && b?.id === "einkauf" && a.size === "S" && b.size === "S") {
      units.push({ key: "essen+einkauf", tiles: [a, b] });
      i++;
    } else units.push({ key: a.id, tiles: [a] });
  }
  return units;
}

/** Reihen aus Einheiten: ein Paar ist eine Reihe; zwei einzelne S nebeneinander */
function rowsOf(units: Unit[]): Unit[][] {
  const rows: Unit[][] = [];
  const single = (u?: Unit) => u && u.tiles.length === 1 && u.tiles[0].size === "S";
  for (let i = 0; i < units.length; i++) {
    if (single(units[i]) && single(units[i + 1])) {
      rows.push([units[i], units[i + 1]]);
      i++;
    } else rows.push([units[i]]);
  }
  return rows;
}

export function HomeBoard({
  tiles,
  all,
  editing,
  render,
  onExit,
}: {
  tiles: HomeTile[];
  all: HomeTile[];
  editing: boolean;
  render: (tile: HomeTile, half: boolean, editing: boolean) => ReactNode;
  onExit: () => void;
}) {
  const units = unitsOf(tiles);
  const board = useRef<HTMLDivElement>(null);
  const [drag, setDragState] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const setDrag = (d: Drag | null) => {
    dragRef.current = d;
    setDragState(d);
  };
  const boxes = useRef<Box[]>([]);
  const hold = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number; key: string; el: HTMLElement } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const [picking, setPicking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Vorschau-Reihenfolge: gezogene Einheit raus, Platzhalter an die Zielstelle
  const dragged = drag ? units.find((u) => u.key === drag.key) : null;
  const preview: Unit[] = (() => {
    if (!drag || !dragged) return units;
    const rest = units.filter((u) => u.key !== drag.key);
    const size: TileSize = dragged.tiles.length === 1 && dragged.tiles[0].size === "S" ? "S" : "M";
    rest.splice(drag.target, 0, { key: PLACEHOLDER, tiles: [{ id: dragged.tiles[0].id, visible: true, size }] });
    return rest;
  })();

  // Ziel: wie viele andere Einheiten liegen "vor" dem Finger (Ausgangslage)
  const targetFor = (key: string, x: number, pageY: number) => {
    const others = boxes.current.filter((b) => b.key !== key);
    return others.filter((b) => (b.half ? pageY > b.bottom || (pageY >= b.top && x > (b.left + b.right) / 2) : pageY > (b.top + b.bottom) / 2)).length;
  };

  const startDrag = (key: string, el: HTMLElement, x: number, y: number) => {
    const sy = window.scrollY;
    boxes.current = [...(board.current?.querySelectorAll<HTMLElement>("[data-unit]") ?? [])].map((n) => {
      const r = n.getBoundingClientRect();
      return { key: n.dataset.unit!, top: r.top + sy, bottom: r.bottom + sy, left: r.left, right: r.right, half: r.width < window.innerWidth * 0.6 };
    });
    const r = el.getBoundingClientRect();
    buzz();
    pointer.current = { x, y };
    setDrag({ key, x, y, offX: x - r.left, offY: y - r.top, w: r.width, h: r.height, target: units.findIndex((u) => u.key === key) });
  };

  const cancelHold = () => {
    if (hold.current) clearTimeout(hold.current.timer);
    hold.current = null;
  };

  const onDown = (key: string) => (e: ReactPointerEvent<HTMLElement>) => {
    if (!editing || dragRef.current) return;
    if ((e.target as Element).closest("button")) return;
    const el = e.currentTarget;
    const { clientX: x, clientY: y } = e;
    cancelHold();
    hold.current = { x, y, key, el, timer: setTimeout(() => (hold.current = null, startDrag(key, el, x, y)), HOLD_MS) };
  };

  // Während des Ziehens: Fenster-weit mitgehen, ablegen, Seite nicht scrollen lassen
  useEffect(() => {
    if (!editing) return;
    const el = board.current;
    const onTouchMove = (e: TouchEvent) => {
      if (dragRef.current) e.preventDefault();
    };
    const onMove = (e: PointerEvent) => {
      if (hold.current && Math.hypot(e.clientX - hold.current.x, e.clientY - hold.current.y) > 8) cancelHold();
      const d = dragRef.current;
      if (!d) return;
      pointer.current = { x: e.clientX, y: e.clientY };
      const target = targetFor(d.key, e.clientX, e.clientY + window.scrollY);
      setDrag({ ...d, x: e.clientX, y: e.clientY, target });
    };
    const onUp = () => {
      cancelHold();
      const d = dragRef.current;
      if (!d) return;
      const rest = units.filter((u) => u.key !== d.key);
      const unit = units.find((u) => u.key === d.key);
      if (unit) {
        rest.splice(d.target, 0, unit);
        const order = rest.flatMap((u) => u.tiles.map((t) => t.id));
        if (order.join() !== tiles.map((t) => t.id).join()) saveHomeTiles(reorderVisible(all, order));
      }
      buzz();
      setDrag(null);
    };
    const onCancel = () => {
      cancelHold();
      setDrag(null);
    };
    el?.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      el?.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  });

  // Am Bildschirmrand automatisch scrollen
  const dragging = Boolean(drag);
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const { x, y } = pointer.current;
      const step = y < 90 ? -14 : y > window.innerHeight - 150 ? 14 : 0;
      const d = dragRef.current;
      if (step && d) {
        window.scrollBy(0, step);
        setDrag({ ...d, target: targetFor(d.key, x, y + window.scrollY) });
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [dragging]);

  // Die anderen rutschen flüssig zur Seite (FLIP)
  const last = useRef(new Map<string, DOMRect>());
  const orderKey = preview.map((u) => u.key).join("|");
  useLayoutEffect(() => {
    const nodes = [...(board.current?.querySelectorAll<HTMLElement>("[data-unit]") ?? [])];
    const next = new Map<string, DOMRect>();
    for (const n of nodes) {
      const key = n.dataset.unit!;
      const r = n.getBoundingClientRect();
      next.set(key, r);
      const before = last.current.get(key);
      if (!before || !dragging) continue;
      const dx = before.left - r.left;
      const dy = before.top - r.top;
      if (!dx && !dy) continue;
      n.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: 200, easing: "ease-out" });
    }
    last.current = next;
  }, [orderKey, dragging]);

  const remove = (id: HomeTileId) => {
    const before = all;
    saveHomeTiles(applyHomeChange(all, { tile: id, action: "ausblenden" }));
    showDeleted(pushUndo(`das Entfernen von ${tileMeta(id).label}`, () => saveHomeTiles(before)), `${tileMeta(id).label} entfernt`);
  };
  const resize = (id: HomeTileId, size: TileSize) => {
    buzz();
    saveHomeTiles(applyHomeChange(all, { tile: id, action: size === "S" ? "klein" : size === "M" ? "mittel" : "gross" }));
  };

  const renderUnit = (unit: Unit, index: number, half: boolean, floating = false) => {
    if (unit.key === PLACEHOLDER)
      return <div key={PLACEHOLDER} className="rounded-card border-2 border-dashed border-accent/50 bg-accent-soft/40" style={{ height: drag?.h ?? 80 }} aria-hidden />;
    const pair = unit.tiles.length === 2;
    return (
      <div
        key={unit.key}
        data-unit={floating ? undefined : unit.key}
        onPointerDown={floating ? undefined : onDown(unit.key)}
        className={`relative ${pair ? `grid grid-cols-2 gap-2 ${editing ? "rounded-[26px] p-1 outline-2 outline-dashed outline-line" : ""}` : ""} ${editing && !floating ? "touch-manipulation select-none" : ""}`}
        style={editing && !floating && !drag ? { animation: `${index % 2 ? "wiggle-b" : "wiggle"} 1.6s ease-in-out infinite` } : undefined}
        aria-label={editing ? (pair ? "Essen und Einkauf" : tileMeta(unit.tiles[0].id).label) : undefined}
        role={editing ? "group" : undefined}
      >
        {unit.tiles.map((tile) => (
          <EditFrame key={tile.id} tile={tile} editing={editing} onRemove={() => remove(tile.id)} onResize={(s) => resize(tile.id, s)}>
            {render(tile, half || pair, editing)}
          </EditFrame>
        ))}
      </div>
    );
  };

  return (
    <div ref={board} className="flex flex-col gap-3" data-no-swipe={editing ? true : undefined} onClick={(e) => editing && e.target === e.currentTarget && onExit()}>
      {rowsOf(preview).map((row, r) =>
        row.length === 2 ? (
          <div key={row.map((u) => u.key).join("+")} className="grid grid-cols-2 gap-2" onClick={(e) => editing && e.target === e.currentTarget && onExit()}>
            {row.map((u, i) => (
              <div key={u.key} className="min-w-0">
                {renderUnit(u, r * 2 + i, true)}
              </div>
            ))}
          </div>
        ) : (
          renderUnit(row[0], r * 2, false)
        ),
      )}
      {editing && (
        <>
          <button type="button" onClick={() => setPicking(true)} className="flex h-14 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-base font-bold text-muted active:bg-stone-100">
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Kachel hinzufügen
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className="self-center py-2 text-sm font-semibold text-muted underline">
            Standard-Anordnung wiederherstellen
          </button>
        </>
      )}
      {drag && dragged && (
        <div
          className="pointer-events-none fixed z-40"
          style={{ left: drag.x - drag.offX, top: drag.y - drag.offY, width: drag.w, transform: "scale(1.03) rotate(1.2deg)", filter: "drop-shadow(0 14px 22px rgb(0 0 0 / 0.18))" }}
          aria-hidden
        >
          {renderUnit(dragged, 0, dragged.tiles.length === 1 && drag.w < window.innerWidth * 0.6, true)}
        </div>
      )}
      {picking && <TilePicker onClose={() => setPicking(false)} />}
      {confirmReset && (
        <ConfirmDialog
          title="Standard-Anordnung wiederherstellen?"
          text="Reihenfolge und Größen wie am Anfang. Welche Kacheln du hast, bleibt."
          confirmLabel="Wiederherstellen"
          onConfirm={() => {
            saveHomeTiles(standardLayout(all));
            setConfirmReset(false);
          }}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}

/** Im Bearbeiten-Modus: "–" oben links, S · M · L unten rechts, Inhalt nicht antippbar */
function EditFrame({ tile, editing, onRemove, onResize, children }: { tile: HomeTile; editing: boolean; onRemove: () => void; onResize: (s: TileSize) => void; children: ReactNode }) {
  const meta = tileMeta(tile.id);
  if (!editing) return <>{children}</>;
  return (
    <div className="relative min-w-0">
      <div inert className="pointer-events-none min-h-14 select-none pl-3 pb-2">
        {children ?? <div className="flex h-16 items-center rounded-card border border-line bg-surface px-4 text-sm font-bold text-muted">{meta.label}</div>}
      </div>
      <button type="button" onClick={onRemove} aria-label={`${meta.label} entfernen`} className="absolute -left-3 -top-3 z-10 flex h-11 w-11 items-center justify-center">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-400 text-white shadow">
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
              className={`flex h-8 w-9 items-center justify-center ${tile.size === s ? "bg-bar text-on-bar" : "text-muted"}`}
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
