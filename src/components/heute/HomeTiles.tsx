"use client";

// Kacheln auf "Heute" je Größe im festen Raster (Tafel 118): Essen, Einkauf,
// Notizen, Im Haus. XS = halb breit und halb hoch (Kopf + EINE Zeile), S =
// halb breit und quadratisch, M = ganz breit und so hoch wie S. Jede Kachel
// füllt genau ihre Fläche, der Rest steht als „+N“ im Kopf. Antippen öffnet
// die Seite, der kleine Knopf oben rechts legt schnell Neues an.

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
import { KachelWasserzeichen } from "@/components/ui/KachelWasserzeichen";
import { leuchtSchluessel } from "@/lib/heute/aufleuchten";

const HALF = `${TILE} flex h-full flex-col overflow-hidden p-3`;
/** XS: Kopf oben, EINE Zeile unten */
const XS_BOX = `${TILE} flex h-full flex-col justify-between overflow-hidden px-3 py-2.5`;
/** XS: EINE Zeile; frei Eingegebenes darin kürzt sich selbst (`truncate` + `data-freitext`), alles andere ist so kurz, dass es passt (A-045) */
const XS_LINE = "block min-w-0 overflow-hidden whitespace-nowrap text-[15px] font-bold leading-tight";
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
        {/* Ganz schmal (Board unter 320 px, iPhone SE 1): ohne Symbole, damit der Laden-Name ganz in eine Zeile passt (A-045) */}
        {names.slice(0, 2).map((n, i) => (
          <ItemSymbol key={`${n}-${i}`} id={symbolFor(n, products)} name={n} className="h-5 w-5 shrink-0 @max-[320px]:hidden" />
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
function ShopRows({ rows, ohne, mine, products, demo = false }: TileRows & { mine: boolean; products: Record<string, string>; demo?: boolean }) {
  return (
    <>
      <ul className="mt-1 flex flex-col gap-1" aria-label="Nach Laden">
        {rows.map((r) => (
          <ShopRow key={r.shop ?? "egal"} shop={r.shop} label={r.shop ?? "Egal wo"} names={r.names} count={r.count} href={demo ? "/einkaufsliste" : ladenHref(r.shop ?? "")} products={products} demo={demo} />
        ))}
        {!mine && ohne.length > 0 && <ShopRow shop={null} label="Liste" names={ohne} count={ohne.length} href="/einkaufsliste" products={products} demo={demo} />}
      </ul>
      {mine && ohne.length > 0 && (
        <Link href="/einkaufsliste#ohne-laden" className="flex min-h-[30px] flex-wrap items-center gap-x-1 py-0.5 text-[12.5px] font-semibold leading-tight text-muted" data-zeile data-ohne-laden-zeile data-leuchte={ohne.map((n) => leuchtSchluessel("einkauf", n)).join(" ")}>
          <span className="kachel-frei whitespace-nowrap">{ohneLadenZeile(ohne.length)} ·</span> <span className="kachel-frei whitespace-nowrap font-bold text-accent-strong">Sortieren ›</span>
        </Link>
      )}
    </>
  );
}

/** Kopf der Einkauf-Kachel „EINKAUF“ (26 px) – kurz, damit er auch halb breit nie abgeschnitten wird; „+N“ = weitere Läden; die übrige Fläche öffnet die ganze Liste */
function ShoppingHead({ more }: { more: number }) {
  return (
    <div className="mr-8 flex h-[26px] items-center gap-2">
      <Link href="/einkaufsliste" className="hit flex h-[26px] items-center" aria-label="Einkaufsliste öffnen">
        <span className={HALF_LABEL}>
          <ShoppingCart className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          <span className="whitespace-nowrap">Einkauf</span>
        </span>
      </Link>
      <span className="flex-1" />
      {more > 0 && (
        <Link href="/einkaufsliste" className="hit flex h-[26px] items-center text-[12.5px] font-bold text-tile-accent" data-weitere>
          +{more}
        </Link>
      )}
    </div>
  );
}

/** Beispiel-Einkauf als Artikel (nur für die Kachel, nie im echten Speicher) */
const DEMO_ITEMS = DEMO_SHOPS.flatMap((g) => g.names.map((name) => ({ name, shop: g.shop })));
const DEMO_ORDER = DEMO_SHOPS.map((g) => g.shop);

/** EINKAUF – je Laden eine Zeile (S/M: höchstens 3, mit „ohne Laden“-Zeile 2; der Rest als „+N“ im Kopf). „+“ = Schnell-Eintrag */
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
  // Feste Fläche: drei Laden-Zeilen – kommt die Zeile „ohne Laden“ bzw. „Liste“ dazu, zwei
  const ohneDa = !showDemo && open.some((i) => !i.shop.trim() && !i.anywhere);
  const rows = showDemo ? tileRows(DEMO_ITEMS, DEMO_ORDER, 3) : tileRows(open, myShops, ohneDa ? 2 : 3);
  // Nichts zu kaufen: freundlicher Satz statt lauter Nullen
  const empty = !showDemo && open.length === 0;
  // Wasserzeichen: leiser, sobald Text ohne eigene Fläche dasteht (leere Liste, „ohne Laden“)
  const frei = empty || rows.ohne.length > 0;
  // Der Plus-Knopf steht neben der <section>: sein Fenster („Mehr Details“) darf nicht in der Ebene der Kachel (isolate) gefangen sein
  return (
    <div className="relative h-full min-h-0 min-w-0" data-einkauf-kachel>
      <section className={`${HALF} isolate`} aria-label={showDemo ? "Einkaufsliste · Beispiel" : "Einkaufsliste"} data-groesse={size}>
        <KachelWasserzeichen kachel="einkauf" size={size} frei={frei} />
        <ShoppingHead more={rows.restZahl} />
        {empty ? (
          <Link href="/einkaufsliste" className="mt-1 flex-1 text-[14px] font-semibold leading-snug text-muted">
            <span className="kachel-frei">Liste ist leer. Sag mir einfach, was ihr braucht.</span>
          </Link>
        ) : (
          <ShopRows {...rows} mine={showDemo || myShops.length > 0} products={shopping.settings.products} demo={showDemo} />
        )}
      </section>
      <QuickAddButton weekStart={shopping.weekStart} settings={shopping.settings} quick className="absolute right-0.5 top-0.5" />
    </div>
  );
}

/** Beispiel-Tag: eine Notiz und „Im Haus“ (Tafel 119) – nur zum Anzeigen, nie in echten Speichern */
const DEMO_NOTIZ = { title: "WLAN: Tohuus2026", line: "Router im Flur" };
const DEMO_HAUS = { name: "Hähnchen", badge: "heute" };

/** Kopf einer kleinen Kachel (26 px): Symbol + Label (öffnet die Seite), „+N“, rechts Platz für den Knopf */
function KleinKopf({ icon: Icon, label, href, more = 0, knopf }: { icon: typeof StickyNote; label: string; href: string; more?: number; knopf?: React.ReactNode }) {
  return (
    <div className="flex h-[26px] items-center gap-2">
      <Link href={href} className={`hit flex h-[26px] min-w-0 items-center ${HALF_LABEL}`} aria-label={`${label} öffnen`}>
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
        <span className="whitespace-nowrap">{label}</span>
      </Link>
      <span className="flex-1" />
      {more > 0 && (
        <Link href={href} className="hit flex h-[26px] shrink-0 items-center text-[12.5px] font-bold text-tile-accent" data-weitere>
          +{more}
        </Link>
      )}
      {knopf}
    </div>
  );
}

/**
 * NOTIZEN je Größe (Raster): XS = EINE Zeile (neueste bzw. angeheftete Notiz,
 * sonst „Schnell notieren.“), S und M = bis 3 Zeilen „Titel · Anfang“
 * (angeheftete zuerst), der Rest als „+N“. Kopf = Notizen-Seite, Zeile =
 * genau diese Notiz, Stift = Schnellnotiz. Beispiel-Tag: „WLAN: Tohuus2026“.
 */
export function NotesTile({ size = "XS", demo = false }: { size?: TileSize; demo?: boolean }) {
  const notes = useNotes();
  const own = (notes ?? []).filter((n) => !n.data.schnell);
  // Beispiel-Tag: erste eigene Notiz → Beispiel verschwindet für immer
  const hasOwn = own.length > 0;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("notizen");
  }, [demo, hasOwn]);
  const showDemo = demo && !hasOwn;
  const rows = showDemo ? [{ id: "", title: DEMO_NOTIZ.title, line: DEMO_NOTIZ.line, pinned: false }] : notizZeilen(own, size);
  const more = showDemo ? 0 : Math.max(0, own.length - rows.length);
  const href = (id: string) => (id ? `/notizen/bearbeiten?id=${id}` : "/notizen");
  const pen = <QuickButton icon={PenLine} label="Schnellnotiz schreiben" onClick={() => openQuick({ kind: "notiz" })} />;
  if (size === "XS") {
    const top = rows[0];
    return (
      <section className={XS_BOX} aria-label={showDemo ? "Notizen · Beispiel" : "Notizen"} data-notizen-groesse={size} data-groesse={size}>
        <KleinKopf icon={StickyNote} label="Notizen" href="/notizen" knopf={pen} />
        {top ? (
          <Link href={href(top.id)} className={`${XS_LINE} flex items-center gap-1`} data-zeile data-notiz-zeile>
            {top.pinned && <Pin className="h-3 w-3 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden />}
            <span className="truncate" data-freitext>{top.title}</span>
          </Link>
        ) : (
          <button type="button" onClick={() => openQuick({ kind: "notiz" })} className={`${XS_LINE} flex items-center gap-1 text-left text-muted`} data-zeile>
            <PenLine className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="whitespace-nowrap">Schnell notieren.</span>
          </button>
        )}
      </section>
    );
  }
  return (
    <section className={`${HALF} isolate gap-1`} aria-label={showDemo ? "Notizen · Beispiel" : "Notizen"} data-notizen-groesse={size} data-groesse={size}>
      <KachelWasserzeichen kachel="notizen" size={size} frei />
      <KleinKopf icon={StickyNote} label="Notizen" href="/notizen" more={more} knopf={pen} />
      {rows.length ? (
        <ul className="flex flex-col" aria-label="Notizen">
          {rows.map((r) => (
            <li key={r.id || "beispiel"}>
              <Link href={href(r.id)} className="flex min-h-[30px] items-center gap-1.5 text-[13.5px]" data-zeile data-notiz-zeile>
                {r.pinned ? <Pin className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2.25} aria-hidden /> : <StickyNote className="h-3.5 w-3.5 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />}
                <span className="min-w-0 flex-1 truncate" data-freitext>
                  <span className="font-semibold">{r.title}</span>
                  {r.line && <span className="kachel-frei text-muted"> · {r.line}</span>}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <button type="button" onClick={() => openQuick({ kind: "notiz" })} className="flex min-h-11 items-center text-left text-[13.5px] text-muted">
          <span className="kachel-frei">Schnell was aufschreiben.</span>
        </button>
      )}
    </section>
  );
}

/**
 * IM HAUS (Baustein): XS = EINE Zeile („Hähnchen · heute“: das Erste aus
 * „Bald aufbrauchen“, sonst das zuletzt Eingekaufte); S = bis 3 Zeilen à
 * 30 px (Symbol, Name, Schild) und unten „Was koch ich daraus?“ = Spontan
 * kochen (wie unter Essen). Leer: ein freundlicher Satz. In S hinten still
 * ein Kühlschrank als Wasserzeichen (freier Text: 9 %, Tafel 124 A/125).
 */
export function PantryTile({ size = "XS", demo = false }: { size?: TileSize; demo?: boolean }) {
  const pantry = usePantry();
  const hasOwn = (pantry?.length ?? 0) > 0;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("vorrat");
  }, [demo, hasOwn]);
  if (!pantry) return <section className={`${size === "XS" ? XS_BOX : HALF} animate-pulse`} aria-label="Im Haus" />;
  const showDemo = demo && !hasOwn;
  // S: zwei Zeilen + „Was koch ich daraus?“ passen auch auf dem iPhone SE in die feste Fläche
  const tile = houseTile(pantry, todayIso(), HOUSE_TILE_MAX[size === "XS" ? "XS" : "S"]);
  if (size === "XS") {
    const first = tile.items[0];
    // Name vor Schild (wie in S): der Name steht ganz, das Schild rutscht notfalls weg in die zweite Zeile
    const name = showDemo ? DEMO_HAUS.name : first?.item.name;
    const schild = showDemo ? DEMO_HAUS.badge : first?.badge?.text;
    const warm = showDemo || first?.badge?.tone === "orange";
    return (
      <section className={XS_BOX} aria-label={showDemo ? "Im Haus · Beispiel" : "Im Haus"} data-groesse={size}>
        <KleinKopf icon={Refrigerator} label="Im Haus" href="/vorrat" />
        <Link href="/vorrat" className={`block min-w-0 overflow-hidden text-[15px] font-bold leading-tight ${name ? "flex flex-wrap items-center gap-x-1.5" : "text-muted"}`} data-zeile>
          {name ? (
            <>
              <span className="min-w-0 break-words">{name}</span>
              {/* Schild wie in S (10,5 px, Tafel 133) – braucht kaum Platz neben dem Namen */}
              {schild && <span className={`whitespace-nowrap rounded-full px-1.5 text-[10.5px] font-bold leading-[16px] ${warm ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn-ink"}`}>{schild}</span>}
            </>
          ) : (
            "Was ist da?"
          )}
        </Link>
      </section>
    );
  }
  return (
    <section className={`${HALF} isolate gap-1`} aria-label="Im Haus" data-groesse={size}>
      <KachelWasserzeichen kachel="vorrat" size={size} frei />
      <KleinKopf icon={Refrigerator} label="Im Haus" href="/vorrat" />
      <Link href="/vorrat" className="flex min-w-0 flex-col" data-zeile>
        {showDemo ? (
          <HausZeile name={DEMO_HAUS.name} badge={{ text: DEMO_HAUS.badge, tone: "orange" }} />
        ) : tile.items.length ? (
          tile.items.map(({ item, badge }) => (
            <HausZeile key={item.id} name={item.name} badge={badge} />
          ))
        ) : (
          <span className="mt-1 text-[14px] font-semibold leading-snug text-muted">
            <span className="kachel-frei">Sag mir, was da ist, dann schlag ich was vor.</span>
          </span>
        )}
      </Link>
      {(tile.items.length > 0 || showDemo) && (
        <button type="button" onClick={() => openHelper("spontan")} className="hit kachel-frei -ml-1 mt-auto flex min-h-[30px] items-center gap-1 self-start rounded-full px-1 text-left text-[13px] font-bold leading-tight text-accent-strong">
          <ChefHat className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
          Was koch ich daraus?
        </button>
      )}
    </section>
  );
}

/**
 * Eine Zeile „Im Haus“ (S): Symbol 20 px, Name 14 px in voller Länge (nie
 * „Würstc…“), Schild 10,5 px rechts daneben; passt beides nicht in eine
 * Zeile, rutscht nur das Schild in die Zeile darunter.
 */
function HausZeile({ name, badge }: { name: string; badge: { text: string; tone: string } | null | undefined }) {
  return (
    <span className="flex min-h-[30px] min-w-0 items-center gap-1.5" data-haus-zeile>
      <ItemSymbol id={symbolFor(name)} name={name} className="h-5 w-5 shrink-0 text-[15px]" />
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5">
        <span className="min-w-0 break-words text-[14px] font-bold leading-tight" data-haus-name>{name}</span>
        {badge && <span className={`ml-auto shrink-0 rounded-full px-1.5 text-[10.5px] font-bold leading-[1.5] ${badge.tone === "orange" ? "bg-accent-soft text-accent-strong" : "bg-warn-soft text-warn-ink"}`}>{badge.text}</span>}
      </span>
    </span>
  );
}
