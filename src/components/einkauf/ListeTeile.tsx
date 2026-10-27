"use client";

// Einkaufsliste aufgeräumt (Tafel 89): Wochenwechsel in einer Zeile, Gruppen
// (nach Laden „● Edeka 7 · Einkaufen ›“ bzw. nach Abteilung), die Karte „Hast
// du bestimmt im Haus“ und zugeklappte Zeilen mit ›.

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { CARD, ICON_BUTTON, SECTION_TITLE, chipClass } from "@/components/ui/styles";
import { ShopDot } from "@/components/einkauf/MeineLaeden";
import { shopModeHref } from "@/lib/einkauf/shopMode";
import type { Gruppe } from "@/lib/einkauf/kacheln/gruppen";
import type { ListItem } from "@/lib/einkauf/shoppingList";

/** „Diese Woche · 26.10.–1.11.“ mit ‹ › in einer Zeile */
export function WochenZeile({ isNext, range, onPrev, onNext }: { isNext: boolean; range: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between gap-1" data-wochen-zeile>
      <button type="button" onClick={onPrev} disabled={!isNext} aria-label="Diese Woche" className={`${ICON_BUTTON} border-0`}>
        <ChevronLeft className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      <p className="min-w-0 truncate text-center text-[15px] font-bold">
        {isNext ? "Nächste Woche" : "Diese Woche"} <span className="font-semibold text-muted">· {range}</span>
      </p>
      <button type="button" onClick={onNext} disabled={isNext} aria-label="Nächste Woche" className={`${ICON_BUTTON} border-0`}>
        <ChevronRight className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
}

/** Gruppen mit Kopf: nach Laden („● Edeka 7 · Einkaufen ›“) oder nach Abteilung */
export function GruppenListe({ gruppen, tiles, nachLaden }: { gruppen: Gruppe[]; tiles: (items: ListItem[]) => ReactNode; nachLaden: boolean }) {
  return (
    <>
      {gruppen.map((g) => (
        <section key={g.key} aria-label={g.label} className="flex flex-col gap-2" data-gruppe={g.key}>
          <div className="flex items-center gap-2 px-1">
            {nachLaden && g.shop && <ShopDot shop={g.shop} big />}
            <h2 className={`${SECTION_TITLE} min-w-0 truncate`}>
              {g.label} <span className="font-semibold text-muted tabular-nums">{g.items.length}</span>
            </h2>
            {nachLaden && g.shop && (
              <Link href={shopModeHref(g.shop)} className="hit ml-auto shrink-0 text-[14px] font-bold text-accent-strong">
                Einkaufen ›
              </Link>
            )}
          </div>
          {tiles(g.items)}
        </section>
      ))}
    </>
  );
}

/** „Hast du bestimmt im Haus“ – Grundsachen aus Rezepten; antippen = doch auf die Liste */
export function GrundsachenKarte({ items, onAdd }: { items: ListItem[]; onAdd: (item: ListItem) => void }) {
  if (!items.length) return null;
  return (
    <section className={`${CARD} flex flex-col gap-2 p-4`} aria-label="Hast du bestimmt im Haus" data-grundsachen>
      <div>
        <h2 className="text-[15px] font-bold">Hast du bestimmt im Haus</h2>
        <p className="text-[13px] text-muted">Antippen = doch auf die Liste.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((i) => (
          <button key={i.key} type="button" onClick={() => onAdd(i)} aria-label={`${i.name} auf die Liste`} className={chipClass(false)}>
            <Plus className="h-4 w-4 text-accent" strokeWidth={2.5} aria-hidden />
            {i.name}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Eine zugeklappte Zeile mit › (aufgeklappt darunter der Inhalt) */
export function KlappZeile({ label, children, name }: { label: string; children: ReactNode; name: string }) {
  const [open, setOpen] = useState(false);
  return (
    <section className="flex flex-col gap-2" aria-label={name}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className={`${CARD} hit flex min-h-12 items-center justify-between gap-2 px-4 text-left text-[15px] font-semibold`}>
        <span className="min-w-0 truncate">{label}</span>
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-muted" strokeWidth={2.5} aria-hidden /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted" strokeWidth={2.5} aria-hidden />}
      </button>
      {open && children}
    </section>
  );
}
