"use client";

// Kacheln auf "Heute" je Größe (S/M/L): Essen, Einkauf, Notizen, Vorrat,
// Morgen. S = halbe Breite (allein: breit, gleicher Inhalt), M/L = volle
// Breite mit mehr Inhalt. Antippen öffnet die Seite, der kleine Knopf oben
// rechts legt schnell Neues an.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pin, PenLine, Refrigerator, ShoppingCart, StickyNote } from "lucide-react";
import { TILE, TILE_LABEL, buttonClass } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { clockLabel, itemText } from "@/lib/kalender/answers";
import { tomorrowLabel, weekdayShort, type DayItem } from "@/lib/kalender/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays, todayIso } from "@/lib/core/now";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock, stockLine } from "@/lib/essen/dishIdeas";
import { houseTile } from "@/lib/vorrat/imHaus";
import { openHelper } from "@/lib/begleitung/open";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { usePantry } from "@/lib/vorrat/pantry";
import { takeDish } from "@/components/heute/takeDish";
import { essenKopf, foodTileView, kachelBild, naechsteIdee, takeLabel } from "@/lib/heute/essenKachel";
import { merkeGezeigt } from "@/lib/essen/ideenGezeigt";
import type { Idea } from "@/lib/essen/ideas";
import { GerichtSheet } from "@/components/essen/GerichtSheet";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { useStock } from "@/lib/essen/useStock";
import { recipeHref } from "@/lib/essen/baking";
import { DEMO_SHOPS, clearDemoTile } from "@/lib/core/demo";
import { shopTone, tileArt, tileRows, type TileRows } from "@/lib/einkauf/shopGroups";
import { symbolReihe } from "@/lib/einkauf/kacheln/abteilung";
import { setShopChip } from "@/lib/einkauf/shopMode";
import { useMeineLaeden } from "@/lib/einkauf/meineLaeden";
import type { ShopChip } from "@/lib/einkauf/kacheln/view";
import { useNotes } from "@/lib/notizen";
import { openQuick } from "@/lib/core/schnelleingabe";
import { notizZeilen } from "@/lib/heute/notizenKachel";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf } from "@/components/essen/useMeals";
import { KochideeKnopf } from "@/components/essen/kochtipp/KochideeKnopf";
import { DishTile } from "@/components/essen/DishTile";
import { helperName } from "@/lib/einstellungen/profile";

const HALF = `${TILE} flex min-h-[92px] flex-col p-3.5`;
/** Wochenkarte (Essen-Seite) */
const WEEK_HREF = "/?seite=essen";
const HALF_LABEL = `flex min-w-0 items-center gap-1.5 ${TILE_LABEL}`;

