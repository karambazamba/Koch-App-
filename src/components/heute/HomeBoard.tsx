"use client";

// Die Kacheln auf "Heute" – normal in Reihen (zwei S nebeneinander, einzelne
// S breit) und im Bearbeiten-Modus DIREKT auf der Startseite: alle Kacheln
// wackeln dezent, Inhalte sind nicht antippbar, "–" oben links entfernt (mit
// "Gelöscht · Rückgängig"), "S · M · L" unten rechts ändert die Größe.
// Wischen scrollt überall – auch auf den Kacheln (touch-action: pan-y, wie
// der iPhone-Homescreen). Erst ruhiges Festhalten (ca. 0,35 s, < 8 px) hebt
// die Kachel an; dann steht die Seite still, die anderen rutschen zur Seite,
// ein gestrichelter Platzhalter zeigt den Platz, am Rand scrollt die Seite
// mit. Kurz antippen (< 0,35 s, < 8 px) = fertig (Tafel 24) – auch auf einer
// Kachel; „–“, S/M/L und „+ Kachel“ nicht. Tippen in eine noch rollende Seite
// hält nur an. Verschieben ohne Ziehen: Pfeiltasten bzw. die Screenreader-
// Knöpfe „Nach oben/unten“ an jeder Kachel (und Mia: „Schieb das Wetter nach
// oben“). Essen + Einkauf (beide S) wandern zusammen.

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode, type TouchEvent as ReactTouchEvent } from "react";
import { Plus } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { applyHomeChange, reorderVisible, saveHomeTiles, standardLayout, tileMeta, type HomeTile, type HomeTileId, type TileSize } from "@/lib/core/homeLayout";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { glowTile, rowsOf, unitsOf, type Unit } from "@/lib/core/homeUnits";
import { EditFrame } from "@/components/heute/EditFrame";
import { buzz } from "@/components/heute/actions";
import type { TilePicker } from "@/components/heute/TilePicker";

// Fenster erst beim Öffnen laden (hält die Seite beim Start klein)
type PickerComponent = typeof TilePicker;

type Box = { key: string; top: number; bottom: number; left: number; right: number; half: boolean };
type Drag = { key: string; x: number; y: number; offX: number; offY: number; w: number; h: number; target: number };

const HOLD_MS = 350;
/** So lange nach dem letzten Scrollen gilt ein Antippen als „Schwung anhalten“ (kein Anheben, nicht fertig) */
const FLING_MS = 120;

