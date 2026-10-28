"use client";

// Kacheln auf "Heute" je Größe (S/M/L): Essen, Einkauf, Notizen, Vorrat. S = halbe Breite (allein: breit, gleicher Inhalt), M/L = volle
// Breite mit mehr Inhalt. Antippen öffnet die Seite, der kleine Knopf oben
// rechts legt schnell Neues an.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChefHat, Pin, PenLine, Refrigerator, ShoppingCart, Shuffle, StickyNote } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { QuickAddButton } from "@/components/einkauf/QuickAdd";
import { clockLabel } from "@/lib/kalender/answers";
import { weekdayShort } from "@/lib/kalender/model";
import type { TileSize } from "@/lib/core/homeLayout";
import { addDays, todayIso } from "@/lib/core/now";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { matchStock, realStock } from "@/lib/essen/dishIdeas";
import { HOUSE_TILE_MAX, houseTile } from "@/lib/vorrat/imHaus";
import { openHelper } from "@/lib/begleitung/open";
import { ItemSymbol } from "@/components/einkauf/kacheln/ItemSymbol";
import { symbolFor } from "@/lib/einkauf/kacheln/symbols";
import type { PlanDay } from "@/lib/essen/mealPlan";
import { usePantry } from "@/lib/vorrat/pantry";
import { takeDish } from "@/components/heute/takeDish";
import { essenKopf, essenPille, essenTippen, essenUnterzeilen, foodTileView, kachelBild, kachelZustand, kochSchrittText, naechsteIdee } from "@/lib/heute/essenKachel";
import { useVorschau } from "@/components/essen/vorschau/useVorschau";
import { merkeGezeigt } from "@/lib/essen/ideenGezeigt";
import type { Idea } from "@/lib/essen/ideas";
import { useTodayIdeas } from "@/lib/essen/useIdeas";
import { useStock } from "@/lib/essen/useStock";
import { findRecipe, recipeHref } from "@/lib/essen/baking";
import { rezeptIdFuer } from "@/lib/essen/kochen";
import { useCooking } from "@/lib/essen/kochSession";
import { TagFenster } from "@/components/essen/sieben/TagFenster";
import { OhneRezeptSheet } from "@/components/essen/OhneRezeptSheet";
import { DEMO_SHOPS, clearDemoTile } from "@/lib/core/demo";
import { ohneLadenZeile, shopTone, tileRows, type TileRows } from "@/lib/einkauf/shopGroups";
import { useMeineLaeden } from "@/lib/einkauf/meineLaeden";
import { ladenHref } from "@/lib/einkauf/seite/karten";
import { useNotes } from "@/lib/notizen";
import { openQuick } from "@/lib/core/schnelleingabe";
import { notizZeilen } from "@/lib/heute/notizenKachel";
import type { HomeData } from "@/components/heute/useHomeData";
import { dishOf, useMeals } from "@/components/essen/useMeals";
import { KochideeKnopf } from "@/components/essen/kochtipp/KochideeKnopf";
import { DishTile } from "@/components/essen/DishTile";
import { KachelPille } from "@/components/ui/KachelPille";
import { helperName } from "@/lib/einstellungen/profile";
import { leuchtSchluessel } from "@/lib/heute/aufleuchten";

const HALF = `${TILE} flex min-h-[92px] flex-col p-3.5`;
const HALF_LABEL = `flex min-w-0 items-center gap-1.5 ${TILE_LABEL}`;

/**
 * ESSEN final (A-046, Tafel 134) – immer eine Bild-Kachel (`DishTile`) ohne
 * große Knöpfe: oben links „Was anderes?“ (neuer Vorschlag bzw. Mias
 * Kochidee), unten links Statuszeile, Name und Zeit/Zutaten, unten rechts
 * „Wochenplan ›“ (beim Kochen „Weiter kochen ›“). Ohne Plan zeigt sie gleich
 * einen Vorschlag; gibt es keinen, „Was gibt’s heute?“. Ganze Kachel
 * antippen (`essenTippen`): Vorschlag → Rezept-Vorschau (A-038, „Nehmen“
 * trägt ein), fest geplant → Rezeptseite, beim Kochen → Kochmodus am
 * Schritt, frei → die Ideen des Tages.
 * `hat`: Kochidee-Pille oben links – `null` = keine, sonst ob ihr Hinweis gerade still sein soll.
 */
