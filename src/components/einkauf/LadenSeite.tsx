"use client";

// Laden-Seite (/einkaufsliste/laden?name=Rewe, Tafel 110, Punkt 5): Tipp auf
// eine Laden-Karte oder eine Zeile der Einkauf-Kachel. Oben die große
// farbige Karte „Rewe · 3 Sachen“, darunter die Liste: großer Kreis zum
// Abhaken, Symbol, Name, Menge leise. Kreis = gekauft (durchgestrichen, nach
// 2 s nach unten in „Im Korb“) – zu Hause wie im Laden, es gibt keinen
// eigenen Einkaufsmodus mehr. Lange drücken = „Wo kaufst du das?“ (anderer
// Laden, Ändern, Löschen). Unten das Feld „Was noch bei Rewe?“ mit
// Vorschlägen beim Tippen; es landet in diesem Laden.
// Mit Konto (Einkauf Teil 6): beim ersten Abhaken (oder unterwegs geöffnet,
// „Ich bin bei REWE“) einmal „Familie Bescheid sagen?“; Neues von anderen
// erscheint gelb mit „Steh grad davor“, „Fertig eingekauft“ meldet es.

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowUp, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { addManualItem, noteShopCheck, removeManualItem, renameItem, sectionFor, setHave, setItemShop, toggleChecked, updateManualItem, type ListItem } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { useGoBack } from "@/lib/core/useGoBack";
import { now, nowIso } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { dueStaples } from "@/lib/einkauf/staples";
import { newId } from "@/lib/einkauf/listModel";
import { useMeineLaeden } from "@/lib/einkauf/meineLaeden";
import { einsortieren, einsortiertText } from "@/lib/einkauf/einsortieren";
import { sachenText, useEinkaufWoche } from "@/lib/einkauf/seite/karten";
import { KATALOG_ALLE } from "@/lib/einkauf/aussuchen/katalog";
import { addTrip, answered, boughtCount, changeBescheid, changeTrips, finishTrip, loadBescheid, newDuringTrip, sameTrip, sendAnswer, tripSuggestions, useBescheid, useTrips } from "@/lib/einkauf/unterwegs/unterwegs";
import { cloudSync, useCachedAccount } from "@/lib/konten/cache";
import { refreshAccount } from "@/lib/konten/account";
import { addedBy } from "@/lib/konten/wer";
import { buzz } from "@/components/heute/actions";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import { EditItemSheet } from "@/components/einkauf/ShoppingParts";
import { WoKaufstDuSheet } from "@/components/einkauf/Einsortieren";
import { BescheidAsk } from "@/components/einkauf/unterwegs/BescheidAsk";
import { ladenFarbe } from "@/components/einkauf/seite/LadenKarten";
import { AddedBy } from "@/components/konten/AddedBy";

const lower = (s: string) => s.trim().toLowerCase();