export function HomeBoard({
  tiles,
  all,
  editing,
  render,
  picking,
  onPicking,
  onDone,
}: {
  tiles: HomeTile[];
  all: HomeTile[];
  editing: boolean;
  render: (tile: HomeTile, half: boolean, editing: boolean) => ReactNode;
  /** „Kachel hinzufügen“ offen (auch vom „+ Kachel“ im Kopf) */
  picking: boolean;
  onPicking: (open: boolean) => void;
  /** Kurz angetippt: Bearbeiten beenden */
  onDone: () => void;
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
  const [confirmReset, setConfirmReset] = useState(false);
  // Auswahl erst beim Bearbeiten laden, dann ohne Suspense sofort zeigen:
  // öffnet „+ Kachel“ sie gleich nach dem Tipp, übernimmt sie dessen
  // Verlaufseintrag nur innerhalb von 300 ms (`useBackCloses`) – `next/dynamic`
  // zeigte sie erst nach ~300 ms
  const [Picker, setPicker] = useState<PickerComponent | null>(null);
  useEffect(() => {
    if (Picker || !(editing || picking)) return;
    let on = true;
    import("@/components/heute/TilePicker").then((m) => on && setPicker(() => m.TilePicker));
    return () => {
      on = false;
    };
  }, [Picker, editing, picking]);

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

  /** Festhalten beginnt (Finger oder Maus): nach 0,35 s ruhigem Halten hebt sich die Kachel */
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
  /** Loslassen: abgelegt und sofort gespeichert – oder (kurz angetippt) fertig */
  const release = () => {
    const tapped = hold.current?.key;
    cancelHold();
    const d = dragRef.current;
    if (!d) {
      if (tapped) onDone();
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
    // Seite rollt noch (Schwung): das Antippen hält sie nur an – nichts anheben, kein Menü
    if (performance.now() - lastScroll.current < FLING_MS) return abort();
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

  // Wann zuletzt gescrollt wurde (für „Tippen in rollende Seite“)
  const lastScroll = useRef(0);
  useEffect(() => {
    if (!editing) return;
    const onScroll = () => (lastScroll.current = performance.now());
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [editing]);

  // Während des Ziehens: Fenster-weit mitgehen, ablegen. preventDefault erst NACH
  // dem Anheben – vorher scrollt die Seite ganz normal mit Schwung.
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
      // Kein nachgeschickter Klick (der sonst durch die Seite fällt)
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

  // Ohne Ziehen (Tastatur, Screenreader): eine Einheit nach oben/unten
  const moveUnit = (key: string, to: "up" | "down") => {
    const i = units.findIndex((u) => u.key === key);
    if (i < 0) return;
    const next = units.filter((u) => u.key !== key);
    next.splice(to === "up" ? Math.max(0, i - 1) : Math.min(units.length - 1, i + 1), 0, units[i]);
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
        data-tile={floating ? undefined : unit.tiles.map((t) => t.id).join(" ")}
        onPointerDown={floating ? undefined : onDown(unit.key)}
        onTouchStart={floating || !editing ? undefined : onTouchStart(unit.key)}
        onContextMenu={editing ? (e) => e.preventDefault() : undefined}
        className={`relative min-w-0 ${floating ? "" : wide ? "col-span-2" : "col-span-1"} ${editing && !floating ? "touch-pan-y select-none [-webkit-touch-callout:none] [-webkit-user-select:none]" : ""}`}
        style={ghost ? { height: drag.h } : undefined}
        aria-label={editing ? (pair ? "Essen und Einkauf" : tileMeta(unit.tiles[0].id).label) : undefined}
        aria-roledescription={editing && !floating ? "Kachel – Pfeiltasten verschieben" : undefined}
        role={editing ? "group" : undefined}
        tabIndex={editing && !floating ? 0 : undefined}
        onKeyDown={
          editing && !floating
            ? (e) => {
                if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
                e.preventDefault();
                moveUnit(unit.key, e.key === "ArrowUp" ? "up" : "down");
              }
            : undefined
        }
      >
        {editing && !floating && (
          <span className="sr-only">
            <button type="button" onClick={() => moveUnit(unit.key, "up")}>
              Nach oben
            </button>
            <button type="button" onClick={() => moveUnit(unit.key, "down")}>
              Nach unten
            </button>
          </span>
        )}
        {ghost && <div className="absolute inset-0 rounded-card border-2 border-dashed border-accent/50 bg-accent-soft/40" data-platzhalter aria-hidden />}
        <div
          // Zwei kleine Kacheln nebeneinander sind gleich hoch (die Zeile streckt beide)
          className={`${pair ? `grid grid-cols-2 gap-2 ${editing ? "rounded-pair p-1 outline-2 outline-dashed outline-line" : ""}` : half && !editing ? "h-full [&>div>*]:h-full" : ""} ${ghost ? "invisible h-0 overflow-hidden" : ""}`}
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
    <div ref={board} className="grid grid-cols-2 gap-2" data-no-swipe={editing ? true : undefined}>
      {rowsOf(preview).flatMap((row, r) => row.map((u, i) => renderUnit(u, r * 2 + i, row.length === 2, false, row.length !== 2)))}
      {editing && (
        <div className="col-span-2 flex flex-col gap-3">
          <button type="button" onClick={() => onPicking(true)} className="flex h-14 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-base font-bold text-muted active:bg-fill">
            <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Kachel hinzufügen
          </button>
          <button type="button" onClick={() => setConfirmReset(true)} className="hit self-center py-2 text-sm font-semibold text-muted underline">
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
      {picking && Picker && <Picker onClose={() => onPicking(false)} onClosed={glowTile} />}
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
