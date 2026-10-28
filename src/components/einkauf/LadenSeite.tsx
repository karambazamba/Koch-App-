"use client";

// Laden-Seite (/einkaufsliste/laden?name=Rewe, Tafel 110, Punkt 5): Tipp auf
// eine Laden-Karte oder eine Zeile der Einkauf-Kachel. Oben die große
// farbige Karte „Rewe · 3 Sachen“, darunter die Liste: großer Kreis zum
// Abhaken, Symbol, Name, Menge leise. Nachtrag A-018: Kreis = im Wagen
// (Häkchen orange, 1 s stehen – nochmal tippen = doch nicht –, dann gleitet
// die Zeile nach unten in „Schon im Wagen“, zugeklappt). „Einkauf fertig“
// legt alles aus dem Wagen nach „Im Haus“ (mit Baustein) und führt zurück.
// Leer: „Für Edeka steht nichts drauf.“ + „Oft bei Edeka“ zum Antippen.
// Zu Hause wie im Laden, es gibt keinen eigenen Einkaufsmodus. Lange drücken
// = „Wo kaufst du das?“ (anderer Laden, Ändern, Löschen). Unten das Feld „Was
// noch bei Rewe?“ mit Vorschlägen beim Tippen; es landet in diesem Laden.
// Mit Konto (Einkauf Teil 6): beim ersten Abhaken (oder unterwegs geöffnet,
// „Ich bin bei REWE“) einmal „Familie Bescheid sagen?“; Neues von anderen
// erscheint gelb mit „Steh grad davor“, „Einkauf fertig“ meldet es.

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUp, Check, ChevronDown } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, INPUT_BASE, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import { addManualItem, noteShopCheck, removeManualItem, renameItem, sectionFor, setHave, setItemShop, toggleChecked, updateManualItem, type ListItem } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { useGoBack } from "@/lib/core/useGoBack";
import { expectReplace, previousUrl } from "@/lib/core/navigation";
import { now, nowIso } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { dueStaples } from "@/lib/einkauf/staples";
import { newId } from "@/lib/einkauf/listModel";
import { useMeineLaeden } from "@/lib/einkauf/meineLaeden";
import { einsortieren, einsortiertText } from "@/lib/einkauf/einsortieren";
import { sachenText, useEinkaufWoche } from "@/lib/einkauf/seite/karten";
import { KATALOG_ALLE } from "@/lib/einkauf/aussuchen/katalog";
import { addTrip, answered, aufLadenSeite, boughtCount, changeBescheid, changeTrips, finishTrip, loadBescheid, newDuringTrip, sameTrip, sendAnswer, tripSuggestions, useBescheid, useTrips } from "@/lib/einkauf/unterwegs/unterwegs";
import { cloudSync, useCachedAccount } from "@/lib/konten/cache";
import { refreshAccount } from "@/lib/konten/account";
import { addedBy } from "@/lib/konten/wer";
import { buzz } from "@/components/heute/actions";
import { LadenZeile } from "@/components/einkauf/seite/LadenZeile";
import { GLEITEN_MS, STEHEN_MS, einkaufFertig, leerVorschlaege, wagenTeilen } from "@/lib/einkauf/wagen/wagen";
import type { Verlauf } from "@/lib/einkauf/aussuchen/abschnitte";
import { recentBought } from "@/lib/einkauf/kacheln/view";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { useFeature } from "@/lib/core/features";
import { EditItemSheet } from "@/components/einkauf/ShoppingParts";
import { WoKaufstDuSheet } from "@/components/einkauf/Einsortieren";
import { BescheidAsk } from "@/components/einkauf/unterwegs/BescheidAsk";
import { ladenFarbe } from "@/components/einkauf/seite/LadenKarten";
import { mitgliedName } from "@/lib/konten/namen";

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
  const router = useRouter();
  // Gerade abgehakt: bleibt kurz stehen (`bleibt`), gleitet dann nach unten (`gleitet`)
  const [bleibt, setBleibt] = useState<string[]>([]);
  const [gleitet, setGleitet] = useState<string[]>([]);
  const uhren = useRef(new Map<string, number[]>());
  const [wagenOffen, setWagenOffen] = useState(false);
  const [leerStand, setLeerStand] = useState<Verlauf | null | undefined>(undefined);
  const hinweisGesehen = useHintSeen("einkauf-wagen");
  const imHausAn = useFeature("vorrat") === true;
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
    const u = uhren.current;
    return () => u.forEach((ids) => ids.forEach((id) => window.clearTimeout(id)));
  }, []);

  // Einkauf mit Familie teilen (einmal je Laden, 3 Std.)
  const share = () => {
    if (!data || !family) return;
    const id = newId();
    const due = dueStaples(data.settings.staples, data.weekStart, data.list, data.weekList);
    changeTrips((t) => addTrip(t, { id, shop, by: mitgliedName(family.me), start: nowIso(), end: null, count: null, vorschlaege: tripSuggestions(due) }, now().getTime()));
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
  const active = bescheid && sameTrip(bescheid.active, shop, now().getTime()) ? bescheid.active : null;
  // Während eines Einkaufs steht hier auch, was andere ohne Laden dazusetzen („Neu von Lisa“)
  const isHere = (i: ListItem) => (shop ? aufLadenSeite(i, shop, active, family?.me.userId ?? null) : !i.shop.trim() && Boolean(i.anywhere));
  const visible = data.list.items.filter((i) => !i.hidden && isHere(i));
  const { hier, wagen } = wagenTeilen(visible, bleibt);
  const imWagen = visible.filter((i) => i.checked && !i.fertig);
  const anzahl = visible.filter((i) => !i.checked).length;
  const leer = !hier.length && !wagen.length;
  // Leer geöffnet: Vorschläge aus dem Stand beim Öffnen (Antippen lässt nichts springen)
  if (leerStand === undefined) setLeerStand(leer ? { itemShops: settings.itemShops, shopRules: settings.shopRules, learned: settings.learned, staples: settings.staples, gekauft: recentBought([data.list.items]) } : null);
  const vorschlagLeer = leerStand ? leerVorschlaege(shop, leerStand, visible.filter((i) => !i.checked).map((i) => i.name)) : null;
  const ask = Boolean(family && active && bescheid?.answer === null);
  const fresh = newDuringTrip(data.list.items, active, family?.me.userId ?? null);
  const trip = active?.tripId ? trips.find((t) => t.id === active.tripId) : undefined;
  const name = shop || "Egal wo";
  const farbe = ladenFarbe(shop);

  /** „Einkauf fertig“: Wagen → Im Haus (mit Baustein), Familie Bescheid, zurück zur Übersicht */
  const fertig = () => {
    if (active?.tripId) {
      const id = active.tripId;
      const count = boughtCount(data.list.items, active);
      changeTrips((t) => finishTrip(t, id, nowIso(), count));
    }
    changeBescheid((b) => ({ ...b, active: null }));
    if (imWagen.length) {
      const { text, undo } = einkaufFertig(weekStart, imWagen, todayIso, imHausAn);
      showToast({ text, undo, undoneText: "Wieder im Wagen", seconds: 4, small: true });
    } else showToast({ text: "Fertig.", seconds: 2, small: true });
    // Zurück zur Übersicht „Einkauf“ (kam man von dort: eine Ebene zurück, sonst dorthin statt der Laden-Seite)
    if (previousUrl() === "/einkaufsliste") goBack("/einkaufsliste");
    else {
      expectReplace();
      router.replace("/einkaufsliste");
    }
  };

  const stopp = (key: string) => {
    uhren.current.get(key)?.forEach((id) => window.clearTimeout(id));
    uhren.current.delete(key);
    setBleibt((l) => l.filter((k) => k !== key));
    setGleitet((l) => l.filter((k) => k !== key));
  };
  const tick = (item: ListItem) => {
    if (!item.checked) {
      buzz();
      beginnen();
      markHintSeen("einkauf-wagen");
      setBleibt((l) => [...l, item.key]);
      // 1 s stehen, dann nach unten gleiten, dann in „Schon im Wagen“
      const a = window.setTimeout(() => setGleitet((l) => [...l, item.key]), STEHEN_MS);
      const b = window.setTimeout(() => stopp(item.key), STEHEN_MS + GLEITEN_MS);
      uhren.current.set(item.key, [a, b]);
      // Lernen bleibt still: im selben Laden abgehakt zählt mit
      if (shop) noteShopCheck(item.name, shop);
    } else stopp(item.key);
    toggleChecked(weekStart, item, todayIso, { imHaus: false });
  };

  /** Löschen samt zusammengefasster Teile, ein Rückgängig */
  const entfernen = (item: ListItem) => {
    const undos = [item.manualId!, ...(item.teile ?? [])].map((id) => removeManualItem(weekStart, id));
    showDeleted(() => undos.reverse().forEach((u) => u()), `${item.name} gelöscht`);
  };

  const add = (text: string) => {
    const clean = text.trim().slice(0, 40);
    if (!clean) return false;
    const n = clean.charAt(0).toLocaleUpperCase("de-DE") + clean.slice(1);
    addManualItem(weekStart, { name: n, amount: "", section: sectionFor(n) });
    if (shop) einsortieren(n, shop, true);
    else setItemShop(n, "");
    setFeld("");
    return true;
  };
  const q = lower(feld);
  const vorschlaege = q.length >= 2 ? [...new Set([...KATALOG_ALLE, ...settings.staples.map((s) => s.name)])].filter((n) => lower(n).includes(q) && !visible.some((i) => lower(i.name) === lower(n) && !i.checked)).slice(0, 5) : [];

  const row = (item: ListItem) => {
    const neu = fresh.has(item.key) ? (addedBy(item.von, family?.members ?? [], family?.me.userId ?? null)?.name ?? "") : undefined;
    return (
      <li
        key={item.key}
        className={`${neu !== undefined ? "bg-warn-soft" : ""} ${gleitet.includes(item.key) ? "translate-y-7 opacity-0 transition-[transform,opacity] duration-[800ms] ease-[cubic-bezier(.16,1,.3,1)] motion-reduce:translate-y-0" : ""}`}
        data-neu={neu !== undefined ? "" : undefined}
      >
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

        {hier.some((i) => !i.checked) && hinweisGesehen === false && <p className="-mb-1 px-1 text-[15px] text-muted" data-wagen-hinweis>Abhaken, was im Wagen liegt.</p>}
        {hier.length > 0 ? (
          <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card" aria-label={name}>
            {hier.map(row)}
          </ul>
        ) : (
          <p className="px-1 text-[17px] font-bold" data-laden-leer={leer ? "" : undefined}>
            {leer ? (shop ? `Für ${shop} steht nichts drauf.` : "Hier steht nichts drauf.") : `Alles für ${name} im Wagen.`}
          </p>
        )}
        {vorschlagLeer && vorschlagLeer.namen.length > 0 && (
          <section aria-label={vorschlagLeer.titel} className="flex flex-col gap-2" data-oft-bei>
            <h2 className={`${SECTION_TITLE} px-1`}>{vorschlagLeer.titel}</h2>
            <div className="flex flex-wrap gap-2">
              {vorschlagLeer.namen.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => {
                    buzz();
                    if (add(v)) showToast({ text: "Steht drin.", seconds: 2, small: true });
                  }}
                  className={`${chipClass(false)} hit min-h-11`}
                  data-vorschlag={v}
                >
                  {v}
                </button>
              ))}
            </div>
          </section>
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

        {wagen.length > 0 && (
          <section aria-label="Schon im Wagen" className="flex flex-col gap-1.5" data-wagen>
            <button type="button" onClick={() => setWagenOffen((o) => !o)} aria-expanded={wagenOffen} className={`${SECTION_TITLE} hit flex items-center gap-1.5 self-start px-1 text-muted`}>
              <Check className="h-4 w-4 text-accent" strokeWidth={2.5} aria-hidden />
              Schon im Wagen
              <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${wagenOffen ? "rotate-180" : ""}`} strokeWidth={2.5} aria-hidden />
            </button>
            {wagenOffen && <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">{wagen.map(row)}</ul>}
          </section>
        )}

        {(imWagen.length > 0 || active?.tripId) && (
          <button type="button" onClick={fertig} className={`${buttonClass("primary", "lg")} w-full`} data-einkauf-fertig>
            Einkauf fertig
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
              ? { label: "Löschen", onClick: () => (entfernen(menu), setMenu(null)) }
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
          remove={editing.manualId ? { label: "Löschen", onClick: () => (entfernen(editing), setEditing(null)) } : { label: "Haben wir schon", onClick: () => (setHave(weekStart, editing.key, true), setEditing(null)) }}
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
