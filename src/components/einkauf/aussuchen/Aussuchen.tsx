"use client";

// Aussuchen (/einkaufsliste/aussuchen, Tafel 111 + Nachtrag): erst Laden,
// dann Sachen. Oben „Für welchen Laden?“ – „Meine Läden“ als große Knöpfe (2
// Spalten, hell in Ladenfarbe; aktiv voll in Ladenfarbe mit Zahl der heute
// gewählten Sachen). Darunter, beim Scrollen sichtbar, das Suchfeld „In Rewe
// suchen …“ und die wischbare Chip-Reihe der Abschnitte (Tipp = springen,
// aktiver hervorgehoben). Die Abschnitte kleben beim Scrollen oben.
// Antippen = sofort in den aktiven Laden (Haken in Ladenfarbe, als Laden
// gemerkt), nochmal = wieder raus; in einem anderen Laden Gewähltes zieht um.
// Halten = Menge. Unten die dunkle Leiste „● Rewe 3 · ● Rossmann 2“ + „Fertig“.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Search, Store } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { MoreMenu } from "@/components/ui/MoreMenu";
import { Sheet } from "@/components/ui/Sheet";
import { NumberStepper } from "@/components/ui/NumberStepper";
import { CARD, INPUT_BASE, SECTION_TITLE, UEBER_LEISTE, buttonClass, chipClass } from "@/components/ui/styles";
import { addManualItem, removeManualItem, removeManualItems, setHave, updateManualItem, type ListItem } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { usePantry } from "@/lib/vorrat/pantry";
import { useMeineLaeden, FRAGE_LAEDEN } from "@/lib/einkauf/meineLaeden";
import { setShopChip, useShopChip } from "@/lib/einkauf/shopMode";
import { recentBought } from "@/lib/einkauf/kacheln/view";
import { grundsachen } from "@/lib/einkauf/kacheln/gruppen";
import { einsortieren } from "@/lib/einkauf/einsortieren";
import { useEinkaufWoche } from "@/lib/einkauf/seite/karten";
import { shopTone } from "@/lib/einkauf/shopGroups";
import { aussuchenAbschnitte, aussuchenSuche, kennzeichen, mengeAus, mengeText, mengeZahl, tippAktion, zusammenfassung, type Abschnitt, type AbschnittId, type Eintrag, type Verlauf } from "@/lib/einkauf/aussuchen/abschnitte";
import { buzz } from "@/components/heute/actions";
import { MeineLaedenSheet } from "@/components/einkauf/MeineLaeden";
import { AussuchenKachel } from "@/components/einkauf/aussuchen/AussuchenKachel";

const lower = (s: string) => s.trim().toLowerCase();
/** So lange nach einem Sprung per Chip zählt das Scrollen nicht für die Hervorhebung */
const SPRUNG_MS = 1500;

/** Heute hier gewählt: in welchem Laden, wie es vorher war (Rückweg) und ob wir es neu angelegt haben */
type Wahl = { name: string; shop: string; zurueck: () => void; manualId?: string };

