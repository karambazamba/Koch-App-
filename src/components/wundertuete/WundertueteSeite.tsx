"use client";

// /wundertuete (A-052, Tafel 137/140; A-059, Tafel 145): die Karte groß,
// erst nur die Frage, darunter verdeckt „Antippen für die Lösung“; Antippen
// der Karte deckt Lösung, Bedeutung bzw. Pointe auf. Kommt man von der
// umgedrehten Kachel („Mehr ›“), ist sie schon aufgedeckt. Filter Alles · Witze ·
// Platt · Wissen (umbrechen statt abschneiden), großer Knopf „Noch eine ›“
// (beliebig oft, nie doppelt; vor dem Aufdecken hell, aber tippbar) und
// darunter „Nie doppelt. <Name> legt immer neue nach.“ Nichts Ungesehenes
// mehr: „… kommt bald.“ statt einer Wiederholung. Kein Zähler, keine Punkte.

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Anchor, ChevronRight, Gift, RotateCw, Share } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuickButton } from "@/components/ui/QuickButton";
import { CARD, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { haushaltOf } from "@/lib/core/haushalt";
import { toIsoDate, useMinutes, useToday } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profileHelper";
import { useForecast } from "@/lib/wetter/client";
import { karteMix } from "@/lib/wundertuete/mischung";
import { rtLaden, useRaetsel } from "@/lib/raetsel/store";
import { lageAus } from "@/lib/wundertuete/lage";
import { loadWt, useWundertuete, wtNoch, wtZeigen } from "@/lib/wundertuete/store";
import { istAufgedeckt, merkeAufgedeckt } from "@/lib/wundertuete/aufgedeckt";
import { ANTIPPEN, FILTER, KOMMT_BALD, antwortTeile, sorteMeta, teilText, type Eintrag, type Filter } from "@/lib/wundertuete/sorten";

/** Antwort mit EINEM fetten Wort */
const Antwort = ({ text }: { text: string }) => <>{antwortTeile(text).map((t, i) => (t.fett ? <strong key={i} className="font-extrabold">{t.text}</strong> : <span key={i}>{t.text}</span>))}</>;

/** Überschrift des Lösungsfelds je Sorte */
const loesungsWort = (karte: Eintrag) => (karte.sorte === "platt" ? "Heißt" : karte.sorte === "witz" ? "Pointe" : "Lösung");

function KarteGross({ karte, name, gezeigt, onAufdecken }: { karte: Eintrag; name: string; gezeigt: boolean; onAufdecken: () => void }) {
  const meta = sorteMeta(karte.sorte);
  const Icon = meta.symbol === "anchor" ? Anchor : Gift;
  const teilen = async () => {
    const text = teilText(karte, name);
    try {
      if (navigator.share) return void (await navigator.share({ text }));
      await navigator.clipboard.writeText(text);
      showToast({ text: "Kopiert", seconds: 2, small: true });
    } catch (error) {
      if ((error as Error)?.name !== "AbortError") showToast({ text: "Teilen hat grad nicht geklappt.", seconds: 3, small: true });
    }
  };
  return (
    <section className={`${CARD} wt-neu flex flex-col gap-4 p-5`} key={karte.id} data-wt-karte={karte.id} data-sorte={karte.sorte} data-tone={meta.tone} data-gezeigt={gezeigt || undefined} aria-live="polite">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-tile-accent" strokeWidth={2} aria-hidden />
        <span className="flex-1 text-[12px] font-extrabold uppercase tracking-wider text-tile-accent">{meta.label ?? meta.titel}</span>
        <QuickButton icon={Share} label="Teilen" onClick={() => void teilen()} />
      </div>
      {/* Ganze Karte antippen deckt auf (Tafel 145) */}
      <button type="button" className="flex flex-col gap-4 text-left" onClick={onAufdecken} aria-label={gezeigt ? undefined : `${karte.vorne} ${ANTIPPEN}`} aria-expanded={gezeigt} data-aufdecken>
        <span className="block text-[26px] font-extrabold leading-tight tracking-tight hyphens-none" lang="de" data-frage>
          {karte.vorne}
        </span>
        {karte.hinten &&
          (gezeigt ? (
            <span className="wt-neu block rounded-field border-2 border-dashed border-accent/40 px-4 py-3" data-loesung={meta.frage || undefined} data-pointe={meta.frage ? undefined : true}>
              <span className="block text-[11px] font-extrabold uppercase tracking-wider text-accent-strong">{loesungsWort(karte)}</span>
              <span className="mt-1 block text-[21px] font-semibold leading-snug hyphens-none" lang="de">
                <Antwort text={karte.hinten} />
              </span>
            </span>
          ) : (
            <span className="flex min-h-24 items-center justify-center gap-2 rounded-field border-2 border-dashed border-accent/40 px-4 py-3 text-[17px] font-bold text-accent-strong" data-verdeckt>
              <RotateCw className="h-[18px] w-[18px] shrink-0" strokeWidth={2.5} aria-hidden />
              {ANTIPPEN}
            </span>
          ))}
      </button>
    </section>
  );
}

export function WundertueteSeite() {
  const sorte = useSearchParams().get("sorte");
  const stand = useWundertuete();
  const profile = useProfile();
  const day = useToday();
  const minutes = useMinutes();
  const { forecast } = useForecast();
  const [filter, setFilter] = useState<Filter>(() => FILTER.find((x) => x.id === sorte)?.id ?? "alles");
  const bereit = Boolean(day && minutes !== undefined && profile !== undefined);
  const lage = bereit ? lageAus({ heute: toIsoDate(day!), minuten: minutes!, haushalt: haushaltOf(profile?.householdType), forecast }) : null;
  const rt = useRaetsel();
  // Ohne Karte von heute (direkt aufgerufen): wie die Kachel die Karte des Tages;
  // mit `?sorte=raetsel` (Mia: „Gib mir ein Rätsel“, A-064) gleich eine Karte dieser Sorte
  useEffect(() => {
    if (!lage) return;
    wtZeigen(lage);
    const aktuell = karteMix({ wt: loadWt(), rt: rtLaden() });
    if (filter !== "alles" && aktuell?.sorte !== filter) wtNoch(lage, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmal, sobald Tag und Profil da sind
  }, [bereit]);
  const karte = stand && rt ? karteMix({ wt: stand, rt }) : undefined;
  const sichtbar = karte && (filter === "alles" || karte.sorte === filter) ? karte : undefined;
  const waehlen = (f: Filter) => {
    setFilter(f);
    if (lage && !(karte && (f === "alles" || karte.sorte === f))) wtNoch(lage, f);
  };
  const name = helperName(profile);
  // Lösung erst nach Antippen; von der umgedrehten Kachel kommend schon aufgedeckt
  const [gezeigtId, setGezeigtId] = useState<string | null>(null);
  const gezeigt = Boolean(sichtbar && (gezeigtId === sichtbar.id || istAufgedeckt(sichtbar.id) || !sichtbar.hinten));
  const aufdecken = () => {
    if (!sichtbar) return;
    merkeAufgedeckt(sichtbar.id, true);
    setGezeigtId(sichtbar.id);
  };
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wundertüte" backHref="/" />
      <main className={PAGE_MAIN}>
        <div className="flex flex-wrap gap-2 pb-1" role="group" aria-label="Sorte">
          {FILTER.map((f) => (
            <button key={f.id} type="button" className={chipClass(filter === f.id)} aria-pressed={filter === f.id} onClick={() => waehlen(f.id)} data-filter={f.id}>
              {f.label}
            </button>
          ))}
        </div>
        {!stand || !rt || !bereit ? (
          <div className={`${CARD} h-64 animate-pulse`} />
        ) : sichtbar ? (
          <KarteGross key={sichtbar.id} karte={sichtbar} name={name} gezeigt={gezeigt} onAufdecken={aufdecken} />
        ) : (
          <section className={`${CARD} flex min-h-40 items-center justify-center p-6 text-center`} data-kommt-bald>
            <p className="text-[20px] font-extrabold leading-snug">{KOMMT_BALD[filter]}</p>
          </section>
        )}
        {/* Vor dem Aufdecken hell (trotzdem tippbar), danach orange (Tafel 145) */}
        <button type="button" className={`${buttonClass("primary", "lg")} w-full transition-opacity ${sichtbar && !gezeigt ? "opacity-45" : ""}`} onClick={() => lage && wtNoch(lage, filter)} disabled={!lage} data-noch-eine data-hell={(sichtbar && !gezeigt) || undefined}>
          Noch eine <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
        <p className="text-center text-[14px] font-semibold text-muted">Nie doppelt. {name} legt immer neue nach.</p>
      </main>
    </div>
  );
}