export function LadenSeite() {
  const params = useSearchParams();
  const raw = (params.get("name") ?? "").trim().slice(0, 30);
  const meine = useMeineLaeden();
  // So schreiben, wie die Familie den Laden kennt („REWE“ → „Rewe“)
  const shop = meine?.myShops.find((m) => lower(m) === lower(raw)) ?? raw;
  const unterwegs = params.get("unterwegs") === "1";
  const woche = useEinkaufWoche();
  const data = useWeekShoppingList(woche);
  const today = useToday();
  const goBack = useGoBack();
  const [leaving, setLeaving] = useState<string[]>([]);
  const [menu, setMenu] = useState<ListItem | null>(null);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [feld, setFeld] = useState("");
  const { household } = useCachedAccount();
  const bescheid = useBescheid();
  const trips = useTrips();
  const started = useRef(false);
  const family = household;
  useEffect(() => {
    if (cloudSync()) void refreshAccount();
  }, []);

  // Einkauf mit Familie teilen (einmal je Laden, 3 Std.)
  const share = () => {
    if (!data || !family) return;
    const id = newId();
    const due = dueStaples(data.settings.staples, data.weekStart, data.list, data.weekList);
    changeTrips((t) => addTrip(t, { id, shop, by: family.me.displayName, start: nowIso(), end: null, count: null, vorschlaege: tripSuggestions(due) }, now().getTime()));
    changeBescheid((b) => (b.active ? { ...b, active: { ...b.active, tripId: id } } : b));
  };
  /** Einkauf beginnt: beim ersten Abhaken bzw. unterwegs geöffnet */
  const beginnen = () => {
    if (!data || !shop || started.current) return;
    started.current = true;
    const b = loadBescheid();
    if (sameTrip(b.active, shop, now().getTime())) return;
    const items = data.list.items;
    changeBescheid((s) => ({ ...s, active: { tripId: null, shop, since: nowIso(), known: items.map((i) => i.key), doneBefore: items.filter((i) => i.checked).map((i) => i.key) } }));
    if (family && b.answer === "ja") share();
  };
  const ready = Boolean(data && bescheid && shop);
  useEffect(() => {
    if (ready && unterwegs) beginnen();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur beim ersten Laden
  }, [ready]);

  if (!data || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const { weekStart, settings } = data;
  const todayIso = toIsoDate(today);
  const isHere = (i: ListItem) => (shop ? lower(i.shop) === lower(shop) : !i.shop.trim() && Boolean(i.anywhere));
  const visible = data.list.items.filter((i) => !i.hidden && isHere(i));
  const hier = visible.filter((i) => !i.checked || leaving.includes(i.key));
  const korb = visible.filter((i) => i.checked && !leaving.includes(i.key));
  const anzahl = visible.filter((i) => !i.checked).length;
  const active = bescheid && sameTrip(bescheid.active, shop, now().getTime()) ? bescheid.active : null;
  const ask = Boolean(family && active && bescheid?.answer === null);
  const fresh = newDuringTrip(data.list.items, active, family?.me.userId ?? null);
  const trip = active?.tripId ? trips.find((t) => t.id === active.tripId) : undefined;
  const name = shop || "Egal wo";
  const farbe = ladenFarbe(shop);

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
    if (!item.checked) {
      buzz();
      beginnen();
      setLeaving((l) => [...l, item.key]);
      window.setTimeout(() => setLeaving((l) => l.filter((k) => k !== item.key)), 2000);
      // Lernen bleibt still: im selben Laden abgehakt zählt mit
      if (shop) noteShopCheck(item.name, shop);
    }
    toggleChecked(weekStart, item, todayIso);
  };

  const add = (text: string) => {
    const clean = text.trim().slice(0, 40);
    if (!clean) return;
    const n = clean.charAt(0).toLocaleUpperCase("de-DE") + clean.slice(1);
    addManualItem(weekStart, { name: n, amount: "", section: sectionFor(n) });
    if (shop) einsortieren(n, shop, true);
    else setItemShop(n, "");
    setFeld("");
  };
  const q = lower(feld);
  const vorschlaege = q.length >= 2 ? [...new Set([...KATALOG_ALLE, ...settings.staples.map((s) => s.name)])].filter((n) => lower(n).includes(q) && !visible.some((i) => lower(i.name) === lower(n) && !i.checked)).slice(0, 5) : [];

  const row = (item: ListItem) => {
    const neu = fresh.has(item.key) ? (addedBy(item.von, family?.members ?? [], family?.me.userId ?? null)?.name ?? "") : undefined;
    return (
      <li key={item.key} className={neu !== undefined ? "bg-warn-soft" : undefined} data-neu={neu !== undefined ? "" : undefined}>
        <LadenZeile item={item} products={settings.products} neuVon={neu} onTick={() => tick(item)} onLongPress={() => setMenu(item)} />
        {neu !== undefined && trip && item.von && !item.checked && (
          <div className="flex items-center pb-2 pl-16 pr-3">
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

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title={name} backHref="/einkaufsliste" />
      <main className={PAGE_MAIN}>
        <section className="relative flex min-h-[84px] items-center overflow-hidden rounded-card py-4 pl-6 pr-4" style={{ background: farbe.hell }} aria-label={`${name} · ${sachenText(anzahl)}`} data-laden-kopf>
          <span className="absolute inset-y-0 left-0 w-2" style={{ background: farbe.voll }} aria-hidden />
          <p className="text-[22px] font-extrabold leading-tight">
            {name} <span className="font-bold text-muted">· {sachenText(anzahl)}</span>
          </p>
        </section>
        {active?.tripId && <p className="-mt-2 px-1 text-sm text-muted">Die Familie weiß Bescheid.</p>}

        {hier.length > 0 ? (
          <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label={name}>
            {hier.map(row)}
          </ul>
        ) : (
          <p className="px-1 text-[15px] text-muted">{korb.length ? `Alles für ${name} im Korb.` : `Für ${name} steht noch nichts drauf.`}</p>
        )}

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add(feld);
          }}
        >
          <input value={feld} onChange={(e) => setFeld(e.target.value)} enterKeyHint="done" aria-label={`Was noch bei ${name}?`} placeholder={`Was noch bei ${name}?`} className={`${INPUT_BASE} h-12 min-w-0 flex-1 px-4`} data-was-noch />
          <button type="submit" aria-label="Dazu" aria-disabled={!feld.trim()} className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent active:scale-95 ${feld.trim() ? "" : "opacity-50"}`}>
            <ArrowUp className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          </button>
        </form>
        {vorschlaege.length > 0 && (
          <div className="-mt-2 flex flex-wrap gap-2">
            {vorschlaege.map((v) => (
              <button key={v} type="button" onClick={() => add(v)} className={chipClass(false)}>
                {v}
              </button>
            ))}
          </div>
        )}

        {korb.length > 0 && (
          <section aria-label="Im Korb" className="flex flex-col gap-1.5">
            <h2 className={`${SECTION_TITLE} flex items-center gap-1.5 px-1 text-muted`}>
              <Check className="h-4 w-4 text-good" strokeWidth={2.5} aria-hidden />
              Im Korb
            </h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">{korb.map(row)}</ul>
          </section>
        )}

        {active?.tripId && (
          <button type="button" onClick={finish} className={`${buttonClass("primary", "lg")} w-full`}>
            Fertig eingekauft
          </button>
        )}
      </main>
      {menu && (
        <WoKaufstDuSheet
          item={menu}
          myShops={meine?.myShops ?? []}
          vorschlag={null}
          products={settings.products}
          onPick={(s, immer) => {
            const always = immer && Boolean(s);
            const undo = einsortieren(menu.name, s, always);
            showToast({ text: einsortiertText(menu.name, s, always), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
            setMenu(null);
          }}
          onBought={() => {
            tick(menu);
            setMenu(null);
          }}
          onEdit={() => {
            setEditing(menu);
            setMenu(null);
          }}
          remove={
            menu.manualId
              ? { label: "Löschen", onClick: () => (showDeleted(removeManualItem(weekStart, menu.manualId!), `${menu.name} gelöscht`), setMenu(null)) }
              : { label: "Haben wir schon", onClick: () => (setHave(weekStart, menu.key, true), setMenu(null)) }
          }
          onClose={() => setMenu(null)}
        />
      )}
      {editing && (
        <EditItemSheet
          item={editing}
          settings={settings}
          onClose={() => setEditing(null)}
          remove={editing.manualId ? { label: "Löschen", onClick: () => (showDeleted(removeManualItem(weekStart, editing.manualId!), `${editing.name} gelöscht`), setEditing(null)) } : { label: "Haben wir schon", onClick: () => (setHave(weekStart, editing.key, true), setEditing(null)) }}
          onSave={({ name: neu, always, shop: s, amount }) => {
            if (neu.trim() !== editing.name) renameItem(weekStart, editing, neu, always);
            if (editing.manualId && amount !== editing.amount) updateManualItem(weekStart, editing.manualId, { amount });
            const finalName = neu.trim() || editing.name;
            if (s !== editing.shop || finalName !== editing.name) setItemShop(finalName, s);
            setEditing(null);
          }}
        />
      )}
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

/** Eine Zeile: großer Kreis (gekauft), Symbol, Name, Menge leise; lange drücken = ändern */
function LadenZeile({ item, products, neuVon, onTick, onLongPress }: { item: ListItem; products: Record<string, string>; neuVon?: string; onTick: () => void; onLongPress: () => void }) {
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
      <span className={`min-w-0 flex-1 truncate text-[17px] font-semibold ${item.checked ? "text-faint line-through" : "text-ink"}`}>{item.name}</span>
      {!item.checked && (neuVon !== undefined ? <span className="shrink-0 text-sm font-semibold text-warn-ink">{neuVon ? `Neu von ${neuVon}` : "Neu"} · gerade eben</span> : <AddedBy owner={item.von} />)}
      {item.amount && <span className={`shrink-0 text-[15px] tabular-nums ${item.checked ? "text-faint line-through" : "text-muted"}`}>{item.amount}</span>}
    </div>
  );
}
