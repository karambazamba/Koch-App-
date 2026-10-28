"use client";

// Seite „Einkauf“ (Tafel 110, Bild 1): „Meine Läden“ als große farbige
// Karten – Farbstreifen, Name, die ersten Sachen leise, bis 3 Symbole,
// Anzahl, „›“. Auch mit 0. Tipp = Laden-Seite. Beim Ziehen aus „Noch ohne
// Laden“ leuchtet die Karte unter dem Finger in Ladenfarbe (`data-laden-ziel`).

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { ersteSachen, ladenHref, sachenText, type LadenKarte } from "@/lib/einkauf/seite/karten";

/** Farben einer Karte: Ladenfarbe bzw. neutral für „Egal wo“ */
export const ladenFarbe = (shop: string) => (shop ? { voll: `var(--app-shop-${shopTone(shop)})`, hell: `var(--app-shop-${shopTone(shop)}-soft)` } : { voll: "var(--app-faint)", hell: "var(--app-fill)" });

export function LadenKarteView({ karte, products, ziel = false, beispiel = false }: { karte: LadenKarte; products: Record<string, string>; ziel?: boolean; beispiel?: boolean }) {
  const { shop, items } = karte;
  const farbe = ladenFarbe(shop);
  const name = shop || "Egal wo";
  const props = {
    className: `relative flex min-h-[76px] items-center gap-3 overflow-hidden rounded-card py-3 pl-5 pr-3 transition duration-300 active:scale-[0.98] ${ziel ? "scale-[1.02]" : ""}`,
    style: { background: farbe.hell, ...(ziel ? { boxShadow: `0 0 0 3px ${farbe.voll}` } : {}) },
    "aria-label": `${name}: ${sachenText(items.length)}${beispiel ? " · Beispiel" : ""}`,
    "data-laden-karte": shop,
    ...(shop && !beispiel ? { "data-laden-ziel": shop } : {}),
    "data-ziel-aktiv": ziel || undefined,
  };
  const inhalt = (
    <>
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: farbe.voll }} aria-hidden />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[18px] font-extrabold leading-tight">{name}</span>
        <span className="truncate text-[14px] text-muted">{ersteSachen(items)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
        {items.slice(0, 3).map((i) => (
          <ItemSymbol key={i.key} id={symbolFor(i.name, products)} name={i.name} className="h-6 w-6" />
        ))}
      </span>
      <span className="min-w-[1.5rem] shrink-0 text-right text-[20px] font-extrabold tabular-nums" style={{ color: shop ? farbe.voll : undefined }}>
        {items.length}
      </span>
      {!beispiel && <ChevronRight className="h-5 w-5 shrink-0 text-muted" strokeWidth={2.25} aria-hidden />}
    </>
  );
  // Beispiel-Tag: nur zum Anschauen, nichts dahinter
  return beispiel ? (
    <div {...props} role="group">
      {inhalt}
    </div>
  ) : (
    <Link href={ladenHref(shop)} {...props}>
      {inhalt}
    </Link>
  );
}