export function FoodTile({ data, dish, over, dishClock, onOpen, size = "S", hat = null }: { data: HomeData; dish: string | null; over: boolean; dishClock: string | null; onOpen: () => void; size?: TileSize; hat?: { quiet: boolean } | null }) {
  const ideas = useTodayIdeas([], { tomorrow: over });
  const stock = useStock();
  const session = useCooking(data.todayIso);
  const tage = useMeals(data.todayIso, 7);
  const vorschau = useVorschau();
  const [alt, setAlt] = useState<number | null>(null);
  const [tag, setTag] = useState(false);
  const [ohneRezept, setOhneRezept] = useState(false);
  const list = ideas?.ideas ?? [];
  const day: PlanDay | undefined = over ? data.tomorrow : data.day;
  const away = day?.away ? (day.paused ? "Pause" : "Kein Kochtag") : null;
  const geplantTitel = over ? dishOf(data.tomorrow) : dish;
  // Nichts geplant: gleich der erste Vorschlag; „Was anderes?“ blättert weiter
  const idea = !list.length || away ? null : alt !== null ? list[alt % list.length] : geplantTitel ? null : list[0];
  // Selbst weitergeblätterte Idee merken (rückt an den nächsten Tagen nach hinten, wenn sie nicht genommen wird)
  const ideaTitle = alt !== null ? (idea?.title ?? null) : null;
  useEffect(() => {
    if (ideaTitle) merkeGezeigt([ideaTitle], todayIso());
  }, [ideaTitle]);
  const view = foodTileView({ over, today: dish, tomorrow: dishOf(data.tomorrow), idea: idea?.title ?? null, away, ideas: away ? 0 : list.length });
  const entry = day && !day.away ? day.slot.entry : null;
  // Jedes Gericht hat ein Rezept: eigenes bzw. eingebautes über den Titel (auch Wochenkarten-Gerichte)
  const recipeId = view.kind === "geplant" && entry ? (entry.recipeId ?? rezeptIdFuer(entry.title)) : null;
  const recipe = recipeId ? findRecipe(data.recipes, recipeId) : undefined;
  const persons = day?.persons ?? null;
  const rezeptHref = recipe ? recipeHref(data.recipes, recipe.id, persons) : null;
  const needs = recipe && stock && realStock(stock).length ? matchStock(recipe.ingredients.map((i) => i.name), stock, todayIso()).needs : null;
  // Kocht gerade: Kochmodus heute geöffnet bzw. „Ich koche jetzt“ (nicht nach „Gegessen“)
  const at = recipe ? session?.at[recipe.id] : undefined;
  const kochHref = recipe ? `/kochbuch/kochen?id=${encodeURIComponent(recipe.id)}${persons ? `&personen=${persons}` : ""}` : null;
  const kocht = view.kind === "geplant" && view.when === "heute" && Boolean(kochHref) && (at !== undefined || Boolean(session?.manualAt));
  const zustand = kachelZustand(view, kocht);
  const morgen = weekdayShort(addDays(todayIso(), 1));
  const kopf = essenKopf(zustand, { over, clock: dish && dishClock ? clockLabel(dishClock) : null, morgen });
  /** Vorschlag nehmen – tagsüber für heute, nach dem Essen für morgen (fehlende Zutaten kommen wie immer über den Plan auf die Liste) */
  const take = (it: Idea, rezeptId?: string) => {
    if (takeDish(data, rezeptId ? { ...it, recipeId: rezeptId } : it, over ? addDays(todayIso(), 1) : todayIso())) setAlt(null);
  };
  // Für „Was anderes?“ bei Mias Kochidee zählt nur ein heute geplantes Gericht (nach dem Abendessen: frei für morgen)
  const corner = hat ? (
    <KochideeKnopf name={helperName(data.profile)} planned={over ? null : dish} quiet={hat.quiet} />
  ) : (
    list.length > 0 && !away && <KachelPille label="Was anderes?" icon={Shuffle} aria="Andere Idee" onClick={() => setAlt((a) => naechsteIdee(list.map((i) => i.title), a, view.title) ?? a)} />
  );
  const schritt = kocht && recipe && at !== undefined ? kochSchrittText(at, recipe.steps.length) : null;
  const groesse = size === "S" ? "S" : "M";
  const sub =
    view.kind === "vorschlag" && idea
      ? essenUnterzeilen({ minutes: idea.minutes, needs: idea.needs }, groesse)
      : view.kind === "geplant"
        ? essenUnterzeilen({ minutes: recipe?.prepMinutes ?? null, needs, schritt }, groesse)
        : undefined;
  const tippen = essenTippen(zustand);
  const zeigen = () => {
    if (!idea) return;
    vorschau.zeigen({ title: idea.title, category: idea.category, minutes: idea.minutes, recipeId: idea.recipeId, needs: idea.needs, unsure: idea.unsure, persons, kopf }, (rezeptId) => take(idea, rezeptId));
  };
  const open =
    tippen === "vorschau" ? zeigen : tippen === "rezept" ? (rezeptHref ?? (() => setOhneRezept(true))) : tippen === "kochmodus" && kochHref ? kochHref : day && !day.away ? () => setTag(true) : onOpen;
  const pille = essenPille(zustand);
  const picture = kachelBild(view, view.kind === "vorschlag" ? { category: idea?.category } : { ingredients: recipe?.ingredients.map((i) => i.name), category: recipe?.category ?? entry?.category });
  return (
    <>
      <DishTile
        kopf={kopf}
        title={view.title}
        sub={sub}
        picture={picture}
        open={open}
        half={size === "S"}
        label={`${kopf} · ${view.title}${view.kind === "vorschlag" ? " · Vorschlag" : ""}`}
        corner={corner}
        pille={{ label: pille, open: pille === "Weiter kochen ›" && kochHref ? kochHref : "/?seite=essen&zu=woche", data: pille === "Weiter kochen ›" ? "weiter-kochen" : "woche" }}
      />
      {vorschau.fenster}
      {tag && day && <TagFenster data={data} day={day} tage={tage ? [...tage.values()] : [day]} onClose={() => setTag(false)} />}
      {ohneRezept && entry && <OhneRezeptSheet title={entry.title} category={entry.category} name={helperName(data.profile)} onClose={() => setOhneRezept(false)} />}
    </>
  );
}

