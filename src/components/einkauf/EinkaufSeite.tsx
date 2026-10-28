"use client";

// Seite „Einkauf“ (/einkaufsliste, Tafel 110, Bild 1) – so klar wie die
// Kachel: oben zwei große Knöpfe „Einsprechen · Einfach aufzählen“ (holt Mia
// im Modus „Einkauf“) und „Aussuchen · Suchen & antippen“ (Seite
// /einkaufsliste/aussuchen). Darunter „Meine Läden“ als große farbige Karten
// (auch mit 0, Tipp = Laden-Seite) und – nur wenn es das gibt – „Noch ohne
// Laden“ mit Chips zum Antippen oder Draufziehen und „Mia sortiert“. Alles
// Seltene steckt im „···“. Kein Einkaufsmodus, keine Abteilungen, keine
// Hinweiszeilen: Abhaken geht auf der Laden-Seite (zu Hause und im Laden).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mic, Search, Store } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, SECTION_TITLE } from "@/components/ui/styles";
import { addManualItem, carryOverManual, removeManualItem, sectionFor, setHave, shoppingListText, type ListItem } from "@/lib/einkauf/shoppingList";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { formatWeekRange } from "@/lib/essen/weekPlan";
import { recentBought } from "@/lib/einkauf/kacheln/view";
import { grundsachen } from "@/lib/einkauf/kacheln/gruppen";
import { gelernterLaden } from "@/lib/einkauf/shopRules";
import { useMeineLaeden, vorauswahl } from "@/lib/einkauf/meineLaeden";
import { einsortieren, einsortiertText, miaSortiert, sortiertText, sortierVorschlaege } from "@/lib/einkauf/einsortieren";
import { ladenKarten, ohneLadenListe, setEinkaufWoche, useEinkaufWoche } from "@/lib/einkauf/seite/karten";
import { plusFromLink } from "@/lib/einkauf/unterwegs/unterwegs";
import { openHelper } from "@/lib/begleitung/open";
import { showDeleted, showToast } from "@/lib/core/toast";
import { helperName } from "@/lib/einstellungen/profile";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { LadenFrage, MeineLaedenSheet } from "@/components/einkauf/MeineLaeden";
import { WoKaufstDuSheet } from "@/components/einkauf/Einsortieren";
import { AntwortZeile, useDavorLink } from "@/components/einkauf/unterwegs/Antwort";
import { useEinkaufBeispiel } from "@/components/einkauf/EinkaufBeispiel";
import { LadenKarteView } from "@/components/einkauf/seite/LadenKarten";
import { OhneLadenZone } from "@/components/einkauf/seite/OhneLaden";
import { EinkaufMenue } from "@/components/einkauf/seite/EinkaufMenue";

const SKELETON = <div className={`${CARD} m-4 h-64 animate-pulse`} />;
const GROSS = "hit flex min-h-[88px] flex-col items-start justify-center gap-1 rounded-card px-4 py-3 text-left active:scale-[0.98]";

