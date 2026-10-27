"use client";

// Einkauf: erst einsortieren, dann einkaufen (Tafel 99). Das Fenster „Wo
// kaufst du das?“ (Antippen eines Artikels zu Hause – nie „gekauft“): Kopf mit
// Symbol, Name, Menge · für Gericht; „Meine Läden“ als große Knöpfe (2
// Spalten, Farbpunkt, aktueller bzw. vorgeschlagener Laden hervorgehoben),
// bewusst „Egal wo“, Häkchen „<Artikel> immer bei <Laden>“; unten klein
// „Schon gekauft · Ändern · Löschen“. Dazu die Zone „Noch ohne Laden“ mit der
// Mia-Zeile „6 Sachen noch ohne Laden.“ + „Mia sortiert“.

import { useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { ICON_BUTTON, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { ShopDot } from "@/components/einkauf/MeineLaeden";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { FRAGE_LAEDEN } from "@/lib/einkauf/meineLaeden";
import { ohneLadenSatz } from "@/lib/einkauf/einsortieren";
import type { ListItem } from "@/lib/einkauf/shoppingList";

const lower = (s: string) => s.trim().toLowerCase();
const SMALL = "hit flex min-h-11 flex-1 items-center justify-center rounded-field bg-fill px-2 text-[14px] font-semibold text-ink active:scale-[0.98]";

/** Ohne „Meine Läden“: die ersten Läden der Frage als Auswahl */
const ladenAuswahl = (myShops: string[]) => (myShops.length ? myShops : FRAGE_LAEDEN.slice(0, 6));

export function WoKaufstDuSheet({
  item,
  myShops,
  vorschlag,
  products,
  onPick,
  onBought,
  onEdit,
  remove,
  onClose,
}: {
  item: ListItem;
  myShops: string[];
  /** Vorschlag, wenn noch ohne Laden (aus dem Gelernten) */
  vorschlag: string | null;
  products: Record<string, string>;
  onPick: (shop: string, immer: boolean) => void;
  onBought: () => void;
  onEdit: () => void;
  remove: { label: string; onClick: () => void };
  onClose: () => void;
}) {
  const [immer, setImmer] = useState(true);
  const current = item.shop || vorschlag || "";
  const shops = ladenAuswahl(myShops);
  const options = current && !shops.some((s) => lower(s) === lower(current)) ? [...shops, current] : shops;
  const dish = item.dishes[0]?.replace(/\s*\([^)]*\)(\s*×2)?\s*$/, "");
  const sub = [item.amount, dish ? `für ${dish}` : ""].filter(Boolean).join(" · ");
  const header = (
    <div className="flex items-center gap-3">
      <ItemSymbol id={symbolFor(item.name, products)} name={item.name} className="h-9 w-9 shrink-0 text-2xl" />
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-xl font-extrabold tracking-tight">{item.name}</h2>
        {sub && <p className="truncate text-[14px] text-muted" data-fuer-gericht>{sub}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Schließen" className={ICON_BUTTON}>
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
    </div>
  );
  return (
    <Sheet title="Wo kaufst du das?" onClose={onClose} header={header}>
      <div className="flex flex-col gap-2" data-wo-kaufst-du>
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-muted">Wo kaufst du das?</p>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Wo kaufst du das?">
          {options.map((s) => {
            const on = lower(s) === lower(current);
            const tone = shopTone(s);
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => onPick(s, immer)}
                className="hit flex min-h-14 min-w-0 items-center gap-2 rounded-field border-2 bg-surface px-3 text-left text-[16px] font-bold active:scale-[0.98]"
                style={on ? { background: `var(--app-shop-${tone}-soft)`, borderColor: `var(--app-shop-${tone})` } : { borderColor: "var(--app-line)" }}
                data-laden-knopf
              >
                <ShopDot shop={s} big />
                <span className="min-w-0 truncate">{s}</span>
              </button>
            );
          })}
          <button
            type="button"
            role="radio"
            aria-checked={Boolean(item.anywhere)}
            onClick={() => onPick("", false)}
            className={`hit flex min-h-14 items-center gap-2 rounded-field border-2 px-3 text-left text-[16px] font-bold text-muted active:scale-[0.98] ${item.anywhere ? "border-line-strong bg-fill" : "border-line bg-surface"}`}
            data-egal-wo
          >
            Egal wo
          </button>
        </div>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-[15px] font-semibold">
        <input type="checkbox" checked={immer} onChange={(e) => setImmer(e.target.checked)} className="h-5 w-5 accent-[var(--app-accent)]" data-immer-bei />
        {current ? `${item.name} immer bei ${current}` : `${item.name} immer dort`}
      </label>
      <div className="flex gap-2 pb-2">
        <button type="button" onClick={onBought} className={SMALL} data-schon-gekauft>
          {item.checked ? "Doch kaufen" : "Schon gekauft"}
        </button>
        <button type="button" onClick={onEdit} className={SMALL}>
          Ändern
        </button>
        <button type="button" onClick={remove.onClick} className={SMALL}>
          {remove.label}
        </button>
      </div>
    </Sheet>
  );
}

/** Zone „Noch ohne Laden“ (gestrichelt, warm), darüber die Mia-Zeile mit „Mia sortiert“ (nur, wenn sie etwas kennt) */
export function OhneLadenZone({ count, sortierbar, helper, onSort, children }: { count: number; sortierbar: number; helper: string; onSort: () => void; children: ReactNode }) {
  if (!count) return null;
  return (
    <>
      {sortierbar > 0 && (
        <div className="flex items-center gap-2.5 rounded-card bg-surface px-3 py-2 shadow-card" data-mia-sortiert-zeile>
          <BegleitungAvatar size={26} zustand="ruhig" />
          <p className="min-w-0 flex-1 text-[15px] font-semibold">{ohneLadenSatz(count)}</p>
          <button type="button" onClick={onSort} className={`${buttonClass("primary", "sm")} shrink-0`} data-mia-sortiert>
            {helper} sortiert
          </button>
        </div>
      )}
      <section id="ohne-laden" aria-label="Noch ohne Laden" className="flex scroll-mt-4 flex-col gap-2 rounded-card border-2 border-dashed border-accent/50 bg-accent-soft/40 p-3" data-ohne-laden>
        <div className="flex items-baseline gap-2 px-1">
          <h2 className={`${SECTION_TITLE} min-w-0 truncate`}>
            Noch ohne Laden <span className="font-semibold text-muted tabular-nums">{count}</span>
          </h2>
          <span className="ml-auto shrink-0 text-[13px] font-bold text-accent-strong">Antippen = Laden wählen</span>
        </div>
        {children}
      </section>
    </>
  );
}