/** Eine Zeile der Einkauf-Kachel: Strich links in Ladenfarbe, Name, 2 Symbole, Zahl (mit 0 nur Name + 0); Tipp = Laden-Seite */
function ShopRow({ shop, label, names, count, href, products, demo }: { shop: string | null; label: string; names: string[]; count: number; href: string; products: Record<string, string>; demo: boolean }) {
  const tone = shop ? `var(--app-shop-${shopTone(shop)})` : "var(--app-faint)";
  return (
    <li>
      <Link
        href={href}
        onClick={(e) => e.stopPropagation()}
        className="relative flex min-h-[30px] min-w-0 items-center gap-1.5 overflow-hidden rounded-field py-1 pl-3 pr-2"
        style={{ background: shop ? `var(--app-shop-${shopTone(shop)}-soft)` : "var(--app-fill)" }}
        aria-label={`${label}: ${count} ${count === 1 ? "Sache" : "Sachen"}${demo ? " · Beispiel" : ""}`}
        data-zeile
        data-laden-zeile
        data-leuchte={names.map((n) => leuchtSchluessel("einkauf", n)).join(" ")}
      >
        <span className="absolute inset-y-0 left-0 w-1" style={{ background: tone }} aria-hidden />
        <span className="min-w-0 flex-1 break-words text-[14px] font-bold leading-tight">{label}</span>
        {names.slice(0, 2).map((n, i) => (
          <ItemSymbol key={`${n}-${i}`} id={symbolFor(n, products)} name={n} className="h-5 w-5 shrink-0" />
        ))}
        <span className={`min-w-[1.25rem] shrink-0 text-right text-[14px] font-extrabold ${shop ? "" : "text-muted"}`} style={shop ? { color: tone } : undefined}>
          {count}
        </span>
      </Link>
    </li>
  );
}

