"use client";

// Seite /einkaufsliste – einfach wie Bring (Tafel 35): oben die Läden als
// Chips (gewählten Laden nochmal tippen = Einkaufsmodus), darunter Kacheln:
// Jetzt mitnehmen · Für heute · Bald wieder fällig · Für die Woche · Zuletzt
// gekauft. Tippen = gekauft, lange drücken = bearbeiten. Unten der große
// Knopf „Mehr hinzufügen“ (Katalog mit Suche und Mikro).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, PenLine, Plus, Repeat, Share2, ShoppingBasket } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, CARD_LIST, ICON_BUTTON, PAGE_MAIN, SECTION_TITLE, buttonClass, chipClass } from "@/components/ui/styles";
import {
  carryOverManual,
  dueStaples,
  removeManualItem,
  renameItem,
  setHave,
  setItemShop,
  shoppingListText,
  skipStaple,
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
import { shopTone } from "@/lib/einkauf/shopGroups";
import { RECENT_FOLD, filterByChip, isCompact, recentBought, resolveChip, shopChips, walkOrder } from "@/lib/einkauf/kacheln/view";
import { ItemTile, TILE_GRID, dishLabel, type TileSize } from "@/components/einkauf/kacheln/ItemTile";
import { CatalogSheet } from "@/components/einkauf/kacheln/CatalogSheet";
import { StapleBar } from "@/components/einkauf/StapleBar";
import { showDeleted } from "@/lib/core/toast";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { buzz } from "@/components/heute/actions";

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
  const [allRecent, setAllRecent] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [leaving, setLeaving] = useState<string[]>([]);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [staplesOpen, setStaplesOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  // "Für heute" kommt immer aus der laufenden Woche (auch wenn die nächste angezeigt wird)
  const current = useWeekShoppingList("current");
  // Spontan: offene Artikel früherer Wochen in die laufende Woche holen
  const carryWeek = data && !data.planning ? data.weekStart : null;
  useEffect(() => {
    if (carryWeek) carryOverManual(carryWeek);
  }, [carryWeek]);

  if (!data || !today) return SKELETON;
  const { weekStart, isNext, list, weekList, settings } = data;
  const todayIso = toIsoDate(today);
  const range = formatWeekRange(weekStart);
  const visible = list.items.filter((i) => !i.hidden);
  const hidden = list.items.filter((i) => i.hidden);
  const open = visible.filter((i) => !i.checked);
  const due = dueStaples(settings.staples, weekStart, list, weekList);
  const chips = shopChips(open);
  const chip = resolveChip(stored, open);
  const shown = (items: ListItem[]) => filterByChip(items, chip);
  const stays = (i: ListItem) => !i.checked || leaving.includes(i.key);

  // "Für heute": offene Artikel für heute (aus Ideen, Twist oder Plan) – immer aus der laufenden Woche
  const inWeek = todayIso >= weekStart && todayIso <= addDays(weekStart, 6);
  const todayName = WEEKDAY.format(today);
  const forToday = (i: ListItem) => !i.hidden && i.days.includes(todayName) && stays(i);
  // "Jetzt mitnehmen" (aus dem Supermarkt-Gespräch): oben, bis abgehakt
  const nowItems = shown(visible.filter((i) => i.now && stays(i)));
  const todayItems = shown(inWeek ? visible.filter((i) => forToday(i) && !nowItems.includes(i)) : (current?.list.items.filter(forToday) ?? []));
  const todayWeek = inWeek ? weekStart : (current?.weekStart ?? weekStart);
  const weekItems = walkOrder(shown(visible.filter((i) => stays(i) && !nowItems.includes(i) && !(inWeek && todayItems.includes(i)))));
  const recent = recentBought([visible.filter((i) => !leaving.includes(i.key))]);
  const recentShown = allRecent || recent.length <= RECENT_FOLD ? recent : recent.slice(0, RECENT_FOLD);

  const toggle = (week: string, item: ListItem) => {
    if (!item.checked) {
      buzz();
      setLeaving((l) => [...l, item.key]);
      window.setTimeout(() => setLeaving((l) => l.filter((k) => k !== item.key)), 2000);
    }
    toggleChecked(week, item, todayIso);
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

  const tiles = (items: ListItem[], week: string, size: TileSize = "normal") => (
    <div className={TILE_GRID[size]}>
      {items.map((item) => (
        <ItemTile
          key={item.key}
          name={item.name}
          section={item.section}
          amount={item.amount}
          dish={item.checked ? "" : dishLabel(item.dishes)}
          products={settings.products}
          checked={item.checked}
          size={size}
          label={`${item.name} ${item.checked ? "nicht mehr abhaken" : "abhaken"}`}
          onTap={() => toggle(week, item)}
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

  const selectedShop = chips.find((c) => c.id === chip)?.shop;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Einkaufsliste" action={<QuickAddButton weekStart={data.weekStart} settings={data.settings} className="-mr-1.5" />} />
      <main className={PAGE_MAIN}>
        {data.planning && (
          <div className="flex items-center justify-between gap-2">
            <button type="button" onClick={() => setChoice("current")} disabled={!isNext} aria-label="Diese Woche" className={ICON_BUTTON}>
              <ChevronLeft className="h-6 w-6" strokeWidth={2.25} aria-hidden />
            </button>
            <div className="text-center">
              <p className="text-lg font-bold">{isNext ? "Nächste Woche" : "Diese Woche"}</p>
              <p className="whitespace-nowrap text-sm text-muted">{range}</p>
            </div>
            <button type="button" onClick={() => setChoice("next")} disabled={isNext} aria-label="Nächste Woche" className={ICON_BUTTON}>
              <ChevronRight className="h-6 w-6" strokeWidth={2.25} aria-hidden />
            </button>
          </div>
        )}

        {chips.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="radiogroup" aria-label="Laden" data-no-swipe>
              {chips.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={c.id === chip}
                  onClick={() => (c.id === chip && c.shop ? router.push(shopModeHref(c.shop)) : setShopChip(c.id))}
                  className={`${chipClass(c.id === chip)} shrink-0`}
                >
                  {c.shop && <span className="h-2 w-2 rounded-full" style={{ background: `var(--app-shop-${shopTone(c.shop)})` }} aria-hidden />}
                  {c.label}
                  <span className="text-[13px] tabular-nums text-muted">{c.count}</span>
                </button>
              ))}
            </div>
            {selectedShop && (
              <p className="px-1 text-xs text-muted">
                Nochmal auf {selectedShop} tippen: Einkaufsmodus.
              </p>
            )}
          </div>
        )}

        {shareNote && <p className="rounded-field bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">{shareNote}</p>}

        {open.length === 0 && recent.length === 0 && !due.length && (
          <div className={`${CARD} flex flex-col items-center gap-2 px-6 py-8 text-center`}>
            <ShoppingBasket className="h-8 w-8 text-accent" strokeWidth={1.75} aria-hidden />
            <p className="text-base font-semibold">Die Liste ist leer.</p>
            <p className="text-sm text-muted">Sag {helperName(profile)} einfach, was ihr braucht – oder such es unten aus.</p>
          </div>
        )}

        {section("Jetzt mitnehmen", nowItems, weekStart)}
        {section("Für heute", todayItems, todayWeek)}

        {due.length > 0 && chip === "alle" && (
          <StapleBar staples={due} onTake={(st) => takeStaple(weekStart, st)} onSkip={(st) => skipStaple(weekStart, st)} onManage={() => setStaplesOpen(true)} />
        )}

        {section(todayItems.length || nowItems.length ? "Für die Woche" : "Auf der Liste", weekItems, weekStart, isCompact(weekItems.length) ? "compact" : "normal")}

        {data.planning && list.missing.length > 0 && (
          <p className="flex items-start gap-2 px-1 text-sm text-muted">
            <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <span>Ohne Zutaten: {list.missing.join(", ")} – selbst ergänzen.</span>
          </p>
        )}

        {open.length > 0 && <p className="-mt-2 px-1 text-xs text-muted">Antippen: gekauft. Lange drücken: ändern.</p>}

        {recent.length > 0 && (
          <section aria-label="Zuletzt gekauft" className="flex flex-col gap-2">
            <h2 className={`${SECTION_TITLE} px-1`}>Zuletzt gekauft</h2>
            {tiles(recentShown, weekStart, "compact")}
            {recent.length > RECENT_FOLD && (
              <button type="button" onClick={() => setAllRecent((v) => !v)} aria-expanded={allRecent} className="hit self-start px-1 text-sm font-semibold text-muted">
                {allRecent ? "Weniger zeigen" : `Alle ${recent.length} zeigen`}
              </button>
            )}
          </section>
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

        <div className="flex flex-wrap gap-x-4">
          {open.length > 0 && (
            <button type="button" onClick={() => share(selectedShop)} className="hit flex items-center gap-1.5 px-1 text-sm font-semibold text-muted">
              <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
              {selectedShop ? `Liste für ${selectedShop} teilen` : "Liste teilen"}
            </button>
          )}
          <button type="button" onClick={() => setStaplesOpen(true)} className="hit flex items-center gap-1.5 px-1 text-sm font-semibold text-muted">
            <Repeat className="h-4 w-4" strokeWidth={2} aria-hidden />
            Stammliste ansehen
          </button>
        </div>
      </main>

      {/* Großer Knopf unten, rechts bleibt Platz für Mia */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-10 pb-[max(1rem,env(safe-area-inset-bottom))] pl-4 pr-28" data-einkauf-knopf>
        <button
          type="button"
          onClick={() => setCatalogOpen(true)}
          className={`${buttonClass("primary", "lg")} pointer-events-auto mb-2 w-full max-w-sm whitespace-nowrap px-4 shadow-float`}
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} aria-hidden />
          Mehr hinzufügen
        </button>
      </div>

      {catalogOpen && <CatalogSheet weekStart={weekStart} settings={settings} open={open} recent={recent} onClose={() => setCatalogOpen(false)} />}
      {editing && (
        <EditItemSheet
          item={editing}
          settings={settings}
          onClose={() => setEditing(null)}
          remove={
            editing.manualId
              ? {
                  label: "Löschen",
                  onClick: () => {
                    showDeleted(removeManualItem(weekStart, editing.manualId!), `${editing.name} gelöscht`);
                    setEditing(null);
                  },
                }
              : {
                  label: "Haben wir schon",
                  onClick: () => {
                    setHave(weekStart, editing.key, true);
                    setEditing(null);
                  },
                }
          }
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