export function Aussuchen() {
  const router = useRouter();
  const woche = useEinkaufWoche();
  const data = useWeekShoppingList(woche);
  const meine = useMeineLaeden();
  const pantry = usePantry();
  const stored = useShopChip();
  const [gewaehlt, setGewaehlt] = useState<Record<string, Wahl>>({});
  const [query, setQuery] = useState("");
  const [lebensmittel, setLebensmittel] = useState(false);
  const [menge, setMenge] = useState<ListItem | null>(null);
  const [laedenOffen, setLaedenOffen] = useState(false);
  const [aktivAbschnitt, setAktivAbschnitt] = useState<AbschnittId | null>(null);
  const [kopf, setKopf] = useState(0);
  const oben = useRef<HTMLDivElement>(null);
  const [obenHoehe, setObenHoehe] = useState(0);
  const sprung = useRef(0);
  const myShops = meine?.myShops ?? [];
  const laeden = myShops.length ? myShops : FRAGE_LAEDEN.slice(0, 4);
  const gemerkt = stored.startsWith("laden:") ? stored.slice(6) : "";
  const aktiv = laeden.find((l) => lower(l) === lower(gemerkt)) ?? laeden[0];

  // Höhe des festen Kopfs und der klebenden Suche messen (Abschnitts-Überschriften kleben darunter)
  useEffect(() => {
    const header = document.querySelector<HTMLElement>("[data-sticky-header]");
    const messen = () => {
      setKopf(header?.offsetHeight ?? 0);
      setObenHoehe(oben.current?.offsetHeight ?? 0);
    };
    messen();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(messen) : null;
    if (header) ro?.observe(header);
    if (oben.current) ro?.observe(oben.current);
    return () => ro?.disconnect();
  }, [data]);

  const visible = data?.list.items.filter((i) => !i.hidden) ?? [];
  const s = data?.settings;
  // Feste Abschnitte: „Oft bei …“/„Beliebt“ aus dem Stand beim Öffnen – Antippen (= neue Regel) lässt nichts verschwinden
  const [stand, setStand] = useState<Verlauf | null>(null);
  if (s && !stand) setStand({ itemShops: s.itemShops, shopRules: s.shopRules, learned: s.learned, staples: s.staples, gekauft: recentBought([visible]) });
  const abschnitte: Abschnitt[] = stand ? aussuchenAbschnitte({ shop: aktiv, items: visible, verlauf: stand }) : [];
  const abschnittIds = abschnitte.map((a) => a.id).join(",");

  // Aktiver Abschnitt beim Scrollen (für die Chip-Reihe)
  useEffect(() => {
    const els = [...document.querySelectorAll<HTMLElement>("[data-abschnitt]")];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const sichtbar = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        // Nach einem Sprung per Chip bleibt der getippte Abschnitt hervorgehoben (der letzte kommt oft nicht bis ganz nach oben)
        if (sichtbar && sichtbar.time - sprung.current > SPRUNG_MS) setAktivAbschnitt(sichtbar.target.getAttribute("data-abschnitt") as AbschnittId);
      },
      { rootMargin: `-${kopf + obenHoehe + 4}px 0px -55% 0px` },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [abschnittIds, kopf, obenHoehe, lebensmittel, query]);

  if (!data) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const { weekStart, settings } = data;
  const open = grundsachen(visible.filter((i) => !i.checked), settings.alwaysList).liste;
  const imHausNamen = (pantry ?? []).map((p) => p.name);
  const summe = zusammenfassung(Object.values(gewaehlt), laeden);
  const zahl = (shop: string) => summe.find((x) => lower(x.shop) === lower(shop))?.n ?? 0;

  const tippen = (e: Eintrag) => {
    const key = lower(e.name);
    const { item } = kennzeichen(e.name, open, imHausNamen);
    const wahl = gewaehlt[key];
    const aktion = tippAktion(item, aktiv);
    buzz();
    if (aktion === "raus") {
      if (wahl) {
        wahl.zurueck();
        if (wahl.manualId) removeManualItems(weekStart, [wahl.manualId]);
      } else if (item?.manualId) removeManualItem(weekStart, item.manualId);
      else if (item) setHave(weekStart, item.key, true);
      setGewaehlt((g) => {
        const next = { ...g };
        delete next[key];
        return next;
      });
      return;
    }
    if (aktion === "umziehen" && item) {
      // Schon heute woanders gewählt: erst zurück, dann hierher
      wahl?.zurueck();
      const zurueck = einsortieren(item.name, aktiv, true);
      setGewaehlt((g) => ({ ...g, [key]: { name: item.name, shop: aktiv, zurueck, manualId: wahl?.manualId } }));
      return;
    }
    const manualId = addManualItem(weekStart, { name: e.name, amount: "", section: e.section });
    const zurueck = einsortieren(e.name, aktiv, true);
    setGewaehlt((g) => ({ ...g, [key]: { name: e.name, shop: aktiv, zurueck, manualId } }));
  };

  /** Halten: Menge (steht es noch nicht drauf, kommt es erst in den aktiven Laden) */
  const halten = (e: Eintrag) => {
    const { item } = kennzeichen(e.name, open, imHausNamen);
    if (item) return setMenge(item);
    tippen(e);
    setMenge({ key: `neu:${e.name}`, name: e.name, originalName: e.name, amount: "", section: e.section, dishes: [], days: [], shop: aktiv, checked: false, hidden: false });
  };

  /** `zeit` = Zeitstempel des Tipps (gleiche Uhr wie die Einträge des IntersectionObserver) */
  const springen = (id: AbschnittId, zeit: number) => {
    sprung.current = zeit;
    setAktivAbschnitt(id);
    document.querySelector(`[data-abschnitt="${id}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const kachel = (e: Eintrag) => {
    const k = kennzeichen(e.name, open, imHausNamen);
    return (
      <AussuchenKachel
        key={lower(e.name)}
        name={e.name}
        tag={e.tag}
        products={settings.products}
        laden={k.item?.shop ?? ""}
        drauf={Boolean(k.item)}
        aktiv={aktiv}
        imHaus={k.imHaus}
        menge={mengeText(k.item?.amount ?? "")}
        onTap={() => tippen(e)}
        onHold={() => halten(e)}
      />
    );
  };

  const treffer = query.trim() ? aussuchenSuche(query, abschnitte) : null;
  const zu = abschnitte.filter((a) => a.eingeklappt);
  const sichtbar = abschnitte.filter((a) => !a.eingeklappt || lebensmittel);
  // Menge des gerade gehaltenen Artikels (frisch aus der Liste)
  const mengeItem = menge ? (open.find((i) => lower(i.name) === lower(menge.name)) ?? null) : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Aussuchen" backHref="/einkaufsliste" action={<MoreMenu title="Aussuchen" items={[{ label: "Meine Läden bearbeiten", icon: Store, onClick: () => setLaedenOffen(true) }]} />} />
      <main className="flex flex-1 flex-col gap-3 px-4 pt-2" style={{ paddingBottom: `calc(${UEBER_LEISTE} + 7rem)` }}>
        <section aria-label="Für welchen Laden?" className="flex flex-col gap-2">
          <h2 className={`${SECTION_TITLE} px-1`}>Für welchen Laden?</h2>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Für welchen Laden?">
            {laeden.map((l) => {
              const on = lower(l) === lower(aktiv);
              const tone = shopTone(l);
              const n = zahl(l);
              return (
                <button
                  key={l}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setShopChip(`laden:${l}`)}
                  className={`hit flex min-h-14 min-w-0 items-center justify-center gap-2 rounded-card px-3 text-[17px] font-extrabold transition active:scale-[0.98] ${on ? "text-on-accent shadow-card" : "text-ink"}`}
                  style={{ background: on ? `var(--app-shop-${tone})` : `var(--app-shop-${tone}-soft)` }}
                  data-aussuchen-laden={l}
                >
                  <span className="truncate">{l}</span>
                  {n > 0 && <span className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] font-extrabold tabular-nums ${on ? "bg-surface/30 text-on-accent" : "bg-surface text-ink"}`}>{n}</span>}
                </button>
              );
            })}
          </div>
        </section>

        <div ref={oben} className="sticky z-[5] -mx-4 flex flex-col gap-2 bg-background/95 px-4 pb-2 pt-1 backdrop-blur" style={{ top: kopf }} data-aussuchen-oben>
          <label className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-5 w-5 text-muted" strokeWidth={2} aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} enterKeyHint="search" aria-label={`In ${aktiv} suchen`} placeholder={`In ${aktiv} suchen …`} className={`${INPUT_BASE} h-12 w-full pl-11 pr-4`} />
          </label>
          {!treffer && (
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5" data-no-swipe data-abschnitt-chips>
              {sichtbar.map((a) => (
                <button key={a.id} type="button" aria-pressed={aktivAbschnitt === a.id} onClick={(e) => springen(a.id, e.timeStamp)} className={`${chipClass(aktivAbschnitt === a.id)} shrink-0`}>
                  {a.id === "oft" ? a.label.replace(/ · .*$/, "") : a.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {treffer ? (
          <section aria-label="Treffer" className="grid grid-cols-3 gap-2" data-treffer>
            {treffer.map(kachel)}
          </section>
        ) : (
          <>
            {sichtbar.map((a, i) => (
              <div key={a.id} className="contents">
                {a.eingeklappt && sichtbar.findIndex((x) => x.eingeklappt) === i && <LebensmittelZeile shop={aktiv} auf onToggle={() => setLebensmittel(false)} />}
                <section aria-label={a.label} className="flex flex-col gap-2" data-abschnitt={a.id} style={{ scrollMarginTop: kopf + obenHoehe }}>
                  <h3 className="sticky z-[4] -mx-4 bg-background/95 px-5 py-1 text-[13px] font-bold text-muted backdrop-blur" style={{ top: kopf + obenHoehe }}>
                    {a.label}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">{a.eintraege.map(kachel)}</div>
                </section>
              </div>
            ))}
            {zu.length > 0 && !lebensmittel && <LebensmittelZeile shop={aktiv} auf={false} onToggle={() => setLebensmittel(true)} />}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 z-20 mx-auto flex w-[calc(100%-2rem)] max-w-md items-center gap-3 rounded-card bg-leiste-dunkel py-2 pl-4 pr-2 text-leiste-dunkel-ink shadow-float" style={{ bottom: UEBER_LEISTE }} data-aussuchen-leiste>
        <p className="flex min-w-0 flex-1 items-center gap-2 truncate text-[15px] font-bold" role="status">
          {summe.length === 0 ? (
            <span className="truncate opacity-80">Antippen, dann landet’s bei {aktiv}</span>
          ) : (
            summe.map((x, i) => (
              <span key={x.shop} className="flex shrink-0 items-center gap-1.5">
                {i > 0 && <span className="opacity-60">·</span>}
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: `var(--app-shop-${shopTone(x.shop)})` }} aria-hidden />
                {x.shop} {x.n}
              </span>
            ))
          )}
        </p>
        <button type="button" onClick={() => router.push("/einkaufsliste")} className={`${buttonClass("primary", "md")} shrink-0`} data-fertig>
          Fertig
        </button>
      </div>

      {menge && (
        <Sheet title="Wie viel?" onClose={() => setMenge(null)}>
          <div className="pb-3">
            <NumberStepper
              label={menge.name}
              hint={mengeItem?.manualId ? undefined : "Kommt aus dem Wochenplan"}
              value={mengeZahl(mengeItem?.amount ?? "")}
              min={1}
              max={99}
              onChange={(n) => mengeItem?.manualId && updateManualItem(weekStart, mengeItem.manualId, { amount: mengeAus(n) })}
            />
          </div>
        </Sheet>
      )}
      {laedenOffen && <MeineLaedenSheet shops={settings.shops} myShops={myShops} rules={settings.shopRules} onClose={() => setLaedenOffen(false)} />}
    </div>
  );
}

/** Drogerie-Laden: „Lebensmittel bei Rossmann ›“ (auf- und zuklappen) */
function LebensmittelZeile({ shop, auf, onToggle }: { shop: string; auf: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={auf} className={`${CARD} hit flex min-h-12 items-center justify-between px-4 text-left text-[15px] font-semibold`} data-lebensmittel>
      Lebensmittel bei {shop}
      <ChevronRight className={`h-4 w-4 shrink-0 text-muted transition ${auf ? "rotate-90" : ""}`} strokeWidth={2.5} aria-hidden />
    </button>
  );
}