/**
 * Einkauf-Kachel (Variante C2, Tafel 99): IMMER je Laden aus „Meine Läden“
 * eine Zeile – helle Ladenfarbe, Strich links, Name fett, rechts 2 Symbole
 * der ersten Sachen (ohne eigene Zeichnung das Symbol der Abteilung, nie ein
 * Buchstabe) und die Zahl, auch mit 0. Darunter leise „6 noch ohne Laden ·
 * Sortieren ›“ (öffnet „Einkauf“ bei „Noch ohne Laden“). Ohne „Meine Läden“: eine
 * neutrale Zeile „Liste“ mit allem ohne Laden. Keine Logos, keine Emojis.
 */
function ShopRows({ rows, rest, ohne, mine, products, demo = false }: TileRows & { mine: boolean; products: Record<string, string>; demo?: boolean }) {
  return (
    <>
      <ul className="mt-1 flex flex-col gap-1" aria-label="Nach Laden">
        {rows.map((r) => (
          <ShopRow key={r.shop ?? "egal"} shop={r.shop} label={r.shop ?? "Egal wo"} names={r.names} count={r.count} href={demo ? "/einkaufsliste" : ladenHref(r.shop ?? "")} products={products} demo={demo} />
        ))}
        {!mine && ohne.length > 0 && <ShopRow shop={null} label="Liste" names={ohne} count={ohne.length} href="/einkaufsliste" products={products} demo={demo} />}
      </ul>
      {rest && (
        <Link href="/einkaufsliste" className="flex min-h-[30px] items-center text-[12.5px] font-semibold leading-tight text-muted" data-zeile>
          {rest}
        </Link>
      )}
      {mine && ohne.length > 0 && (
        <Link href="/einkaufsliste#ohne-laden" className="flex min-h-[30px] flex-wrap items-center gap-x-1 py-0.5 text-[12.5px] font-semibold leading-tight text-muted" data-zeile data-ohne-laden-zeile data-leuchte={ohne.map((n) => leuchtSchluessel("einkauf", n)).join(" ")}>
          <span className="whitespace-nowrap">{ohneLadenZeile(ohne.length)} ·</span> <span className="whitespace-nowrap font-bold text-accent-strong">Sortieren ›</span>
        </Link>
      )}
    </>
  );
}

