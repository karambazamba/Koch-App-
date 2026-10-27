"use client";

// Kacheln auf "Heute" je Größe (S/M/L): Essen, Einkauf, Notizen, Vorrat,
// Morgen. S = halbe Breite (allein: breit, gleicher Inhalt), M/L = volle
// Breite mit mehr Inhalt. Antippen öffnet die Seite, der kleine Knopf oben
// rechts legt schnell Neues an.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Pin, PenLine, Refrigerator, ShoppingCart, StickyNote, UtensilsCrossed } from "lucide-react";
import { TILE, TILE_LABEL, buttonClass } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { ItemTile, TILE_GRID } from "@/components/einkauf/kacheln/ItemTile";
import { clockLabel, itemText } from "@/lib/kalender/answers";
import { tomorrowLabel, weekdayShort, type DayItem } from "@/lib/kalender/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays, todayIso } from "@/lib/core/now";
import { toggleChecked } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock, stockLine } from "@/lib/essen/dishIdeas";
import { houseTile } from "@/lib/vorrat/imHaus";
import { openHelper } from "@/lib/begleitung/open";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { usePantry } from "@/lib/vorrat/pantry";
import { takeDish } from "@/components/heute/takeDish";
import { foodTileView, takeLabel } from "@/lib/heute/essenKachel";
import type { Idea } from "@/lib/essen/ideas";
import { GerichtSheet } from "@/components/essen/GerichtSheet";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { useStock } from "@/lib/essen/useStock";
import { showToast } from "@/lib/core/toast";
import { DEMO_SHOPS, clearDemoTile } from "@/lib/core/demo";
import { shopGroups, shopTone, type ShopGroup } from "@/lib/einkauf/shopGroups";
import { useNotes } from "@/lib/notizen";
import { openQuick } from "@/lib/core/schnelleingabe";
import { notizZeilen } from "@/lib/heute/notizenKachel";
import type { HomeData } from "@/components/heute/useHomeData";
import { buzz } from "@/components/heute/actions";
import { dishOf } from "@/components/essen/useMeals";
import { KochideeKnopf } from "@/components/essen/kochtipp/KochideeKnopf";
import { DishTile } from "@/components/essen/DishTile";
import { helperName } from "@/lib/einstellungen/profile";

const HALF = `${TILE} flex min-h-[92px] flex-col p-3.5`;
const HALF_LABEL = `flex min-w-0 items-center gap-1.5 ${TILE_LABEL}`;

