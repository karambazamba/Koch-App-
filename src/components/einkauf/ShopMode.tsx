"use client";

// Einkaufsmodus „Bei REWE“ (/einkaufsliste/laden?name=REWE): groß und ruhig
// nur, was es in diesem Laden gibt, darunter „Egal wo“ (Artikel ohne Laden)
// und eingeklappt die anderen Läden. Bildschirm bleibt an. Lernen: wird ein
// Artikel zweimal hintereinander hier abgehakt, merkt sich die Liste den
// Laden still und fragt einmal „Soll ich mir das merken?“ [Ja] [Nein]
// (Ja = feste Regel, `einkauf/shopRules`). Fertig = eine Ebene zurück.
// Mit Konto (Einkauf Teil 6): einmal fragen „Familie Bescheid sagen?“; bei
// „Ja, immer“ wird der Einkauf geteilt, Neues von anderen erscheint gelb,
// „Fertig eingekauft“ meldet „Eingekauft ✓“ an den Haushalt. Unter Neuem
// von anderen: „Steh grad davor“ (Antwort an die Person, die es draufsetzte).

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronDown, ShoppingBag, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import { learnQuestion, loadShoppingSettings, noteShopCheck, setShopRule, toggleChecked, type ListItem } from "@/lib/einkauf/shoppingList";
import { shopModeLists } from "@/lib/einkauf/shopMode";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { useWakeLock } from "@/lib/core/wakeLock";
import { useGoBack } from "@/lib/core/useGoBack";
import { ItemContent } from "@/components/einkauf/ShoppingParts";
import { BescheidAsk } from "@/components/einkauf/unterwegs/BescheidAsk";
import { now, nowIso } from "@/lib/core/now";
import { dueStaples } from "@/lib/einkauf/staples";
import { newId } from "@/lib/einkauf/listModel";
import { addTrip, answered, boughtCount, changeBescheid, changeTrips, finishTrip, loadBescheid, newDuringTrip, sameTrip, sendAnswer, tripSuggestions, useBescheid, useTrips } from "@/lib/einkauf/unterwegs/unterwegs";
import { cloudSync, useCachedAccount } from "@/lib/konten/cache";
import { refreshAccount } from "@/lib/konten/account";
import { addedBy } from "@/lib/konten/wer";

