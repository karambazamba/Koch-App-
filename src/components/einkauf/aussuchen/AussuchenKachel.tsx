"use client";

// Eine Kachel in „Aussuchen“ (Tafel 111): weiß, Symbol + Name, oben rechts
// „+“ in Orange. Steht schon drauf: Fläche hell in Ladenfarbe, Rand und
// runder Haken in Ladenfarbe, in einem anderen Laden darunter klein dessen
// Name; ohne Laden ein ruhiger Haken „steht drauf“. Im Haus: kleiner Punkt
// „noch da“ (Tipp fügt trotzdem hinzu). Menge „×2“. Tippen = rein/raus,
// halten = Menge.

import { useRef } from "react";
import { Check, Plus } from "lucide-react";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { shopTone } from "@/lib/einkauf/shopGroups";

export function AussuchenKachel({
  name,
  tag,
  products,
  laden,
  drauf,
  aktiv,
  imHaus,
  menge,
  onTap,
  onHold,
}: {
  name: string;
  /** „für Mi“ (Für eure Woche) */
  tag?: string;
  products: Record<string, string>;
  /** Laden, in dem es steht ("" = ohne Laden) */
  laden: string;
  /** Steht schon auf der Liste */
  drauf: boolean;
  /** Aktiver Laden oben */
  aktiv: string;
  imHaus: boolean;
  /** „×2“ */
  menge: string;
  onTap: () => void;
  onHold: () => void;
}) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null);
  const clear = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
  };
  const farbe = drauf && laden ? `var(--app-shop-${shopTone(laden)})` : null;
  const hell = drauf && laden ? `var(--app-shop-${shopTone(laden)}-soft)` : null;
  const anderer = drauf && laden && laden.trim().toLowerCase() !== aktiv.trim().toLowerCase();
  const label = `${name}${drauf ? (laden ? `, steht drauf bei ${laden}` : ", steht drauf") : ""}${imHaus && !drauf ? ", noch da" : ""}${menge ? `, ${menge}` : ""}`;
  return (
    <button
      type="button"
      aria-pressed={drauf}
      aria-label={label}
      onPointerDown={(e) => {
        const timer = setTimeout(() => {
          if (press.current) press.current.fired = true;
          onHold();
        }, 500);
        press.current = { x: e.clientX, y: e.clientY, timer, fired: false };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (p?.timer && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) clear();
      }}
      onPointerUp={clear}
      onPointerCancel={clear}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (press.current?.fired) {
          press.current = null;
          return;
        }
        onTap();
      }}
      className={`relative flex aspect-square w-full min-w-0 select-none flex-col items-center justify-center gap-1 rounded-card border-2 px-1 pb-1.5 pt-4 text-center transition duration-300 active:scale-95 ${farbe ? "" : drauf ? "border-line-strong bg-fill" : "border-transparent bg-surface shadow-card"}`}
      style={{ ...(farbe ? { borderColor: farbe, background: hell ?? undefined } : {}), WebkitTouchCallout: "none" }}
      data-kachel={name}
      data-drauf={drauf || undefined}
      data-laden={drauf ? laden : undefined}
    >
      {tag && <span className="absolute left-2 top-1.5 text-[10.5px] font-bold text-muted">{tag}</span>}
      {imHaus && !drauf && <span className="absolute left-2 top-2 h-2 w-2 rounded-full bg-good" title="noch da" aria-hidden data-noch-da />}
      <span className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full" style={farbe ? { background: farbe } : undefined} aria-hidden>
        {drauf ? (
          <span className={`flex h-6 w-6 items-center justify-center rounded-full ${farbe ? "text-on-accent" : "bg-fill-strong text-ink"}`}>
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          </span>
        ) : (
          <Plus className="h-4 w-4 text-accent" strokeWidth={2.75} />
        )}
      </span>
      <ItemSymbol id={symbolFor(name, products)} name={name} className="h-8 w-8 text-2xl" />
      <span className="line-clamp-2 w-full hyphens-auto text-[13.5px] font-bold leading-tight text-ink [overflow-wrap:normal]">{name}</span>
      {anderer ? (
        <span className="w-full truncate text-[11.5px] font-bold leading-tight" style={{ color: farbe ?? undefined }}>
          {laden}
        </span>
      ) : drauf && !laden ? (
        <span className="w-full truncate text-[11.5px] font-semibold leading-tight text-muted">steht drauf</span>
      ) : imHaus ? (
        <span className="w-full truncate text-[11.5px] font-semibold leading-tight text-good-ink">noch da</span>
      ) : null}
      {menge && <span className="absolute bottom-1.5 right-2 text-[12px] font-extrabold tabular-nums text-ink">{menge}</span>}
    </button>
  );
}
