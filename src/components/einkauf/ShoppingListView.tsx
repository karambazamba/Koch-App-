"use client";

// Seite /einkaufsliste – aufgeräumt (Tafel 89): Wochenwechsel in einer Zeile,
// die Laden-Reihe (Alle + „Meine Läden“ + ＋; mit gewähltem Laden „Bei Edeka
// einkaufen ›“), darunter Kacheln: Jetzt mitnehmen · Für heute · „Bald
// wieder fällig“ als eine Zeile · „Alle“ nach Laden in der Reihenfolge von
// „Meine Läden“ („Egal wo“ zuletzt), ein gewählter Laden (oder ohne eigene
// Läden) nach Abteilung im Laufweg · „Hast du bestimmt im Haus“ (Grundsachen)
// · zugeklappt „Zuletzt gekauft“ und „Gerichte ohne Zutaten“ · leise „Liste
// teilen · Stammliste“. Die einmalige Läden-Frage steht nach der Liste (nach
// dem Beispiel, nicht darüber). Erst einsortieren, dann einkaufen (Tafel 99):
// ganz oben die Zone „Noch ohne Laden“ (+ „Mia sortiert“); Tippen = „Wo
// kaufst du das?“ (nie gekauft), lange drücken = bearbeiten. Abgehakt wird
// im Einkaufsmodus oder über „Schon gekauft“.
// Ein Weg zum Eintragen: ＋ oben (Schnelleingabe), dort „Mehr Details“ = Katalog.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, ShoppingBasket, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, CARD_LIST, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import {
  addManualItem,
  carryOverManual,
  dueStaples,
  removeManualItem,
  renameItem,
  sectionFor,
  setHave,
  setItemShop,
  shoppingListText,
  takeStaple,
  toggleChecked,
  updateManualItem,
  type ListItem,
} from "@/lib/einkauf/shoppingList";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { useWeekShoppingList, type WeekChoice } from "@/lib/einkauf/useWeekShoppingList";
import { addDays, formatWeekRange, toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { EditItemSheet, StaplesSheet } from "@/components/einkauf/ShoppingParts";
import { setShopChip, shopModeHref, useShopChip } from "@/lib/einkauf/shopMode";
import { filterByChip, recentBought, resolveChip, shopChips, walkOrder } from "@/lib/einkauf/kacheln/view";
import { gelernterLaden } from "@/lib/einkauf/shopRules";
import { abteilungsGruppen, grundsachen, ladenGruppen } from "@/lib/einkauf/kacheln/gruppen";
import { GruppenListe, GrundsachenKarte, KlappZeile, WochenZeile } from "@/components/einkauf/ListeTeile";
import { useEinkaufBeispiel } from "@/components/einkauf/EinkaufBeispiel";
import { chipIn, shopModeLabel, shopRow, useMeineLaeden, vorauswahl } from "@/lib/einkauf/meineLaeden";
import { LadenFrage, MeineLaedenSheet, ShopDot } from "@/components/einkauf/MeineLaeden";
import { ItemTile, TILE_GRID, type TileSize } from "@/components/einkauf/kacheln/ItemTile";
import { CatalogSheet } from "@/components/einkauf/kacheln/CatalogSheet";
import { StapleBar } from "@/components/einkauf/StapleBar";
import { showDeleted } from "@/lib/core/toast";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { buzz } from "@/components/heute/actions";
import { plusFromLink } from "@/lib/einkauf/unterwegs/unterwegs";
import { AntwortZeile, useDavorLink } from "@/components/einkauf/unterwegs/Antwort";
import { showToast } from "@/lib/core/toast";
import { OhneLadenZone, WoKaufstDuSheet } from "@/components/einkauf/Einsortieren";
import { einsortieren, einsortiertText, miaSortiert, ohneLaden, sortiertText, sortierVorschlaege } from "@/lib/einkauf/einsortieren";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long" });

/** /einkaufsliste: automatisch aus dem Wochenplan, plus eigene Artikel und Stammartikel. */
export function ShoppingListView() {
  const router = useRouter();
  // Start mit der Woche, für die gerade eingekauft wird; dann umschaltbar.
  const [choice, setChoice] = useState<WeekChoice>("planning");
  const data = useWeekShoppingList(choice);
  const today = useToday();
  // Chip gemerkt (pro Gerät): Alle oder ein Laden
  const stored = useShopChip();
  const profile = useProfile();
  const [showHidden, setShowHidden] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [leaving, setLeaving] = useState<string[]>([]);
  const [editing, setEditing] = useState<ListItem | null>(null);
  // „Wo kaufst du das?“ (Antippen) und der eben einsortierte Artikel (kurz umrandet)
  const [sorting, setSorting] = useState<{ item: ListItem; week: string } | null>(null);
  const [marked, setMarked] = useState<string | null>(null);
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState<string | null>(null);
  const [shopsOpen, setShopsOpen] = useState(false);
  const meine = useMeineLaeden();
  const beispiel = useEinkaufBeispiel();
  const myShops = meine?.myShops ?? [];
  // "Für heute" kommt immer aus der laufenden Woche (auch wenn die nächste angezeigt wird)
  const current = useWeekShoppingList("current");
  // Spontan: offene Artikel früherer Wochen in die laufende Woche holen
  const carryWeek = data && !data.planning ? data.weekStart : null;
  useEffect(() => {
    if (carryWeek) carryOverManual(carryWeek);
  }, [carryWeek]);
  // „Steh grad davor“ aus der Mitteilung (Einkauf unterwegs)
  useDavorLink();
  // Schnellknopf „+ Butter“ aus der Mitteilung (Einkauf unterwegs): einmal draufsetzen
  const plusDone = useRef(false);
  const plusWeek = data?.weekStart;
  useEffect(() => {
    if (!data || plusDone.current) return;
    plusDone.current = true;
    const plus = plusFromLink(window.location.search, data.list.items);
    if (!plus) return;
    if (!plus.already) addManualItem(data.weekStart, { name: plus.name, amount: "", section: sectionFor(plus.name) });
    showToast({ text: `${plus.name} steht auf der Liste.` });
    router.replace("/einkaufsliste");
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nur einmal, sobald die Liste da ist
  }, [plusWeek]);
  // „Sortieren ›“ auf der Startseite: oben an der Zone „Noch ohne Laden“ öffnen
  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded && window.location.hash === "#ohne-laden") document.getElementById("ohne-laden")?.scrollIntoView({ block: "start" });
  }, [loaded]);

  if (!data || !today) return SKELETON;
  const { weekStart, isNext, list, weekList, settings } = data;
  const todayIso = toIsoDate(today);
  const range = formatWeekRange(weekStart);
  const visible = list.items.filter((i) => !i.hidden);
  const hidden = list.items.filter((i) => i.hidden);
  const open = visible.filter((i) => !i.checked);
  const due = dueStaples(settings.staples, weekStart, list, weekList);
  const chips = myShops.length ? shopRow(open, myShops) : shopChips(open);
  const chip = myShops.length ? chipIn(chips, stored) : resolveChip(stored, open);
  const shown = (items: ListItem[]) => filterByChip(items, chip);
  const stays = (i: ListItem) => !i.checked || leaving.includes(i.key);
  // Zone „Noch ohne Laden“ (nur unter „Alle“ mit eigenen Läden): steht oben, nicht noch einmal darunter
  const zoneOn = chip === "alle" && myShops.length > 0;
  const zone = zoneOn ? walkOrder(grundsachen(open, settings.alwaysList).liste.filter(ohneLaden)) : [];
  const notInZone = (i: ListItem) => !zone.includes(i);
  const vorschlaege = sortierVorschlaege(zone, { itemShops: settings.itemShops, learned: settings.learned });

  // "Für heute": offene Artikel für heute (aus Ideen, Twist oder Plan) – immer aus der laufenden Woche
  const inWeek = todayIso >= weekStart && todayIso <= addDays(weekStart, 6);
  const todayName = WEEKDAY.format(today);
  const forToday = (i: ListItem) => !i.hidden && i.days.includes(todayName) && stays(i);
  // "Jetzt mitnehmen" (aus dem Supermarkt-Gespräch): oben, bis abgehakt
  const nowItems = shown(visible.filter((i) => i.now && stays(i) && notInZone(i)));
  const todayItems = shown(inWeek ? visible.filter((i) => forToday(i) && !nowItems.includes(i) && notInZone(i)) : (current?.list.items.filter((i) => forToday(i) && !(zoneOn && ohneLaden(i))) ?? []));
  const todayWeek = inWeek ? weekStart : (current?.weekStart ?? weekStart);
  // Grundsachen aus Rezepten („hat man meist da“) in die Karte, nicht auf die Liste
  const basics = grundsachen(visible.filter((i) => !i.checked && !nowItems.includes(i)), settings.alwaysList);
  const weekItems = shown(basics.liste.filter((i) => stays(i) && notInZone(i) && !nowItems.includes(i) && !(inWeek && todayItems.includes(i))));
  const recent = recentBought([visible.filter((i) => !leaving.includes(i.key))]);

  /** „Schon gekauft“ bzw. „Doch kaufen“ – nur über das Fenster, nie durch bloßes Antippen */
  const toggle = (week: string, item: ListItem) => {
    if (!item.checked) {
      buzz();
      setLeaving((l) => [...l, item.key]);
      window.setTimeout(() => setLeaving((l) => l.filter((k) => k !== item.key)), 2000);
    }
    toggleChecked(week, item, todayIso);
  };

  /** Löschen (eigene Artikel) bzw. „Haben wir schon“ (Zutaten aus Gerichten) */
  const removeFor = (item: ListItem, week: string, close: () => void) =>
    item.manualId
      ? {
          label: "Löschen",
          onClick: () => {
            showDeleted(removeManualItem(week, item.manualId!), `${item.name} gelöscht`);
            close();
          },
        }
      : {
          label: "Haben wir schon",
          onClick: () => {
            setHave(week, item.key, true);
            close();
          },
        };

  const share = async (shop?: string) => {
    const text = shoppingListText(list, `🛒 Einkaufsliste ${range}${shop ? ` – ${shop}` : ""}`, shop);
    try {
      if (navigator.share) {
        await navigator.share({ title: "Einkaufsliste", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShareNote(`Liste${shop ? ` für ${shop}` : ""} kopiert – jetzt in WhatsApp oder eine Nachricht einfügen.`);
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if ((error as Error)?.name !== "AbortError") setShareNote("Teilen hat nicht geklappt.");
    }
  };

  /** Laden gewählt: Artikel wandert dorthin, kurze Meldung mit Rückgängig, kurz umrandet */
  const pick = (item: ListItem, shop: string, immer: boolean) => {
    const always = immer && Boolean(shop);
    const undo = einsortieren(item.name, shop, always);
    showToast({ text: einsortiertText(item.name, shop, always), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
    setSorting(null);
    setMarked(item.key);
    window.setTimeout(() => setMarked((k) => (k === item.key ? null : k)), 2000);
  };

  const sortAll = () => {
    const { count, undo } = miaSortiert(zone);
    if (count) showToast({ text: sortiertText(count), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
  };

  const tiles = (items: ListItem[], week: string, size: TileSize = "normal") => (
    <div className={TILE_GRID[size]}>
      {items.map((item) => (
        <ItemTile
          key={item.key}
          name={item.name}
          section={item.section}
          amount={item.amount}
          products={settings.products}
          faded={item.checked}
          marked={marked === item.key}
          size={size}
          label={`${item.name}: Laden wählen`}
          onTap={() => setSorting({ item, week })}
          onLongPress={week === weekStart ? () => setEditing(item) : undefined}
        />
      ))}
    </div>
  );

  const section = (label: string, items: ListItem[], week: string, size: TileSize = "normal") =>
    items.length > 0 && (
      <section aria-label={label} className="flex flex-col gap-2">
        <h2 className={`${SECTION_TITLE} px-1`}>{label}</h2>
        {tiles(items, week, size)}
      </section>
    );

  const selectedChip = chips.find((c) => c.id === chip);
  const selectedShop = selectedChip?.shop;
  // „Alle“ mit eigenen Läden: nach Laden; sonst (oder ein Laden gewählt) nach Abteilung im Laufweg
  const nachLaden = chip === "alle" && myShops.length > 0;
  const gruppen = nachLaden ? ladenGruppen(weekItems, myShops) : abteilungsGruppen(weekItems);
  const nothing = open.length === 0 && recent.length === 0 && !due.length;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einkaufsliste" tippZeigMal={() => setShopsOpen(true)} action={<QuickAddButton weekStart={data.weekStart} settings={data.settings} shop={selectedShop} onMore={setCatalogOpen} className="-mr-1.5" />} />
      <main className={PAGE_MAIN}>
        {data.planning && <WochenZeile isNext={isNext} range={range} onPrev={() => setChoice("current")} onNext={() => setChoice("next")} />}

        {/* Laden-Reihe immer sichtbar: Alle · meine Läden · ＋ */}
        <div className="flex flex-col gap-2">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Laden" data-no-swipe data-laden-reihe>
              {chips.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={c.id === chip} onClick={() => setShopChip(c.id)} className={`${chipClass(c.id === chip)} shrink-0`}>
                  {c.shop && <ShopDot shop={c.shop} />}
                  {c.label}
                </button>
              ))}
              <button type="button" onClick={() => setShopsOpen(true)} aria-label="Meine Läden" className={`${chipClass(false)} shrink-0`}>
                <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            {selectedShop && selectedChip.count > 0 && (
              <Link href={shopModeHref(selectedShop)} className={`${buttonClass("secondary", "md")} self-start`} data-einkaufsmodus>
                <ShoppingCart className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                {shopModeLabel(selectedShop)} ›
              </Link>
            )}
          </div>

        <AntwortZeile />

        {shareNote && <p className="rounded-field bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">{shareNote}</p>}

        <OhneLadenZone count={zone.length} sortierbar={vorschlaege.length} helper={helperName(profile)} onSort={sortAll}>
          {tiles(zone, weekStart)}
        </OhneLadenZone>

        {nothing && beispiel ? (
          beispiel
        ) : nothing ? (
          <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-8 text-center`}>
            <ShoppingBasket className="h-8 w-8 text-accent" strokeWidth={1.75} aria-hidden />
            <p className="text-base font-semibold">Die Liste ist leer.</p>
            <p className="text-sm text-muted">Sag {helperName(profile)} einfach, was ihr braucht. Oder tipp oben auf ＋.</p>
          </div>
        ) : null}

        {section("Jetzt mitnehmen", nowItems, weekStart)}
        {section("Für heute", todayItems, todayWeek)}

        {due.length > 0 && chip === "alle" && <StapleBar staples={due} onTake={(st) => takeStaple(weekStart, st)} />}

        <GruppenListe gruppen={gruppen} nachLaden={nachLaden} tiles={(items) => tiles(items, weekStart)} />
        {!nachLaden && selectedShop && gruppen.length > 0 && <p className="-mt-2 px-1 text-xs text-muted">Sortiert wie dein Weg durch den Laden</p>}

        {open.length > 0 && <p className="px-1 text-xs text-muted">Antippen: Laden wählen. Abhaken im Laden.</p>}

        {chip === "alle" && (
          <GrundsachenKarte
            items={basics.karte}
            onAdd={(i) => {
              addManualItem(weekStart, { name: i.name, amount: i.amount, section: i.section });
              showToast({ text: `${i.name} steht auf der Liste.`, small: true });
            }}
          />
        )}

        {meine && !meine.shopsAsked && <LadenFrage shops={settings.shops} preselected={vorauswahl(settings.itemShops)} />}

        {recent.length > 0 && (
          <KlappZeile name="Zuletzt gekauft" label={`Zuletzt gekauft · ${recent.length}`}>
            {tiles(recent, weekStart, "compact")}
          </KlappZeile>
        )}

        {data.planning && list.missing.length > 0 && (
          <KlappZeile name="Gerichte ohne Zutaten" label={`${list.missing.length} ${list.missing.length === 1 ? "Gericht" : "Gerichte"} ohne Zutaten`}>
            <p className="px-1 text-sm text-muted">{list.missing.join(", ")}. Selbst ergänzen geht oben über ＋.</p>
          </KlappZeile>
        )}

        {hidden.length > 0 && (
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => setShowHidden((v) => !v)} className="self-start px-1 text-sm font-semibold text-muted underline">
              Haben wir schon – {showHidden ? "ausblenden" : "anzeigen"}
            </button>
            {showHidden && (
              <ul className={CARD_LIST}>
                {hidden.map((item) => (
                  <li key={item.key} className="flex items-center gap-3 px-4 py-2">
                    <span className="min-w-0 flex-1 truncate text-muted">{item.name}</span>
                    <button type="button" onClick={() => setHave(weekStart, item.key, false)} className={buttonClass("soft", "sm")}>
                      Doch kaufen
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <p className="flex items-center justify-center gap-1 text-[13px] font-semibold text-muted" data-leise>
          {open.length > 0 && (
            <>
              <button type="button" onClick={() => share(selectedShop)} className="hit px-1">
                {selectedShop ? `Liste für ${selectedShop} teilen` : "Liste teilen"}
              </button>
              <span aria-hidden>·</span>
            </>
          )}
          <button type="button" onClick={() => setStaplesOpen(true)} className="hit px-1">
            Stammliste
          </button>
        </p>
      </main>

      {catalogOpen !== null && <CatalogSheet weekStart={weekStart} settings={settings} open={open} recent={recent} myShops={myShops} tab={selectedShop} initialQuery={catalogOpen} onClose={() => setCatalogOpen(null)} />}
      {shopsOpen && <MeineLaedenSheet shops={settings.shops} myShops={myShops} rules={settings.shopRules} onClose={() => setShopsOpen(false)} />}
      {sorting && (
        <WoKaufstDuSheet
          item={sorting.item}
          myShops={myShops}
          vorschlag={sorting.item.shop ? null : gelernterLaden(sorting.item.name, { itemShops: settings.itemShops, learned: settings.learned })}
          products={settings.products}
          onPick={(shop, immer) => pick(sorting.item, shop, immer)}
          onBought={() => {
            toggle(sorting.week, sorting.item);
            setSorting(null);
          }}
          onEdit={() => {
            setEditing(sorting.item);
            setSorting(null);
          }}
          remove={removeFor(sorting.item, sorting.week, () => setSorting(null))}
          onClose={() => setSorting(null)}
        />
      )}
      {editing && (
        <EditItemSheet
          item={editing}
          settings={settings}
          onClose={() => setEditing(null)}
          remove={removeFor(editing, weekStart, () => setEditing(null))}
          onSave={({ name, always, shop, amount }) => {
            if (name.trim() !== editing.name) renameItem(weekStart, editing, name, always);
            if (editing.manualId && amount !== editing.amount) updateManualItem(weekStart, editing.manualId, { amount });
            const finalName = name.trim() || editing.name;
            if (shop !== editing.shop || finalName !== editing.name) setItemShop(finalName, shop);
            setEditing(null);
          }}
        />
      )}
      {staplesOpen && <StaplesSheet settings={settings} onClose={() => setStaplesOpen(false)} />}
    </div>
  );
}