/** ESSEN – immer eine Bild-Kachel (`DishTile`): Gericht (geplant, morgen, Vorschlag) bzw. leerer Teller („Noch frei“, „Kein Kochtag“) */
/** `hat`: Kochidee-Knopf oben rechts – `null` = keiner, sonst ob sein Hinweis gerade still sein soll */
export function FoodTile({ data, dish, over, dishClock, onOpen, size = "S", onCook, hat = null }: { data: HomeData; dish: string | null; over: boolean; dishClock: string | null; onOpen: () => void; size?: TileSize; onCook?: () => void; hat?: { quiet: boolean } | null }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const stock = useStock();
  const [alt, setAlt] = useState<number | null>(null);
  const [chosen, setChosen] = useState<Idea | null>(null);
  const list = ideas?.ideas ?? [];
  const idea = alt !== null && list.length ? list[alt % list.length] : null;
  // Gezeigte Idee merken (rückt an den nächsten Tagen nach hinten, wenn sie nicht genommen wird)
  const ideaTitle = idea?.title ?? null;
  useEffect(() => {
    if (ideaTitle) merkeGezeigt([ideaTitle], todayIso());
  }, [ideaTitle]);
  const day: PlanDay | undefined = over ? data.tomorrow : data.day;
  const away = day?.away ? (day.paused ? "Pause" : "Kein Kochtag") : null;
  const view = foodTileView({ over, today: dish, tomorrow: dishOf(data.tomorrow), idea: idea?.title ?? null, away, ideas: list.length });
  const entry = day && !day.away ? day.slot.entry : null;
  const recipe = view.kind === "geplant" && entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const match = recipe && stock ? matchStock(recipe.ingredients.map((i) => i.name), stock, todayIso()) : null;
  // Für „Was anderes?“ zählt nur ein heute geplantes Gericht (nach dem Abendessen: frei für morgen)
  const planned = over ? null : dish;
  /** Vorschlag nehmen – tagsüber für heute, nach dem Essen für morgen */
  const take = (it: Idea) => {
    if (!takeDish(data, it, over ? addDays(todayIso(), 1) : todayIso())) return;
    setAlt(null);
    setChosen(null);
  };
  const base = over ? tomorrowLabel(addDays(todayIso(), 1)) : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`;
  // Kopfzeile einzeilig: Personenzahl nur ab M und kurz („für 4“)
  const label = essenKopf(base, view.kind === "frei" ? null : (day?.persons ?? null), size);
  const corner = hat && <KochideeKnopf name={helperName(data.profile)} planned={planned} quiet={hat.quiet} />;
  // „Was anderes?“ wechselt die Idee (nicht bei einem heute geplanten Gericht und nicht neben dem Kochidee-Knopf)
  const swap = list.length > 0 && !hat && !(view.kind === "geplant" && view.when === "heute") && (
    <button
      type="button"
      aria-label="Andere Idee"
      onClick={(e) => {
        e.stopPropagation();
        setAlt((a) => naechsteIdee(list.map((i) => i.title), a, view.title) ?? a);
      }}
      className="hit absolute right-2 top-2 z-10 flex items-center active:scale-95"
    >
      <span className="flex h-[26px] items-center rounded-full bg-tile-inner px-2.5 text-[12.5px] font-bold text-tile-accent shadow-card">Was anderes?</span>
    </button>
  );
  // Jeder Zustand als Bild-Kachel – Antippen öffnet genau dieses Gericht (frei: die Essen-Seite)
  const facts = view.kind === "geplant" && view.when === "heute" ? [recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : "", match ? stockLine(match).text : ""].filter(Boolean).join(" · ") : "";
  const sub = view.kind === "vorschlag" ? "Vorschlag" : view.kind === "frei" ? (view.ideen && !away ? `${Math.min(3, list.length)} Ideen ansehen` : undefined) : facts || undefined;
  const open = view.kind === "vorschlag" ? () => setChosen(idea) : recipe ? `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}` : onOpen;
  const picture = kachelBild(view, view.kind === "vorschlag" ? { category: idea?.category } : { ingredients: recipe?.ingredients.map((i) => i.name), category: recipe?.category ?? entry?.category });
  return (
    <>
      <DishTile
        when={label}
        title={view.title}
        sub={sub}
        picture={picture}
        open={open}
        cook={view.kind === "geplant" && view.when === "heute" ? onCook : undefined}
        half={size === "S"}
        label={`${label} · ${view.title}${view.kind === "vorschlag" ? " · Vorschlag" : ""}`}
        corner={corner || swap}
        week={WEEK_HREF}
      />
      {chosen && <GerichtSheet dish={chosen} take={takeLabel(over ? "morgen" : "heute")} onTake={() => take(chosen)} onClose={() => setChosen(null)} recipeHref={recipeHref(data.recipes, chosen.recipeId) ?? undefined} />}
    </>
  );
}

/** Laden-Zeile antippen: Einkaufsliste genau auf diesen Laden gefiltert („Egal wo“ = ohne Laden) */
const chipFor = (shop: string | null): ShopChip => (shop ? `laden:${shop}` : "ohne");

/**
 * Einkauf-Kachel (Variante C2): je Laden eine Zeile – helle Ladenfarbe, Strich
 * links, Name fett, rechts 2 Symbole der ersten Sachen (ohne eigene Zeichnung
 * das Symbol der Abteilung, nie ein Buchstabe) und die Zahl. Keine
 * abgeschnittenen Artikelnamen, keine Logos, keine Emojis.
 */
function ShopRows({ rows, rest, products, demo = false }: TileRows & { products: Record<string, string>; demo?: boolean }) {
  return (
    <>
      <ul className="mt-1 flex flex-col gap-1" aria-label="Nach Laden">
        {rows.map((r) => {
          const tone = r.shop ? `var(--app-shop-${shopTone(r.shop)})` : "var(--app-faint)";
          const name = r.shop ?? "Egal wo";
          return (
            <li key={r.shop ?? "egal"}>
              <Link
                href="/einkaufsliste"
                onClick={(e) => {
                  e.stopPropagation();
                  setShopChip(chipFor(r.shop));
                }}
                className="relative flex min-h-[30px] min-w-0 items-center gap-1.5 overflow-hidden rounded-field py-1 pl-3 pr-2"
                style={{ background: r.shop ? `var(--app-shop-${shopTone(r.shop)}-soft)` : "var(--app-fill)" }}
                aria-label={`${name}: ${r.count} ${r.count === 1 ? "Sache" : "Sachen"}${demo ? " · Beispiel" : ""}`}
                data-zeile
                data-laden-zeile
              >
                <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone }} aria-hidden />
                <span className="min-w-0 flex-1 truncate text-[14px] font-bold">{name}</span>
                {r.names.slice(0, 2).map((n, i) => (
                  <ItemSymbol key={`${n}-${i}`} id={symbolFor(n, products)} name={n} className="h-5 w-5 shrink-0" />
                ))}
                <span className={`min-w-[1.25rem] shrink-0 text-right text-[14px] font-extrabold ${r.shop ? "" : "text-muted"}`} style={r.shop ? { color: tone } : undefined}>
                  {r.count}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
      {rest && (
        <Link href="/einkaufsliste" onClick={() => setShopChip("alle")} className="flex min-h-[30px] items-center truncate text-[12.5px] font-semibold text-muted" data-zeile>
          {rest}
        </Link>
      )}
    </>
  );
}

/**
 * Einkauf-Kachel, solange es nur „Egal wo“ gibt (Variante A): bis zu 6 runde
 * Symbole der ersten Sachen, dahinter „+N“ und die Zahl – die Kachel wirkt
 * nicht leer. Antippen = Liste „Ohne Laden“.
 */
function SymbolRow({ row, products, demo = false }: { row: TileRows["rows"][number]; products: Record<string, string>; demo?: boolean }) {
  const { names, more } = symbolReihe(row.names);
  const count = `${row.count} ${row.count === 1 ? "Sache" : "Sachen"}`;
  return (
    <Link
      href="/einkaufsliste"
      onClick={(e) => {
        e.stopPropagation();
        setShopChip(chipFor(null));
      }}
      className="mt-1 flex min-w-0 flex-col gap-1.5"
      aria-label={`${count} auf der Liste${demo ? " · Beispiel" : ""}`}
      data-zeile
      data-symbol-reihe
    >
      <span className="flex flex-wrap gap-1.5" aria-hidden>
        {names.map((n, i) => (
          <span key={`${n}-${i}`} className="flex h-9 w-9 items-center justify-center rounded-full bg-tile-inner">
            <ItemSymbol id={symbolFor(n, products)} name={n} className="h-6 w-6" />
          </span>
        ))}
        {more > 0 && <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-tile-inner px-1.5 text-[13px] font-extrabold text-tile-accent">+{more}</span>}
      </span>
      <span className="text-[12.5px] font-semibold text-muted">{count}</span>
    </Link>
  );
}

/** Kopf der Einkauf-Kachel; die übrige Fläche öffnet die ganze Liste („Alle“) */
function ShoppingHead() {
  return (
    <Link href="/einkaufsliste" onClick={() => setShopChip("alle")} className="flex min-h-11 items-start" aria-label="Einkaufsliste öffnen">
      <span className={`${HALF_LABEL} pr-6`}>
        <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="truncate">Einkaufsliste</span>
      </span>
    </Link>
  );
}

/** Beispiel-Einkauf als Artikel (nur für die Kachel, nie im echten Speicher) */
const DEMO_ITEMS = DEMO_SHOPS.flatMap((g) => g.names.map((name) => ({ name, shop: g.shop })));
const DEMO_ORDER = DEMO_SHOPS.map((g) => g.shop);

/** EINKAUF – je Laden eine Zeile (S/M: höchstens 3 + Rest-Zeile, L: alle). „+“ = Schnell-Eintrag */
export function ShoppingTile({ size = "S", demo = false }: { half: boolean; size?: TileSize; demo?: boolean }) {
  const shopping = useWeekShoppingList("planning");
  const laeden = useMeineLaeden();
  // "Jetzt mitnehmen" und selbst Eingetragenes zuerst, dann Zutaten aus Gerichten
  const open = (shopping?.list.items ?? [])
    .filter((i) => !i.checked && !i.hidden)
    .sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  // Beispiel-Tag: Eigenes auf der Liste → Beispiel verschwindet für immer
  const hasOwn = open.length > 0;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("einkauf");
  }, [demo, hasOwn]);
  if (!shopping) return <section className={`${HALF} animate-pulse`} aria-label="Einkaufsliste" />;
  const showDemo = demo && !hasOwn;
  const rows = showDemo ? tileRows(DEMO_ITEMS, DEMO_ORDER, size) : tileRows(open, laeden?.myShops ?? [], size);
  const art = tileArt(rows);
  return (
    <section className={HALF} aria-label={showDemo ? "Einkaufsliste · Beispiel" : "Einkaufsliste"}>
      <ShoppingHead />
      {art === "symbole" ? (
        <SymbolRow row={rows.rows[0]} products={shopping.settings.products} demo={showDemo} />
      ) : art === "zeilen" ? (
        <ShopRows {...rows} products={shopping.settings.products} demo={showDemo} />
      ) : (
        <Link href="/einkaufsliste" onClick={() => setShopChip("alle")} className="-mt-3 flex-1 text-[14px] font-semibold leading-snug text-muted">
          Liste ist leer. Sag mir einfach, was ihr braucht.
        </Link>
      )}
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
    </section>
  );
}

/**
 * NOTIZEN je Größe: S = die neueste bzw. angeheftete Notiz (Titel + Anfang,
 * 2 Zeilen), M = 3 Notizen als Zeilen „Titel · Anfang“, L = bis 5
 * (angeheftete zuerst). Ohne Notizen die Schnellnotiz bzw. „Schnell was
 * aufschreiben …“. Kopf = Notizen-Seite, Zeile = genau diese Notiz, Stift =
 * Schnellnotiz.
 */
export function NotesTile({ size = "M" }: { size?: TileSize }) {
  const notes = useNotes();
  const rows = notizZeilen(notes ?? [], size);
  const top = rows[0];
  return (
    <>
      <section className={`${TILE} flex min-h-[92px] flex-col gap-1 p-3.5`} aria-label="Notizen" data-notizen-groesse={size}>
        <Link href="/notizen" className="flex min-h-11 flex-col gap-0.5 pr-8" aria-label="Notizen öffnen">
          <span className={HALF_LABEL}>
            <StickyNote className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            Notizen
          </span>
          {!rows.length && <span className="text-[13px] text-muted">Schnell was aufschreiben …</span>}
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={PenLine} label="Schnellnotiz schreiben" onClick={() => openQuick({ kind: "notiz" })} />
        </span>
        {size === "S" && top && (
          <Link href={`/notizen/bearbeiten?id=${top.id}`} className="-mt-1 flex min-h-[30px] flex-col text-[13px] leading-[1.35]" data-zeile data-notiz-zeile>
            <span className="flex items-center gap-1 truncate font-bold">
              {top.pinned && <Pin className="h-3 w-3 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden />}
              <span className="truncate">{top.title}</span>
            </span>
            {top.line && <span className="truncate text-muted">{top.line}</span>}
          </Link>
        )}
        {size !== "S" && rows.length > 0 && (
          <ul className="-mt-1 flex flex-col" aria-label="Notizen">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/notizen/bearbeiten?id=${r.id}`} className="flex min-h-[30px] items-center gap-1.5 text-[13.5px]" data-zeile data-notiz-zeile>
                  {r.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden /> : <StickyNote className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />}
                  <span className="min-w-0 flex-1 truncate">
                    <span className="font-semibold">{r.title}</span>
                    {r.line && <span className="text-muted"> · {r.line}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

/**
 * IM HAUS (Baustein, Tafel 78/79): oben „Bald aufbrauchen“ (bis zu 2 Zeilen à
 * 30 px: Symbol, Name, Schild), sonst die 2 zuletzt eingekauften Sachen;
 * unten „Daraus kochen“ → Kochidee. Leer: ein freundlicher Satz.
 */
export function PantryTile({ size = "S" }: { size?: TileSize }) {
  const pantry = usePantry();
  if (!pantry) return <section className={`${HALF} animate-pulse`} aria-label="Im Haus" />;
  const tile = houseTile(pantry, todayIso(), size === "S" ? 2 : 4);
  return (
    <section className={`${HALF} gap-1`} aria-label="Im Haus">
      <Link href="/vorrat" className="flex min-w-0 flex-col gap-1" data-zeile>
        <span className={HALF_LABEL}>
          <Refrigerator className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">Im Haus</span>
        </span>
        {tile.items.length ? (
          <>
            <span className="text-[13px] font-semibold text-muted">{tile.soon ? "Bald aufbrauchen" : "Zuletzt eingekauft"}</span>
            {tile.items.map(({ item, badge }) => (
              <span key={item.id} className="flex h-[30px] min-w-0 items-center gap-1.5">
                <ItemSymbol id={symbolFor(item.name)} name={item.name} className="h-6 w-6 shrink-0 text-base" />
                <span className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{item.name}</span>
                {badge && <span className={`shrink-0 rounded-full px-1.5 text-[11px] font-bold ${badge.tone === "orange" ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn-ink"}`}>{badge.text}</span>}
              </span>
            ))}
          </>
        ) : (
          <span className="mt-1 text-[14px] font-semibold text-muted">Was du einkaufst, landet hier von selbst.</span>
        )}
      </Link>
      {tile.items.length > 0 && (
        <button type="button" onClick={() => openHelper("kochtipp")} className={`${buttonClass("primary", "sm")} hit mt-auto self-start`}>
          Daraus kochen
        </button>
      )}
    </section>
  );
}

/** AUSBLICK MORGEN (ab 16 Uhr, gestrichelt, eine Zeile). Im Bearbeiten-Modus immer sichtbar. */
export function MorgenTile({ date, items, dish, href, placeholder }: { date: string; items: DayItem[]; dish: string | null; href: string; placeholder?: boolean }) {
  if (!items.length && !dish && !placeholder) return null;
  return (
    <section className="rounded-card border-2 border-dashed border-line" aria-label="Ausblick morgen">
      <Link href={href} className="flex items-center gap-2 px-4 py-3">
        <span className="shrink-0 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-wider text-muted">Ausblick morgen · {weekdayShort(date)}</span>
        {items.length || dish ? (
          <span className="min-w-0 flex-1 truncate text-base">{[...items.map(itemText), dish ? `Essen: ${dish}` : ""].filter(Boolean).join(" · ")}</span>
        ) : (
          // Platzhalter (nur im Bearbeiten-Modus): kurz, damit er auch auf schmalen iPhones in eine Zeile passt
          <span className="min-w-0 flex-1 truncate text-base text-muted">ab 16 Uhr</span>
        )}
      </Link>
    </section>
  );
}
