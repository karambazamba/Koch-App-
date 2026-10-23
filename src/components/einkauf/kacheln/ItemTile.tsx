"use client";

// Einkauf wie Bring (Tafel 35): ein Artikel als quadratische Kachel in der
// Farbe seiner Abteilung – Symbol, Name, Menge, oben links das Gericht.
// Tippen = gekauft (bzw. auswählen), lange drücken = bearbeiten.

import { useRef } from "react";
import { Check } from "lucide-react";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { Section } from "@/lib/einkauf/shoppingList";

export type TileSize = "normal" | "compact" | "mini";

/** Raster je Größe: 3 bzw. 4 Spalten (ab 390 px), kompakt eine Spalte mehr; mini = Zeilen auf der Startseite */
export const TILE_GRID: Record<TileSize, string> = {
  normal: "grid grid-cols-3 gap-2 min-[390px]:grid-cols-4",
  compact: "grid grid-cols-4 gap-1.5 min-[390px]:grid-cols-5",
  mini: "grid grid-cols-2 gap-1.5",
};

const SYMBOL_SIZE: Record<TileSize, string> = { normal: "h-9 w-9 text-2xl", compact: "h-7 w-7 text-xl", mini: "h-7 w-7 shrink-0 text-lg" };
const NAME_SIZE: Record<TileSize, string> = { normal: "text-[12.5px]", compact: "text-[11.5px]", mini: "text-[13px]" };

/** Gericht ohne Klammer-Zusatz („Lasagne (Mo)“ → „Lasagne“) */
export const dishLabel = (dishes: string[] = []) => dishes[0]?.replace(/\s*\([^)]*\)\s*$/, "") ?? "";

export function ItemTile({
  name,
  section,
  amount = "",
  dish = "",
  products,
  checked,
  selected,
  dashed = false,
  label,
  size = "normal",
  onTap,
  onLongPress,
}: {
  name: string;
  section: Section;
  amount?: string;
  dish?: string;
  products?: Record<string, string>;
  /** Abhaken: role=checkbox */
  checked?: boolean;
  /** Auswählen (Katalog): aria-pressed */
  selected?: boolean;
  /** Gestrichelt: „Bald wieder fällig“ – noch nicht auf der Liste */
  dashed?: boolean;
  label: string;
  size?: TileSize;
  onTap: () => void;
  onLongPress?: () => void;
}) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null);
  const clear = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
    if (press.current) press.current.timer = null;
  };
  const done = checked || selected;
  return (
    <button
      type="button"
      {...(checked !== undefined ? { role: "checkbox", "aria-checked": checked } : selected !== undefined ? { "aria-pressed": selected } : {})}
      aria-label={label}
      onPointerDown={(e) => {
        if (!onLongPress) return;
        const timer = setTimeout(() => {
          if (press.current) press.current.fired = true;
          onLongPress();
        }, 500);
        press.current = { x: e.clientX, y: e.clientY, timer, fired: false };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (p?.timer && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => onLongPress && e.preventDefault()}
      onClick={() => {
        if (press.current?.fired) {
          press.current = null;
          return;
        }
        onTap();
      }}
      data-section={section}
      className={`relative flex w-full min-w-0 select-none items-center rounded-field transition duration-300 active:scale-95 ${
        size === "mini" ? "h-11 flex-row gap-1.5 px-1.5 text-left" : "aspect-square flex-col justify-center gap-0.5 px-1 pb-1 pt-3 text-center"
      } ${
        dashed ? "border-2 border-dashed border-line-strong" : ""
      } ${checked ? "opacity-55" : ""} ${selected ? "ring-2 ring-accent" : ""}`}
      style={{ background: dashed ? undefined : `var(--app-shop-section-${section})`, WebkitTouchCallout: "none" }}
    >
      {dish && size !== "mini" && <span className="absolute left-1.5 right-1.5 top-1 truncate text-left text-[10px] font-bold leading-tight text-muted">{dish}</span>}
      <ItemSymbol id={symbolFor(name, products)} name={name} className={SYMBOL_SIZE[size]} />
      <span className={`${size === "mini" ? "min-w-0 flex-1 truncate" : "line-clamp-2 w-full break-words"} font-bold leading-tight text-ink ${NAME_SIZE[size]} ${checked ? "line-through" : ""}`}>{name}</span>
      {amount && size !== "mini" && <span className="w-full truncate text-[11px] tabular-nums leading-tight text-muted">{amount}</span>}
      {done && (
        <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden>
          <Check className="h-3 w-3" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}
