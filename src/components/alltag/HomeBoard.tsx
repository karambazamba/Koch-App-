"use client";

// Die Kacheln auf "Heute" – normal in Reihen (zwei S nebeneinander, einzelne
// S breit) und im Bearbeiten-Modus DIREKT auf der Startseite: alle Kacheln
// wackeln dezent, Inhalte sind nicht antippbar, "–" oben links entfernt (mit
// "Gelöscht · Rückgängig"), "S · M · L" unten rechts ändert die Größe.
// Festhalten (ca. 0,2 s) und ziehen: die Kachel hebt sich, die anderen
// rutschen zur Seite, ein gestrichelter Platzhalter zeigt den Platz; am
// Bildschirmrand scrollt die Seite mit. Essen + Einkauf (beide S) wandern
// zusammen. Pointer-Events (Maus und Touch), Seite scrollt beim Ziehen nicht.

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { ChevronDown, ChevronUp, ChevronsUp, Minus, Plus } from "lucide-react";
import { Sheet } from "@/components/plan/Sheet";
import { CARD_LIST, buttonClass, chipClass } from "@/components/ui/styles";
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
  // Während des Haltens (bis zum Anheben) wackelt nichts
  const [holding, setHolding] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const [picking, setPicking] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  // Vorschau-Reihenfolge: die gezogene Einheit SELBST wandert (gleicher key) an die
  // Zielstelle und dient dort als Platzhalter. Ihr Element bleibt so während des
  // ganzen Ziehens in der Seite – auf dem iPhone verliert ein Finger sonst alle
  // weiteren Bewegungen, wenn sein Ziel-Element entfernt wird.
  const dragged = drag ? units.find((u) => u.key === drag.key) : null;
  const preview: Unit[] = (() => {
    if (!drag || !dragged) return units;
    const rest = units.filter((u) => u.key !== drag.key);
    rest.splice(drag.target, 0, dragged);
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
    setHolding(false);
  };

  /** Festhalten beginnt (Finger oder Maus): nach 0,2 s hebt sich die Kachel */
  const beginHold = (key: string, el: HTMLElement, x: number, y: number) => {
    if (!editing || dragRef.current) return;
    cancelHold();
    setHolding(true);
    hold.current = { x, y, key, el, timer: setTimeout(() => (hold.current = null, setHolding(false), startDrag(key, el, x, y)), HOLD_MS) };
  };
  /** Bewegung: vor dem Anheben = Scrollen (Festhalten abbrechen), danach = Ziehen */
  const moveTo = (x: number, y: number) => {
    if (hold.current && Math.hypot(x - hold.current.x, y - hold.current.y) > 8) cancelHold();
    const d = dragRef.current;
    if (!d) return;
    pointer.current = { x, y };
    setDrag({ ...d, x, y, target: targetFor(d.key, x, y + window.scrollY) });
  };
  /** Loslassen: abgelegt und sofort gespeichert – oder (kurz angetippt) das Menü */
  const release = () => {
    const tapped = hold.current?.key;
    cancelHold();
    const d = dragRef.current;
    if (!d) {
      if (tapped) setMenu(tapped);
      return;
    }
    const rest = units.filter((u) => u.key !== d.key);
    const unit = units.find((u) => u.key === d.key);
    if (unit) {
      rest.splice(d.target, 0, unit);
      saveOrder(rest);
    }
    buzz();
    setDrag(null);
  };
  const abort = () => {
    cancelHold();
    setDrag(null);
  };
  const saveOrder = (next: Unit[]) => {
    const order = next.flatMap((u) => u.tiles.map((t) => t.id));
    if (order.join() !== tiles.map((t) => t.id).join()) saveHomeTiles(reorderVisible(all, order));
  };

  // Maus/Stift über Pointer-Events; Finger über Touch-Events (auf dem iPhone bricht
  // Safari Pointer-Events ab, sobald es scrollen will – Touch-Events lassen sich halten)
  const onDown = (key: string) => (e: ReactPointerEvent<HTMLElement>) => {
    // Nur im Bearbeiten-Modus – sonst bekäme die Kachel den Klick statt der Links darin
    if (!editing || e.pointerType === "touch" || (e.target as Element).closest("button")) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ohne Capture geht es über das Fenster
    }
    beginHold(key, e.currentTarget, e.clientX, e.clientY);
  };
  // Finger: ab Beginn des Haltens hört das Dokument mit (passive: false), bis der
  // Finger losgelassen wird – so lässt sich das Scrollen nach dem Anheben verhindern.
  const touchOff = useRef<(() => void) | null>(null);
  const handlers = useRef<{ move: (e: TouchEvent) => void; end: (e: TouchEvent) => void; cancel: () => void }>({ move: () => {}, end: () => {}, cancel: () => {} });
  useEffect(() => () => touchOff.current?.(), []);
  const onTouchStart = (key: string) => (e: ReactTouchEvent<HTMLElement>) => {
    if (e.touches.length !== 1 || (e.target as Element).closest("button")) return abort();
    touchOff.current?.();
    const move = (ev: TouchEvent) => handlers.current.move(ev);
    const end = (ev: TouchEvent) => {
      handlers.current.end(ev);
      touchOff.current?.();
    };
    const cancel = () => {
      handlers.current.cancel();
      touchOff.current?.();
    };
    document.addEventListener("touchmove", move, { passive: false });
    document.addEventListener("touchend", end, { passive: false });
    document.addEventListener("touchcancel", cancel);
    touchOff.current = () => {
      document.removeEventListener("touchmove", move);
      document.removeEventListener("touchend", end);
      document.removeEventListener("touchcancel", cancel);
      touchOff.current = null;
    };
    beginHold(key, e.currentTarget, e.touches[0].clientX, e.touches[0].clientY);
  };

  // Während des Ziehens: Fenster-weit mitgehen, ablegen, Seite nicht scrollen lassen
  useEffect(() => {
    if (!editing) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!hold.current && !dragRef.current) return;
      const t = e.touches[0];
      if (dragRef.current) e.preventDefault();
      if (t) moveTo(t.clientX, t.clientY);
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!hold.current && !dragRef.current) return;
      // Kein nachgeschickter Klick (der sonst das eben geöffnete Menü gleich wieder schließt)
      e.preventDefault();
      release();
    };
    const onMove = (e: PointerEvent) => e.pointerType !== "touch" && moveTo(e.clientX, e.clientY);
    const onUp = (e: PointerEvent) => e.pointerType !== "touch" && release();
    const onCancel = (e: PointerEvent) => e.pointerType !== "touch" && abort();
    handlers.current = { move: onTouchMove, end: onTouchEnd, cancel: abort };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
    };
  });

  // Absicherung ohne Ziehen: Menü einer Einheit (Ganz nach oben, Nach oben, Nach unten, Größe, Entfernen)
  const moveUnit = (key: string, to: "top" | "up" | "down") => {
    const i = units.findIndex((u) => u.key === key);
    if (i < 0) return;
    const next = units.filter((u) => u.key !== key);
    next.splice(to === "top" ? 0 : to === "up" ? Math.max(0, i - 1) : Math.min(units.length - 1, i + 1), 0, units[i]);
    buzz();
    saveOrder(next);
  };

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

  const renderUnit = (unit: Unit, index: number, half: boolean, floating = false, wide = true) => {
    const pair = unit.tiles.length === 2;
    // Die gezogene Einheit bleibt im Raster – unsichtbar, als gestrichelter Platzhalter an der Zielstelle
    const ghost = !floating && drag?.key === unit.key;
    return (
      // Außen: Ziehen (Position, Ereignisse); innen: Wackeln – nie beides auf demselben Element
      <div
        key={unit.key}
        data-unit={floating ? undefined : unit.key}
        onPointerDown={floating ? undefined : onDown(unit.key)}
        onTouchStart={floating || !editing ? undefined : onTouchStart(unit.key)}
        onContextMenu={editing ? (e) => e.preventDefault() : undefined}
        className={`relative min-w-0 ${floating ? "" : wide ? "col-span-2" : "col-span-1"} ${editing && !floating ? "touch-none select-none [-webkit-touch-callout:none] [-webkit-user-select:none]" : ""}`}
        style={ghost ? { height: drag.h } : undefined}
        aria-label={editing ? (pair ? "Essen und Einkauf" : tileMeta(unit.tiles[0].id).label) : undefined}
        role={editing ? "group" : undefined}
      >
        {ghost && <div className="absolute inset-0 rounded-card border-2 border-dashed border-accent/50 bg-accent-soft/40" data-platzhalter aria-hidden />}
        <div
          className={`${pair ? `grid grid-cols-2 gap-2 ${editing ? "rounded-[26px] p-1 outline-2 outline-dashed outline-line" : ""}` : ""} ${ghost ? "invisible h-0 overflow-hidden" : ""}`}
          style={editing && !floating && !drag && !holding ? { animation: `${index % 2 ? "wiggle-b" : "wiggle"} 1.6s ease-in-out infinite` } : undefined}
        >
          {unit.tiles.map((tile) => (
            <EditFrame key={tile.id} tile={tile} editing={editing} onRemove={() => remove(tile.id)} onResize={(s) => resize(tile.id, s)}>
              {render(tile, half || pair, editing)}
            </EditFrame>
          ))}
        </div>
      </div>
    );
  };

  return (
    // Flaches Raster (2 Spalten): jede Einheit liegt direkt im Board – so behält sie
    // beim Umsortieren ihr Element (React verschiebt es nur). Zwei S nebeneinander je
    // eine Spalte, alles andere (auch eine einzelne S) über die volle Breite.
    <div ref={board} className="grid grid-cols-2 gap-x-2 gap-y-3" data-no-swipe={editing ? true : undefined} onClick={(e) => editing && e.target === e.currentTarget && onExit()}>
      {rowsOf(preview).flatMap((row, r) => row.map((u, i) => renderUnit(u, r * 2 + i, row.length === 2, false, row.length !== 2)))}
      {editing && (
        <div className="col-span-2 flex flex-col gap-3">
          <button type="button" onClick={() => setPicking(true)} className="flex h-14 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-base font-bold text-muted active:bg-stone-100">
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Kachel hinzufügen
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className="self-center py-2 text-sm font-semibold text-muted underline">
            Standard-Anordnung wiederherstellen
          </button>
        </div>
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
      {menu && units.some((u) => u.key === menu) && <UnitMenu unit={units.find((u) => u.key === menu)!} first={units[0].key === menu} last={units[units.length - 1].key === menu} onMove={(to) => moveUnit(menu, to)} onResize={resize} onRemove={(id) => remove(id)} onClose={() => setMenu(null)} />}
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

/** Kurz angetippt im Bearbeiten-Modus: verschieben ohne Ziehen, Größe, Entfernen (jede Auswahl schließt) */
function UnitMenu({ unit, first, last, onMove, onResize, onRemove, onClose }: { unit: Unit; first: boolean; last: boolean; onMove: (to: "top" | "up" | "down") => void; onResize: (id: HomeTileId, s: TileSize) => void; onRemove: (id: HomeTileId) => void; onClose: () => void }) {
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