/** Kopf der Einkauf-Kachel „EINKAUF“ – kurz, damit er auch halb breit nie abgeschnitten wird; die übrige Fläche öffnet die ganze Liste („Alle“) */
function ShoppingHead() {
  return (
    <Link href="/einkaufsliste" className="mr-8 flex min-h-11 items-start" aria-label="Einkaufsliste öffnen">
      <span className={HALF_LABEL}>
        <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="whitespace-nowrap">Einkauf</span>
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
  const myShops = laeden?.myShops ?? [];
  const rows = showDemo ? tileRows(DEMO_ITEMS, DEMO_ORDER, size) : tileRows(open, myShops, size);
  // Nichts zu kaufen: freundlicher Satz statt lauter Nullen
  const empty = !showDemo && open.length === 0;
  return (
    <section className={HALF} aria-label={showDemo ? "Einkaufsliste · Beispiel" : "Einkaufsliste"}>
      <ShoppingHead />
      {empty ? (
        <Link href="/einkaufsliste" className="-mt-3 flex-1 text-[14px] font-semibold leading-snug text-muted">
          Liste ist leer. Sag mir einfach, was ihr braucht.
        </Link>
      ) : (
        <ShopRows {...rows} mine={showDemo || myShops.length > 0} products={shopping.settings.products} demo={showDemo} />
      )}
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
    </section>
  );
}

/**
 * NOTIZEN je Größe: S = die neueste bzw. angeheftete Notiz (Titel + Anfang,
 * 2 Zeilen), M = 3 Notizen als Zeilen „Titel · Anfang“, L = bis 5
 * (angeheftete zuerst). Ohne Notizen die Schnellnotiz bzw. „Schnell was
 * aufschreiben.“ (A-045: Kachel ohne „…“). Kopf = Notizen-Seite, Zeile = genau diese Notiz, Stift =
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
          {!rows.length && <span className="text-[13px] text-muted">Schnell was aufschreiben.</span>}
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={PenLine} label="Schnellnotiz schreiben" onClick={() => openQuick({ kind: "notiz" })} />
        </span>
        {size === "S" && top && (
          <Link href={`/notizen/bearbeiten?id=${top.id}`} className="-mt-1 flex min-h-[30px] flex-col text-[13px] leading-[1.35]" data-zeile data-notiz-zeile data-leuchte={leuchtSchluessel("notiz", top.id)}>
            <span className="flex items-center gap-1 font-bold">
              {top.pinned && <Pin className="h-3 w-3 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden />}
              <span className="truncate" data-freitext>{top.title}</span>
            </span>
            {top.line && <span className="truncate text-muted" data-freitext>{top.line}</span>}
          </Link>
        )}
        {size !== "S" && rows.length > 0 && (
          <ul className="-mt-1 flex flex-col" aria-label="Notizen">
            {rows.map((r) => (
              <li key={r.id}>
                <Link href={`/notizen/bearbeiten?id=${r.id}`} className="flex min-h-[30px] items-center gap-1.5 text-[13.5px]" data-zeile data-notiz-zeile data-leuchte={leuchtSchluessel("notiz", r.id)}>
                  {r.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden /> : <StickyNote className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />}
                  <span className="min-w-0 flex-1 truncate" data-freitext>
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
 * IM HAUS (Baustein, nur über die Kachel-Auswahl): „Bald aufbrauchen“ (S: 3,
 * M: 6 Zeilen à 30 px: Symbol, Name, Schild), sonst die zuletzt eingekauften;
 * unten „Was koch ich daraus?“ = Spontan kochen (wie unter Essen). Leer: ein
 * freundlicher Satz.
 */
export function PantryTile({ size = "S" }: { size?: TileSize }) {
  const pantry = usePantry();
  if (!pantry) return <section className={`${HALF} animate-pulse`} aria-label="Im Haus" />;
  const tile = houseTile(pantry, todayIso(), HOUSE_TILE_MAX[size === "S" ? "S" : "M"]);
  return (
    <section className={`${HALF} gap-1`} aria-label="Im Haus">
      <Link href="/vorrat" className="flex min-w-0 flex-col gap-1" data-zeile>
        <span className={HALF_LABEL}>
          <Refrigerator className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span>Im Haus</span>
        </span>
        {tile.items.length ? (
          <>
            <span className="text-[13px] font-semibold text-muted">{tile.soon ? "Bald aufbrauchen" : "Zuletzt eingekauft"}</span>
            {tile.items.map(({ item, badge }) => (
              <span key={item.id} className="flex min-h-[30px] min-w-0 items-center gap-1.5" data-im-haus-zeile>
                <ItemSymbol id={symbolFor(item.name)} name={item.name} className="h-6 w-6 shrink-0 text-base" />
                {/* Name vor Schild (Tafel 133): der Name steht immer ganz, passt das Schild nicht daneben, rutscht es in die nächste Zeile */}
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5">
                  <span className="min-w-0 hyphens-auto break-words text-[14.5px] font-bold leading-tight">{item.name}</span>
                  {badge && <span className={`ml-auto whitespace-nowrap rounded-full px-1.5 text-[10.5px] font-bold leading-[16px] ${badge.tone === "orange" ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn-ink"}`}>{badge.text}</span>}
                </span>
              </span>
            ))}
          </>
        ) : (
          <span className="mt-1 text-[14px] font-semibold text-muted">Sag mir, was da ist, dann schlag ich was vor.</span>
        )}
      </Link>
      {tile.items.length > 0 && (
        <button type="button" onClick={() => openHelper("spontan")} className="hit mt-auto flex min-h-[30px] items-center gap-1 self-start text-left text-[13px] font-bold leading-tight text-accent-strong">
          <ChefHat className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          Was koch ich daraus?
        </button>
      )}
    </section>
  );
}
