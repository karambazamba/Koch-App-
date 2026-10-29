"use client";

// Eine Zeile der Laden-Seite (A-040, Tafel 127): großer Kreis (abhaken),
// Symbol und Name – sonst nichts; eine Menge nur, wenn man sie selbst gesagt
// hat („2 Liter“). Wofür und die Rezeptmenge stehen erst im Fenster: Zeile
// antippen = `SacheFenster`. Abgehakt = Häkchen orange, Zeile blasser (nie
// durchgestrichen). Lange drücken = „Wo kaufst du das?“. Steht die Sache
// auch in anderen Läden (Sorte mit mehreren Läden, A-067), darunter klein
// „auch Markt“ – abgehakt ist sie dann überall.

import { useRef } from "react";
import { Check } from "lucide-react";
import type { ListItem } from "@/lib/einkauf/shoppingList";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { AddedBy } from "@/components/konten/AddedBy";

export function LadenZeile({ item, products, neuVon, auch, onTick, onOpen, onLongPress }: { item: ListItem; products: Record<string, string>; neuVon?: string; /** „auch Markt“ */ auch?: string; onTick: () => void; onOpen: () => void; onLongPress: () => void }) {
  const press = useRef<{ x: number; y: number; timer: ReturnType<typeof setTimeout> | null; fired: boolean } | null>(null);
  const clear = () => {
    if (press.current?.timer) clearTimeout(press.current.timer);
  };
  return (
    <div
      className="flex min-h-14 select-none items-center gap-3 py-1.5 pl-3 pr-4"
      onPointerDown={(e) => {
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
      onContextMenu={(e) => e.preventDefault()}
      style={{ WebkitTouchCallout: "none" }}
      data-laden-zeile={item.name}
      data-abgehakt={item.checked ? "" : undefined}
    >
      <button
        type="button"
        role="checkbox"
        aria-checked={item.checked}
        aria-label={`${item.name} ${item.checked ? "nicht mehr abhaken" : "abhaken"}`}
        onClick={() => {
          if (press.current?.fired) return;
          onTick();
        }}
        className={`hit flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition active:scale-90 ${item.checked ? "border-accent bg-accent text-on-accent" : "border-line-strong bg-surface text-transparent"}`}
      >
        <Check className="h-5 w-5" strokeWidth={3} aria-hidden />
      </button>
      <ItemSymbol id={symbolFor(item.name, products)} name={item.name} className={`h-7 w-7 shrink-0 ${item.checked ? "opacity-50" : ""}`} />
      <button
        type="button"
        onClick={() => {
          if (press.current?.fired) return;
          onOpen();
        }}
        aria-label={`${item.name} öffnen`}
        className={`flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left ${item.checked ? "opacity-50" : ""}`}
        data-zeile-oeffnen
      >
        {auch ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-[17px] font-semibold text-ink">{item.name}</span>
            <span className="text-[13px] font-semibold text-muted" data-auch>
              {auch}
            </span>
          </span>
        ) : (
          <span className="min-w-0 flex-1 truncate text-[17px] font-semibold text-ink">{item.name}</span>
        )}
        {!item.checked && (neuVon !== undefined ? <span className="shrink-0 text-sm font-semibold text-warn-ink">{neuVon ? `Neu von ${neuVon}` : "Neu"} · gerade eben</span> : <AddedBy owner={item.von} />)}
        {item.amount && <span className="shrink-0 text-[15px] tabular-nums text-muted">{item.amount}</span>}
      </button>
    </div>
  );
}
