"use client";

// Seite /einkaufsliste: Woche wählen, „Was fehlt?“, Abteilungen oder Läden,
// „Für heute“, fällige Stammartikel (StapleBar.tsx), Erledigtes und Teilen.

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Beef,
  CalendarCheck,
  Carrot,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Croissant,
  CupSoda,
  EyeOff,
  Milk,
  Package,
  Pencil,
  PenLine,
  Repeat,
  Share2,
  ShoppingBag,
  Snowflake,
  Store,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { CARD, CARD_LIST, ICON_BUTTON, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import {
  SECTIONS,
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
  type Section,
} from "@/lib/einkauf/shoppingList";
import { QuickAddButton, ShoppingAddField } from "@/components/einkauf/QuickAdd";
import { useWeekShoppingList, type WeekChoice } from "@/lib/einkauf/useWeekShoppingList";
import { addDays, formatWeekRange, toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { EditItemSheet, ItemContent, StaplesSheet, SwipeRow, type RowAction } from "@/components/einkauf/ShoppingParts";
import { setShoppingView, shopModeHref, useShoppingView } from "@/lib/einkauf/shopMode";
import { shopGroups, shopTone } from "@/lib/einkauf/shopGroups";
import { StapleBar } from "@/components/einkauf/StapleBar";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;

/** Abteilungen als Linien-Icons (das Emoji in SECTIONS bleibt für den Teilen-Text) */
const SECTION_ICONS: Record<Section, LucideIcon> = {
  "obst-gemuese": Carrot,
  "fleisch-fisch": Beef,
  kuehlregal: Milk,
  brot: Croissant,
  vorrat: Package,
  tiefkuehl: Snowflake,
  getraenke: CupSoda,
  sonstiges: ShoppingBag,
};

const WEEKDAY = new Intl.DateTimeFormat("de-DE", { weekday: "long" });

type Group = { id: string; label: string; icon: LucideIcon; items: ListItem[]; shop?: string };

/** /einkaufsliste: automatisch aus dem Wochenplan, plus eigene Artikel und Stammartikel. */
export function ShoppingListView() {
  // Start mit der Woche, für die gerade eingekauft wird; dann umschaltbar.
  const [choice, setChoice] = useState<WeekChoice>("planning");
  const data = useWeekShoppingList(choice);
  // Wochenplan-Oberfläche versteckt (Neustart): kein Verweis dorthin
  const today = useToday();
  // Ansicht gemerkt (pro Gerät): nach Abteilung oder nach Laden
  const mode = useShoppingView();
  const [showHidden, setShowHidden] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [expanded, setExpanded] = useState<string[]>([]);
  const [leaving, setLeaving] = useState<string[]>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [editing, setEditing] = useState<ListItem | null>(null);
  const [staplesOpen, setStaplesOpen] = useState(false);
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
  const due = dueStaples(settings.staples, weekStart, list, weekList);

  // "Für heute": offene Artikel für heute (aus Ideen, Twist oder Plan) – immer aus der laufenden Woche
  const inWeek = todayIso >= weekStart && todayIso <= addDays(weekStart, 6);
  const todayName = WEEKDAY.format(today);
  const forToday = (i: ListItem) => !i.checked && !i.hidden && i.days.includes(todayName);
  // "Jetzt mitnehmen" (aus dem Supermarkt-Gespräch): oben, bis abgehakt
  const nowItems = visible.filter((i) => i.now && !i.checked);
  const todayItems = inWeek ? visible.filter((i) => forToday(i) && !nowItems.includes(i)) : (current?.list.items.filter(forToday) ?? []);
  const todayWeek = inWeek ? weekStart : (current?.weekStart ?? weekStart);
  const grouped = visible.filter((i) => !(i.now && !i.checked) && !(inWeek && todayItems.includes(i)));

  const toggle = (item: ListItem) => {
    if (!item.checked) {
      setLeaving((l) => [...l, item.key]);
      window.setTimeout(() => setLeaving((l) => l.filter((k) => k !== item.key)), 2000);
    }
    toggleChecked(weekStart, item, todayIso);
  };
  const doneItems = grouped.filter((i) => i.checked && !leaving.includes(i.key));

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

  // Gruppen: nach Abteilung (Supermarkt-Reihenfolge) oder nach Laden
  const groups: Group[] =
    mode === "abteilung"
      ? SECTIONS.map((s) => ({ id: s.value, label: s.label, icon: SECTION_ICONS[s.value], items: grouped.filter((i) => i.section === s.value) }))
      : [
          ...[...new Set(grouped.map((i) => i.shop).filter(Boolean))]
            .sort((a, b) => a.localeCompare(b, "de"))
            .map((shop) => ({ id: `laden:${shop}`, label: shop, icon: Store, shop, items: grouped.filter((i) => i.shop === shop) })),
          { id: "laden:", label: "Ohne Laden", icon: ShoppingBag, items: grouped.filter((i) => !i.shop) },
        ];

  const actionsFor = (item: ListItem): RowAction[] => [
    item.manualId
      ? { label: "Löschen", icon: Trash2, tone: "danger", onClick: () => removeManualItem(weekStart, item.manualId!) }
      : { label: "Haben wir", icon: EyeOff, onClick: () => setHave(weekStart, item.key, true) },
    { label: "Bearbeiten", icon: Pencil, onClick: () => setEditing(item) },
  ];

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

        {/* Großes Feld „Was fehlt?“ immer oben (mit Mikrofon, mehrere mit Komma, „Oft gekauft“) */}
        <ShoppingAddField weekStart={weekStart} settings={settings} />

        <Segmented
          label="Sortierung"
          value={mode}
          onChange={setShoppingView}
          options={[
            { value: "abteilung", label: "Nach Abteilung" },
            { value: "laden", label: "Nach Laden" },
          ]}
        />

        {(() => {
          // Im Laden? → Einkaufsmodus (Läden mit offenen Sachen, meiste zuerst)
          const shops = shopGroups(visible.filter((i) => !i.checked), 4).filter((g) => g.shop);
          return shops.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 px-1" aria-label="Einkaufen bei">
              <span className="text-sm font-semibold text-muted">Einkaufen bei</span>
              {shops.map((g) => (
                <Link key={g.shop} href={shopModeHref(g.shop!)} className={`${chipClass(false)} gap-1.5`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: `var(--app-shop-${shopTone(g.shop!)})` }} aria-hidden />
                  {g.shop}
                </Link>
              ))}
            </div>
          ) : null;
        })()}

        {shareNote && <p className="rounded-field bg-accent-soft px-4 py-2 text-sm font-semibold text-accent-strong">{shareNote}</p>}

        {nowItems.length > 0 && (
          <section aria-label="Jetzt mitnehmen" className="flex flex-col gap-1.5">
            <h2 className="flex items-center gap-1.5 px-1 text-[15px] font-extrabold text-accent-strong">
              <ShoppingBag className="h-4 w-4" strokeWidth={2} aria-hidden />
              Jetzt mitnehmen
            </h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {nowItems.map((item) => (
                <SwipeRow key={item.key} label={item.name} actions={actionsFor(item)} onLongPress={() => setInfo(info === item.key ? null : item.key)}>
                  <ItemContent item={item} onToggle={() => toggle(item)} onInfo={() => setInfo(info === item.key ? null : item.key)} infoOpen={info === item.key} />
                </SwipeRow>
              ))}
            </ul>
          </section>
        )}

        {todayItems.length > 0 && (
          <section aria-label="Für heute" className="flex flex-col gap-1.5">
            <h2 className="flex items-center gap-1.5 px-1 text-[15px] font-extrabold text-accent-strong">
              <CalendarCheck className="h-4 w-4" strokeWidth={2} aria-hidden />
              Für heute
            </h2>
            <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
              {todayItems.map((item) => (
                <SwipeRow key={item.key} label={item.name} actions={inWeek ? actionsFor(item) : []} onLongPress={() => setInfo(info === item.key ? null : item.key)}>
                  <ItemContent item={item} onToggle={() => toggleChecked(todayWeek, item, todayIso)} onInfo={() => setInfo(info === item.key ? null : item.key)} infoOpen={info === item.key} />
                </SwipeRow>
              ))}
            </ul>
          </section>
        )}
        {todayItems.length > 0 && grouped.length > 0 && <h2 className="-mb-1 mt-1 px-1 text-[15px] font-extrabold text-muted">Für die Woche</h2>}

        {due.length > 0 && (
          <StapleBar staples={due} onTake={(st) => takeStaple(weekStart, st)} onSkip={(st) => skipStaple(weekStart, st)} onManage={() => setStaplesOpen(true)} />
        )}

        {data.planning && list.missing.length > 0 && (
          <p className="flex items-start gap-2 px-1 text-sm text-muted">
            <PenLine className="mt-0.5 h-4 w-4 shrink-0 text-accent" strokeWidth={2} aria-hidden />
            <span>Ohne Zutaten: {list.missing.join(", ")} – selbst ergänzen.</span>
          </p>
        )}


        {groups.map((group) => {
          // Abgehaktes steht gesammelt unten unter „Erledigte anzeigen“
          const open = group.items.filter((i) => !i.checked);
          if (open.length === 0 && !group.items.some((i) => leaving.includes(i.key))) return null;
          // eben Abgehaktes bleibt kurz durchgestrichen stehen, dann rutscht es nach unten
          const checked = group.items.filter((i) => i.checked && leaving.includes(i.key));
          const Icon = group.icon;
          return (
            <section key={group.id} aria-label={group.label} className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 px-1">
                <h2 className="flex min-w-0 flex-1 items-center gap-1.5 text-[15px] font-extrabold text-muted">
                  {group.shop ? (
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(--app-shop-${shopTone(group.shop)})` }} aria-hidden />
                  ) : (
                    <Icon className="h-4 w-4 text-accent" strokeWidth={2} aria-hidden />
                  )}
                  <span className="truncate">{group.label}</span>
                </h2>
                {group.shop && (
                  <Link href={shopModeHref(group.shop)} className="hit flex h-8 items-center rounded-full bg-accent-soft px-3 text-[13px] font-bold text-accent-strong">
                    Einkaufen
                  </Link>
                )}
                {group.shop && (
                  <button
                    type="button"
                    onClick={() => share(group.shop)}
                    aria-label={`Liste für ${group.shop} teilen`}
                    className="flex h-8 w-8 items-center justify-center text-muted"
                  >
                    <Share2 className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                  </button>
                )}
              </div>
              {(
                <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                  {[...open, ...checked].map((item) => (
                    <SwipeRow key={item.key} label={item.name} actions={actionsFor(item)} onLongPress={() => setInfo(info === item.key ? null : item.key)}>
                      <ItemContent
                        item={item}
                        onToggle={() => toggle(item)}
                        onInfo={() => setInfo(info === item.key ? null : item.key)}
                        infoOpen={info === item.key}
                      />
                    </SwipeRow>
                  ))}
                </ul>
              )}
            </section>
          );
        })}

        {visible.length > 0 && <p className="-mt-2 px-1 text-xs text-muted">Nach links wischen: „Haben wir schon“ oder bearbeiten.</p>}

        {doneItems.length > 0 && (
          <section aria-label="Erledigt" className="flex flex-col gap-1.5">
            <button type="button" onClick={() => setExpanded((e) => (e.includes("erledigt") ? e.filter((x) => x !== "erledigt") : [...e, "erledigt"]))} aria-expanded={expanded.includes("erledigt")} className="hit flex items-center gap-1.5 self-start px-1 text-sm font-semibold text-muted">
              <Check className="h-4 w-4 text-good" strokeWidth={2.5} aria-hidden />
              {expanded.includes("erledigt") ? "Erledigte ausblenden" : "Erledigte anzeigen"}
              <ChevronDown className={`h-4 w-4 transition ${expanded.includes("erledigt") ? "rotate-180" : ""}`} strokeWidth={2.25} aria-hidden />
            </button>
            {expanded.includes("erledigt") && (
              <ul className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
                {doneItems.map((item) => (
                  <SwipeRow key={item.key} label={item.name} actions={actionsFor(item)} onLongPress={() => setInfo(info === item.key ? null : item.key)}>
                    <ItemContent item={item} onToggle={() => toggle(item)} onInfo={() => setInfo(info === item.key ? null : item.key)} infoOpen={info === item.key} />
                  </SwipeRow>
                ))}
              </ul>
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

        {visible.some((i) => !i.checked) && (
          <button type="button" onClick={() => share()} className="hit -mt-1 flex items-center gap-1.5 self-start px-1 text-sm font-semibold text-muted">
            <Share2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            Liste teilen
          </button>
        )}
        <button type="button" onClick={() => setStaplesOpen(true)} className="hit -mt-1 flex items-center gap-1.5 self-start px-1 text-sm font-semibold text-muted">
          <Repeat className="h-4 w-4" strokeWidth={2} aria-hidden />
          Stammliste ansehen
        </button>
      </main>

      {editing && (
        <EditItemSheet
          item={editing}
          settings={settings}
          onClose={() => setEditing(null)}
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