export function EinkaufSeite() {
  const router = useRouter();
  const woche = useEinkaufWoche();
  const data = useWeekShoppingList(woche);
  const meine = useMeineLaeden();
  const profile = useProfile();
  const beispiel = useEinkaufBeispiel();
  const [sorting, setSorting] = useState<ListItem | null>(null);
  const [ziel, setZiel] = useState<string | null>(null);
  const [shopsOpen, setShopsOpen] = useState(false);
  const myShops = meine?.myShops ?? [];
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
  // „n ohne Laden“ auf der Startseite: am Bereich „Noch ohne Laden“ öffnen
  const loaded = Boolean(data);
  useEffect(() => {
    if (loaded && window.location.hash === "#ohne-laden") document.getElementById("ohne-laden")?.scrollIntoView({ block: "start" });
  }, [loaded]);

  if (!data) return SKELETON;
  const { weekStart, isNext, list, settings } = data;
  const visible = list.items.filter((i) => !i.hidden);
  const open = visible.filter((i) => !i.checked);
  // Grundsachen aus Rezepten (Salz, Pfeffer …) stehen nicht herum – sie sind unter „Aussuchen · Für eure Woche“
  const liste = grundsachen(open, settings.alwaysList).liste;
  const leer = liste.length === 0;
  const zeigBeispiel = leer && beispiel;
  const karten = zeigBeispiel ? beispiel.karten : ladenKarten(liste, myShops);
  const ohne = zeigBeispiel ? beispiel.ohne : ohneLadenListe(liste);
  const kennt = sortierVorschlaege(ohne, { itemShops: settings.itemShops, learned: settings.learned }).length > 0;

  /** Losgelassen auf einer Laden-Karte: sofort dort und gemerkt (Rückgängig = Regel wieder weg) */
  const drop = (item: ListItem, shop: string) => {
    const undo = einsortieren(item.name, shop, true);
    showToast({ text: einsortiertText(item.name, shop, true), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
  };

  /** „Wo kaufst du das?“ (Chip antippen) */
  const pick = (item: ListItem, shop: string, immer: boolean) => {
    const always = immer && Boolean(shop);
    const undo = einsortieren(item.name, shop, always);
    showToast({ text: einsortiertText(item.name, shop, always), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
    setSorting(null);
  };

  const share = async () => {
    const text = shoppingListText(list, `🛒 Einkaufsliste ${formatWeekRange(weekStart)}`);
    try {
      if (navigator.share) return void (await navigator.share({ title: "Einkaufsliste", text }));
      await navigator.clipboard.writeText(text);
      showToast({ text: "Liste kopiert. Jetzt in eine Nachricht einfügen.", small: true });
    } catch (error) {
      // Abbrechen im Teilen-Menü ist kein Fehler
      if ((error as Error)?.name !== "AbortError") showToast({ text: "Teilen hat nicht geklappt.", small: true });
    }
  };

  /** Löschen (eigene Artikel) bzw. „Haben wir schon“ (Zutaten aus Gerichten) */
  const remove = (item: ListItem) =>
    item.manualId
      ? { label: "Löschen", onClick: () => (showDeleted(removeManualItem(weekStart, item.manualId!), `${item.name} gelöscht`), setSorting(null)) }
      : { label: "Haben wir schon", onClick: () => (setHave(weekStart, item.key, true), setSorting(null)) };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader
        title="Einkauf"
        subtitle={isNext ? `Nächste Woche · ${formatWeekRange(weekStart)}` : undefined}
        tippZeigMal={() => setShopsOpen(true)}
        action={
          <EinkaufMenue
            weekStart={weekStart}
            isNext={isNext}
            planning={data.planning}
            onWoche={() => setEinkaufWoche(isNext ? "current" : "next")}
            gekauft={recentBought([visible])}
            schonDa={list.items.filter((i) => i.hidden)}
            ohneZutaten={list.missing}
            settings={settings}
            myShops={myShops}
            onShare={() => void share()}
          />
        }
      />
      <main className={PAGE_MAIN}>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => openHelper("einkauf")} className={`${GROSS} bg-accent text-on-accent shadow-card`} data-einsprechen>
            <Mic className="h-6 w-6" strokeWidth={2.25} aria-hidden />
            <span className="text-[17px] font-extrabold leading-tight">Einsprechen</span>
            <span className="text-[13px] font-semibold leading-tight opacity-90">Einfach aufzählen</span>
          </button>
          <Link href="/einkaufsliste/aussuchen" className={`${GROSS} ${CARD}`} data-aussuchen>
            <Search className="h-6 w-6 text-accent" strokeWidth={2.25} aria-hidden />
            <span className="text-[17px] font-extrabold leading-tight">Aussuchen</span>
            <span className="text-[13px] font-semibold leading-tight text-muted">Suchen & antippen</span>
          </Link>
        </div>

        <AntwortZeile />

        {meine && !meine.shopsAsked && !zeigBeispiel && <LadenFrage shops={settings.shops} preselected={vorauswahl(settings.itemShops)} />}

        {(karten.length > 0 || meine?.shopsAsked) && (
          <section aria-label="Meine Läden" className="flex flex-col gap-2" data-meine-laeden-karten>
            <h2 className={`${SECTION_TITLE} flex items-baseline gap-2 px-1`}>
              Meine Läden
              {zeigBeispiel && <span className="text-xs font-semibold text-muted">Beispiel</span>}
            </h2>
            {karten.map((k) => (
              <LadenKarteView key={k.shop || "egal"} karte={k} products={settings.products} ziel={ziel !== null && ziel === k.shop} beispiel={Boolean(zeigBeispiel)} />
            ))}
            {karten.length === 0 && (
              <button type="button" onClick={() => setShopsOpen(true)} className="hit flex min-h-[76px] items-center justify-center gap-2 rounded-card border-2 border-dashed border-line-strong text-[16px] font-bold text-muted">
                <Store className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                Läden wählen
              </button>
            )}
          </section>
        )}

        <OhneLadenZone
          items={ohne}
          products={settings.products}
          sortierer={kennt && !zeigBeispiel ? helperName(profile) : null}
          onSort={() => {
            const { count, undo } = miaSortiert(ohne);
            if (count) showToast({ text: sortiertText(count), undo, undoneText: "Wieder wie vorher", seconds: 4, small: true });
          }}
          onTap={(item) => !zeigBeispiel && setSorting(item)}
          onZiel={setZiel}
          onDrop={(item, shop) => !zeigBeispiel && drop(item, shop)}
        />

        {leer && !beispiel && <p className="px-1 text-center text-[15px] text-muted">Die Liste ist leer. Einsprechen oder aussuchen, ich sortier’s in die Läden.</p>}
      </main>

      {shopsOpen && <MeineLaedenSheet shops={settings.shops} myShops={myShops} rules={settings.shopRules} onClose={() => setShopsOpen(false)} />}
      {sorting && (
        <WoKaufstDuSheet
          item={sorting}
          myShops={myShops}
          vorschlag={gelernterLaden(sorting.name, { itemShops: settings.itemShops, learned: settings.learned })}
          products={settings.products}
          onPick={(shop, immer) => pick(sorting, shop, immer)}
          remove={remove(sorting)}
          onClose={() => setSorting(null)}
        />
      )}
    </div>
  );
}