/** ESSEN – geplantes Gericht als Bild-Kachel (`DishTile`); sonst S: „Noch frei“ + Ideen; M: breit; L: + Ideen für morgen */
/** `hat`: Kochidee-Knopf oben rechts – `null` = keiner, sonst ob sein Hinweis gerade still sein soll */
export function FoodTile({ data, dish, over, dishClock, onOpen, size = "S", onCook, hat = null }: { data: HomeData; dish: string | null; over: boolean; dishClock: string | null; onOpen: () => void; size?: TileSize; onCook?: () => void; hat?: { quiet: boolean } | null }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const tomorrowIdeas = useTodayIdeas([], { tomorrow: true });
  const stock = useStock();
  const [alt, setAlt] = useState<number | null>(null);
  const [chosen, setChosen] = useState<Idea | null>(null);
  const list = ideas?.ideas ?? [];
  const idea = alt !== null && list.length ? list[alt % list.length] : null;
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
  const label = over ? tomorrowLabel(addDays(todayIso(), 1)) : `Essen${dish && dishClock ? ` · ${clockLabel(dishClock)}` : ""}`;
  const corner = hat && <KochideeKnopf name={helperName(data.profile)} planned={planned} quiet={hat.quiet} />;
  // ⇄ wechselt die Idee (nicht bei einem heute geplanten Gericht und nicht neben dem Kochidee-Knopf)
  const swap = list.length > 0 && !hat && !(view.kind === "geplant" && view.when === "heute") && (
    <span className="absolute right-3.5 top-3 z-10">
      <QuickButton icon={ArrowLeftRight} label="Andere Idee" onClick={() => setAlt((a) => (a === null ? 0 : a + 1))} />
    </span>
  );
  // Jedes gezeigte Gericht als Bild-Kachel – Antippen öffnet genau dieses Gericht
  if (view.kind !== "frei") {
    const facts = view.kind === "geplant" && view.when === "heute" ? [recipe?.prepMinutes ? `${recipe.prepMinutes} Min` : "", match ? stockLine(match).text : ""].filter(Boolean).join(" · ") : "";
    const open = view.kind === "vorschlag" ? () => setChosen(idea) : recipe ? `/kochbuch/rezept?id=${encodeURIComponent(recipe.id)}` : onOpen;
    return (
      <>
        <DishTile
          when={label}
          title={view.title}
          sub={view.kind === "vorschlag" ? "Vorschlag" : facts || undefined}
          picture={view.kind === "vorschlag" ? { title: view.title, category: idea?.category ?? undefined } : { title: view.title, ingredients: recipe?.ingredients.map((i) => i.name), category: recipe?.category ?? entry?.category }}
          open={open}
          cook={view.kind === "geplant" && view.when === "heute" ? onCook : undefined}
          half={size === "S"}
          label={`${label} · ${view.title}${view.kind === "vorschlag" ? " · Vorschlag" : ""}`}
          corner={corner || swap}
        />
        {chosen && <GerichtSheet dish={chosen} take={takeLabel(over ? "morgen" : "heute")} onTake={() => take(chosen)} onClose={() => setChosen(null)} recipeHref={chosen.recipeId ? `/kochbuch/rezept?id=${encodeURIComponent(chosen.recipeId)}` : undefined} />}
      </>
    );
  }
  return (
    <section className={HALF} aria-label={over ? "Essen morgen" : label}>
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col items-start gap-1 text-left">
        <span className={`${HALF_LABEL} ${hat ? (planned ? "pr-[124px]" : "pr-14") : list.length ? "pr-11" : "pr-6"}`}>
          <UtensilsCrossed className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">{label}</span>
        </span>
        <span className={`line-clamp-2 font-bold leading-snug ${size === "S" ? "text-[15px]" : "text-[18px]"}`}>{view.title}</span>
        {view.ideen && !away && <span className="text-xs text-muted">{`${Math.min(3, list.length)} Ideen ansehen`}</span>}
      </button>
      {swap}
      {corner}
      {size === "L" && !over && (tomorrowIdeas?.ideas.length ?? 0) > 0 && (
        <div className="mt-2 flex flex-col gap-1 border-t border-line pt-2">
          <span className={TILE_LABEL}>Ideen für morgen</span>
          <div className="flex flex-wrap gap-1.5">
            {tomorrowIdeas!.ideas.slice(0, 3).map((i) => (
              <button key={i.title} type="button" onClick={onOpen} className="rounded-full bg-tile-inner px-3 py-1 text-[13px] font-semibold text-tile-accent">
                {i.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/** Bis zu 3 Läden als Zeilen: Farbpunkt, Name fett, Artikel grau („REWE Milch, Brot, Butter“) – keine Logos, keine Emojis */
function ShopRows({ groups }: { groups: ShopGroup[] }) {
  return (
    <ul className="mt-0.5 flex flex-col gap-1" aria-label="Nach Laden">
      {groups.map((g) => (
        <li key={g.shop ?? "egal"} className="flex min-w-0 items-center gap-1.5 text-[13.5px] leading-snug">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.shop ? `var(--app-shop-${shopTone(g.shop)})` : "var(--app-line)" }} aria-hidden />
          <span className="shrink-0 font-bold">{g.shop ?? "Egal wo"}</span>
          <span className="min-w-0 truncate text-muted">{g.names.join(", ")}</span>
        </li>
      ))}
    </ul>
  );
}

/** EINKAUF – S: bis zu 3 Läden (bzw. 3 Sachen + „und N weitere“); M: bis zu 6 zum Abhaken; L: bis zu 10. "+" = Schnell-Eintrag */
export function ShoppingTile({ size = "S", demo = false }: { half: boolean; size?: TileSize; demo?: boolean }) {
  const shopping = useWeekShoppingList("planning");
  // "Jetzt mitnehmen" und selbst Eingetragenes zuerst, dann Zutaten aus Gerichten
  const open = (shopping?.list.items ?? [])
    .filter((i) => !i.checked && !i.hidden)
    .sort((a, b) => Number(Boolean(b.now)) - Number(Boolean(a.now)) || Number(Boolean(b.manualId)) - Number(Boolean(a.manualId)));
  // Beispiel-Tag: Eigenes auf der Liste → Beispiel verschwindet für immer
  const hasOwn = open.length > 0;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("einkauf");
  }, [demo, hasOwn]);
  if (!shopping) return <section className={`${HALF} animate-pulse`} aria-label="Einkauf" />;
  if (demo && !hasOwn)
    return (
      <section className={HALF} aria-label="Einkauf · Beispiel">
        <Link href="/einkaufsliste" className="flex flex-col gap-1">
          <span className={`${HALF_LABEL} pr-6`}>
            <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">Einkauf</span>
          </span>
          <ShopRows groups={DEMO_SHOPS} />
        </Link>
        <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
      </section>
    );
  // M: 4 kleine Kacheln, L: 8 (Einkauf wie Bring)
  const max = size === "L" ? 8 : 4;
  return (
    <section className={HALF} aria-label="Einkauf">
      <Link href="/einkaufsliste" className="flex flex-col gap-1">
        <span className={`${HALF_LABEL} pr-6`}>
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="truncate">Einkauf</span>
        </span>
        {!open.length && <span className="text-[14px] font-semibold text-muted">+ eintragen</span>}
        {open.length > 0 && size === "S" && (open.some((i) => i.shop) ? <ShopRows groups={shopGroups(open)} /> : (
          <ul className="mt-0.5 flex flex-col text-[14px] font-semibold leading-snug">
            {open.slice(0, 3).map((i) => (
              <li key={i.key} className="truncate">
                {i.name}
              </li>
            ))}
            {open.length > 3 && <li className="text-[12.5px] font-semibold text-muted">und {open.length - 3} weitere</li>}
          </ul>
        ))}
      </Link>
      {open.length > 0 && size !== "S" && (
        <div className={`${TILE_GRID.mini} mt-1`} aria-label="Zum Abhaken">
          {open.slice(0, max).map((item) => (
            <ItemTile
              key={item.key}
              name={item.name}
              section={item.section}
              products={shopping.settings.products}
              checked={false}
              size="mini"
              label={`${item.name} abhaken`}
              onTap={() => {
                buzz();
                toggleChecked(shopping.weekStart, item, todayIso());
                showToast({ text: "Gekauft", undo: () => toggleChecked(shopping.weekStart, { ...item, checked: true }, todayIso()), undoneText: "Wieder auf der Liste", seconds: 4, small: true });
              }}
            />
          ))}
        </div>
      )}
      {open.length > max && size !== "S" && (
        <Link href="/einkaufsliste" className="mt-1 text-xs font-bold text-tile-accent">
          und {open.length - max} weitere
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