export function ShopMode() {
  const params = useSearchParams();
  const shop = (params.get("name") ?? "").trim().slice(0, 30);
  const data = useWeekShoppingList("planning");
  const today = useToday();
  const goBack = useGoBack();
  const [learned, setLearned] = useState<string[]>([]);
  // „Butter kaufst du meist bei Lidl. Soll ich mir das merken?“ (einmal je Artikel)
  const [question, setQuestion] = useState<string | null>(null);
  const [othersOpen, setOthersOpen] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  useWakeLock(Boolean(shop));
  const { household } = useCachedAccount();
  const bescheid = useBescheid();
  const trips = useTrips();
  const started = useRef(false);
  // Nur mit Konto; Mitglieder frisch holen (für „Neu von Lisa“)
  const family = household;
  useEffect(() => {
    if (cloudSync()) void refreshAccount();
  }, []);

  // Einkauf auf diesem Gerät beginnen (einmal je Laden, 3 Std.) – mit Familie teilen, wenn gewünscht
  const share = () => {
    if (!data || !family) return;
    const id = newId();
    const due = dueStaples(data.settings.staples, data.weekStart, data.list, data.weekList);
    changeTrips((t) => addTrip(t, { id, shop, by: family.me.displayName, start: nowIso(), end: null, count: null, vorschlaege: tripSuggestions(due) }, now().getTime()));
    changeBescheid((b) => (b.active ? { ...b, active: { ...b.active, tripId: id } } : b));
  };
  const ready = Boolean(data && bescheid && shop);
  useEffect(() => {
    if (!ready || !data || started.current) return;
    started.current = true;
    const b = loadBescheid();
    if (sameTrip(b.active, shop, now().getTime())) return;
    const items = data.list.items;
    changeBescheid((s) => ({ ...s, active: { tripId: null, shop, since: nowIso(), known: items.map((i) => i.key), doneBefore: items.filter((i) => i.checked).map((i) => i.key) } }));
    if (family && b.answer === "ja") share();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Laden
  }, [ready]);

  if (!data || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const todayIso = toIsoDate(today);
  const lists = shopModeLists(data.list.items, shop);
  const active = bescheid && sameTrip(bescheid.active, shop, now().getTime()) ? bescheid.active : null;
  // Die eine Frage – bis sie beantwortet ist (dann merkt das Gerät die Antwort)
  const ask = Boolean(family && active && bescheid?.answer === null);
  const fresh = newDuringTrip(data.list.items, active, family?.me.userId ?? null);
  const trip = active?.tripId ? trips.find((t) => t.id === active.tripId) : undefined;
  const finish = () => {
    if (active?.tripId) {
      const id = active.tripId;
      const count = boughtCount(data.list.items, active);
      changeTrips((t) => finishTrip(t, id, nowIso(), count));
    }
    changeBescheid((b) => ({ ...b, active: null }));
    goBack("/einkaufsliste");
  };

  const tick = (item: ListItem) => {
    toggleChecked(data.weekStart, item, todayIso);
    // Lernen: zweimal hintereinander hier abgehakt → Laden still merken, einmal fragen
    if (!item.checked && shop) {
      const had = item.shop;
      if (noteShopCheck(item.name, shop) === "frage") setQuestion(item.name);
      const merk = loadShoppingSettings().itemShops[item.name.trim().toLowerCase()] ?? "";
      if (merk.toLowerCase() === shop.toLowerCase() && had.toLowerCase() !== shop.toLowerCase()) setLearned((l) => (l.includes(item.name) ? l : [...l, item.name]));
    }
  };

  const row = (item: ListItem) => {
    const neu = fresh.has(item.key) ? (addedBy(item.von, family?.members ?? [], family?.me.userId ?? null)?.name ?? "") : undefined;
    return (
      <li key={item.key} className={neu !== undefined ? "bg-warn-soft" : undefined} data-neu={neu !== undefined ? "" : undefined}>
        <ItemContent item={item} onToggle={() => tick(item)} onInfo={() => setInfo(info === item.key ? null : item.key)} infoOpen={info === item.key} neuVon={neu} />
        {neu !== undefined && trip && item.von && !item.checked && (
          <div className="flex items-center pb-2 pl-14 pr-3">
            {answered(trip, item.von, item.name) ? (
              <span className="text-sm text-muted">Gesagt: Steh grad davor.</span>
            ) : (
              <button type="button" onClick={() => sendAnswer(item.von!, item.name, family?.me.userId ?? null)} className={`${buttonClass("secondary", "sm")} hit`}>
                Steh grad davor
              </button>
            )}
          </div>
        )}
      </li>
    );
  };

  const nothingHere = !lists.here.length && !lists.anywhere.length;
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={`Bei ${shop || "…"}`} subtitle="Einkaufen" backHref="/einkaufsliste" />
      <main className={PAGE_MAIN}>
        <p className="flex items-center gap-2 px-1 text-sm text-muted">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--app-shop-${shopTone(shop)})` }} aria-hidden />
          {active?.tripId ? "Die Familie weiß Bescheid. Der Bildschirm bleibt an." : "Der Bildschirm bleibt an, solange du einkaufst."}
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
            <p className="px-1 text-xs text-muted">Was du hier öfter abhakst, merk ich mir für {shop}.</p>
          </section>
        )}

        {nothingHere && (
          <section className={`${CARD} flex flex-col items-center gap-2 px-5 py-8 text-center`}>
            <ShoppingBag className="h-8 w-8 text-accent" strokeWidth={2} aria-hidden />
            <p className="text-[17px] font-bold">Alles für {shop} im Korb.</p>
            <p className="text-sm text-muted">Schönen Heimweg!</p>
          </section>
        )}

        {question && (
          <section aria-label="Laden merken" className={`${CARD} flex flex-col gap-3 px-4 py-3`}>
            <p className="text-[15px] leading-snug">{learnQuestion(question, shop)}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setShopRule(question, shop);
                  setQuestion(null);
                }}
                className={`${buttonClass("primary", "md")} flex-1`}
              >
                Ja
              </button>
              <button type="button" onClick={() => setQuestion(null)} className={`${buttonClass("ghost", "md")} flex-1`}>
                Nein
              </button>
            </div>
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

        <button type="button" onClick={finish} className={`${buttonClass("primary", "lg")} w-full`}>
          {active?.tripId ? "Fertig eingekauft" : "Fertig"}
        </button>
      </main>
      {ask && (
        <BescheidAsk
          shop={shop}
          onClose={(yes) => {
            if (yes) share();
          }}
        />
      )}
    </div>
  );
}
