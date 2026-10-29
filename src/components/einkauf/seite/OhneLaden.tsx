"use client";

// „Noch ohne Laden · n“ (Tafel 110, Bild 4): gestrichelt, nur wenn es etwas
// gibt. Chip antippen = „Wo kaufst du das?“; Chip halten (~250 ms, hebt sich,
// kurze Vibration) und auf eine Laden-Karte ziehen – das Ziel leuchtet in
// Ladenfarbe, Loslassen = in den Laden, sofort gemerkt. Dazu „Mia sortiert“
// (nur, wenn sie etwas kennt) und leise „oder auf einen Laden ziehen“.
// Ziehen stört weder Scrollen noch Wischen: erst nach dem Halten, vorher
// gewinnt die Bewegung (data-no-swipe, kein touch-none).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { buzz } from "@/components/heute/actions";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { ListItem } from "@/lib/einkauf/listModel";

/** So lange halten, bis der Chip sich hebt */
export const HALTEN_MS = 250;

type Zug = { item: ListItem; x: number; y: number };

/** Laden unter dem Finger (Karte mit `data-laden-ziel`) */
const zielAn = (x: number, y: number): string | null => (document.elementFromPoint(x, y)?.closest("[data-laden-ziel]") as HTMLElement | null)?.dataset.ladenZiel ?? null;

export function OhneLadenZone({
  items,
  einrichten = false,
  products,
  sortierer,
  onSort,
  onTap,
  onZiel,
  onDrop,
}: {
  items: ListItem[];
  /** Noch keine Laden-Einrichtung (A-067): Link „Einmal sagen, was du wo holst ›“ */
  einrichten?: boolean;
  products: Record<string, string>;
  /** „Mia sortiert“ – nur, wenn sie etwas davon kennt (sonst null) */
  sortierer: string | null;
  onSort: () => void;
  onTap: (item: ListItem) => void;
  /** Laden unter dem Finger (Karte leuchtet) */
  onZiel: (shop: string | null) => void;
  onDrop: (item: ListItem, shop: string) => void;
}) {
  const [zug, setZug] = useState<Zug | null>(null);
  const ziehtGerade = useRef(false);
  // Während des Ziehens scrollt die Seite nicht (nur dann – vorher gewinnt das Scrollen)
  useEffect(() => {
    const halt = (e: TouchEvent) => {
      if (ziehtGerade.current) e.preventDefault();
    };
    document.addEventListener("touchmove", halt, { passive: false });
    return () => document.removeEventListener("touchmove", halt);
  }, []);
  if (!items.length) return null;
  return (
    <section id="ohne-laden" aria-label="Noch ohne Laden" className="flex scroll-mt-4 flex-col gap-3 rounded-card border-2 border-dashed border-line-strong p-3" data-ohne-laden data-no-swipe>
      <div className="flex items-center gap-2 px-1">
        <h2 className={`${SECTION_TITLE} min-w-0 flex-1 truncate`}>
          Noch ohne Laden <span className="font-semibold text-muted tabular-nums">· {items.length}</span>
        </h2>
        {sortierer && (
          <button type="button" onClick={onSort} className={`${buttonClass("primary", "sm")} shrink-0`} data-mia-sortiert>
            {sortierer} sortiert
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <ZiehChip
            key={item.key}
            item={item}
            products={products}
            weg={zug?.item.key === item.key}
            onTap={() => onTap(item)}
            onStart={(x, y) => {
              ziehtGerade.current = true;
              setZug({ item, x, y });
            }}
            onMove={(x, y) => {
              setZug({ item, x, y });
              onZiel(zielAn(x, y));
            }}
            onEnd={(x, y) => {
              ziehtGerade.current = false;
              const shop = x === null || y === null ? null : zielAn(x, y);
              setZug(null);
              onZiel(null);
              if (shop) onDrop(item, shop);
            }}
          />
        ))}
      </div>
      <p className="px-1 text-[13px] text-muted">oder auf einen Laden ziehen</p>
      {einrichten && (
        <Link href="/einkaufsliste/einrichten" className="hit flex min-h-11 items-center px-1 text-[15px] font-bold text-accent-strong" data-einrichten-link>
          Einmal sagen, was du wo holst ›
        </Link>
      )}
      {zug && (
        <span
          className="pointer-events-none fixed left-0 top-0 z-50 flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-3 text-[15px] font-bold shadow-sheet"
          style={{ transform: `translate(${zug.x}px, ${zug.y}px) translate(-50%, -60%) scale(1.08)` }}
          aria-hidden
          data-zieh-chip
        >
          <ItemSymbol id={symbolFor(zug.item.name, products)} name={zug.item.name} className="h-5 w-5" />
          {zug.item.name}
        </span>
      )}
    </section>
  );
}

/** Ein Chip: Tippen = Fenster, Halten + Ziehen = in einen Laden */
function ZiehChip({
  item,
  products,
  weg,
  onTap,
  onStart,
  onMove,
  onEnd,
}: {
  item: ListItem;
  products: Record<string, string>;
  weg: boolean;
  onTap: () => void;
  onStart: (x: number, y: number) => void;
  onMove: (x: number, y: number) => void;
  onEnd: (x: number | null, y: number | null) => void;
}) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; zieht: boolean; id: number } | null>(null);
  const loslassen = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
  };
  return (
    <button
      type="button"
      aria-label={`${item.name}: Laden wählen`}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        const el = e.currentTarget;
        const id = e.pointerId;
        const start = { x: e.clientX, y: e.clientY };
        const timer = setTimeout(() => {
          if (!press.current) return;
          press.current.zieht = true;
          press.current.timer = null;
          try {
            el.setPointerCapture(id);
          } catch {
            // ohne Capture geht es auch
          }
          buzz();
          onStart(start.x, start.y);
        }, HALTEN_MS);
        press.current = { ...start, timer, zieht: false, id };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (!p) return;
        if (p.zieht) onMove(e.clientX, e.clientY);
        // Vor dem Heben gewinnt die Bewegung (Scrollen, Wischen)
        else if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) {
          loslassen();
          press.current = null;
        }
      }}
      onPointerUp={(e) => {
        const p = press.current;
        loslassen();
        if (p?.zieht) onEnd(e.clientX, e.clientY);
      }}
      onPointerCancel={() => {
        const p = press.current;
        loslassen();
        press.current = null;
        if (p?.zieht) onEnd(null, null);
      }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        // Nach dem Ziehen kein Fenster
        if (press.current?.zieht) {
          press.current = null;
          return;
        }
        press.current = null;
        onTap();
      }}
      className={`hit flex min-h-11 select-none items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-[15px] font-bold transition active:scale-95 ${weg ? "opacity-40" : ""}`}
      style={{ WebkitTouchCallout: "none" }}
      data-ohne-chip={item.name}
    >
      <ItemSymbol id={symbolFor(item.name, products)} name={item.name} className="h-5 w-5" />
      {item.name}
    </button>
  );
}
