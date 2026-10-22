"use client";

// Einkaufsmodus „Bei REWE“ (/einkaufsliste/laden?name=REWE): groß und ruhig
// nur, was es in diesem Laden gibt, darunter „Egal wo“ (Artikel ohne Laden)
// und eingeklappt die anderen Läden. Bildschirm bleibt an. Wird hier etwas
// ohne Laden abgehakt, merkt sich die Liste den Laden dafür (Lernen) – leise,
// zurück mit „Mach das rückgängig“. Fertig = eine Ebene zurück.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ShoppingBag, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { setItemShop, toggleChecked, type ListItem } from "@/lib/einkauf/shoppingList";
import { shopModeLists } from "@/lib/einkauf/shopMode";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { useWakeLock } from "@/lib/core/wakeLock";
import { useGoBack } from "@/lib/core/useGoBack";
import { pushUndo } from "@/lib/core/undo";
import { ItemContent } from "@/components/einkauf/ShoppingParts";

export function ShopMode() {
  const params = useSearchParams();
  const shop = (params.get("name") ?? "").trim().slice(0, 30);
  const data = useWeekShoppingList("planning");
  const today = useToday();
  const goBack = useGoBack();
  const [learned, setLearned] = useState<string[]>([]);
  const [othersOpen, setOthersOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  useWakeLock(Boolean(shop));

  if (!data || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const todayIso = toIsoDate(today);
  const lists = shopModeLists(data.list.items, shop);

  const tick = (item: ListItem) => {
    toggleChecked(data.weekStart, item, todayIso);
    // Lernen: im Laden abgehakt, noch ohne Laden → gibt es hier
    if (!item.checked && !item.shop && shop) {
      setItemShop(item.name, shop);
      setLearned((l) => [...l, item.name]);
      pushUndo(`„${item.name}“ bei ${shop} merken`, () => setItemShop(item.name, ""));
    }
  };

  const row = (item: ListItem) => (
    <li key={item.key}>
      <ItemContent item={item} onToggle={() => tick(item)} onInfo={() => setInfo(info === item.key ? null : item.key)} infoOpen={info === item.key} />
    </li>
  );

  const nothingHere = !lists.here.length && !lists.anywhere.length;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={`Bei ${shop || "…"}`} subtitle="Einkaufen" backHref="/einkaufsliste" />
      <main className={PAGE_MAIN}>
        <p className="flex items-center gap-2 px-1 text-sm text-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--app-shop-${shopTone(shop)})` }} aria-hidden />
          Der Bildschirm bleibt an, solange du einkaufst.
        </p>

        {lists.here.length > 0 && (
          <section aria-label={`Bei ${shop}`} className="flex flex-col gap-1.5">
            <h2 className={`${SECTION_TITLE} px-1`}>Gibt’s hier</h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">{lists.here.map(row)}</ul>
          </section>
        )}

        {lists.anywhere.length > 0 && (
          <section aria-label="Egal wo" className="flex flex-col gap-1.5">
            <h2 className={`${SECTION_TITLE} px-1`}>Egal wo</h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">{lists.anywhere.map(row)}</ul>
            <p className="px-1 text-xs text-muted">Was du hier abhakst, merke ich mir für {shop}.</p>
          </section>
        )}

        {nothingHere && (
          <section className={`${CARD} flex flex-col items-center gap-2 px-5 py-8 text-center`}>
            <ShoppingBag className="h-8 w-8 text-accent" strokeWidth={2} aria-hidden />
            <p className="text-[17px] font-bold">Alles für {shop} im Korb.</p>
            <p className="text-sm text-muted">Schönen Heimweg!</p>
          </section>
        )}

        {learned.length > 0 && (
          <p className="flex items-start gap-2 px-1 text-sm text-muted">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <span>
              Gemerkt für {shop}: {learned.join(", ")}
            </span>
          </p>
        )}

        {lists.elsewhere.length > 0 && (
          <section aria-label="Andere Läden" className="flex flex-col gap-1.5">
            <button type="button" onClick={() => setOthersOpen((o) => !o)} aria-expanded={othersOpen} className="hit flex items-center gap-1.5 self-start px-1 text-[15px] font-bold text-muted">
              Andere Läden
              <ChevronDown className={`h-4 w-4 transition ${othersOpen ? "rotate-180" : ""}`} strokeWidth={2.25} aria-hidden />
            </button>
            {othersOpen && (
              <ul className={`${CARD} flex flex-col gap-1 px-4 py-3`}>
                {lists.elsewhere.map((g) => (
                  <li key={g.shop} className="flex items-baseline gap-2 text-[15px]">
                    <span className="h-2 w-2 shrink-0 translate-y-[-1px] rounded-full" style={{ background: `var(--app-shop-${shopTone(g.shop)})` }} aria-hidden />
                    <span className="font-bold">{g.shop}</span>
                    <span className="min-w-0 truncate text-muted">{g.names.join(", ")}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {lists.done.length > 0 && (
          <section aria-label="Im Korb" className="flex flex-col gap-1.5">
            <h2 className="flex items-center gap-1.5 px-1 text-[15px] font-bold text-muted">
              <Check className="h-4 w-4 text-good" strokeWidth={2.5} aria-hidden />
              Im Korb
            </h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">{lists.done.map(row)}</ul>
          </section>
        )}

        <button type="button" onClick={() => goBack("/einkaufsliste")} className={`${buttonClass("primary", "lg")} w-full`}>
          Fertig
        </button>
      </main>
    </div>
  );
}
