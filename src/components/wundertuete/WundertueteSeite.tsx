"use client";

// /wundertuete (A-052, Tafel 137/140): die Karte groß, die Lösung bzw.
// Bedeutung gleich mit (die Kachel sagt „Antippen für die Lösung“ – hier
// steht sie), beim Witz die Pointe. Filter Alles · Witze · Plattdeutsch ·
// Angeberwissen, großer Knopf „Noch eine ›“ (beliebig oft, nie doppelt) und
// darunter „Nie doppelt. <Name> legt immer neue nach.“ Nichts Ungesehenes
// mehr: „… kommt bald.“ statt einer Wiederholung. Kein Zähler, keine Punkte.

import { useEffect, useState } from "react";
import { Anchor, ChevronRight, Gift, Share } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuickButton } from "@/components/ui/QuickButton";
import { CARD, PAGE_MAIN, buttonClass, chipClass } from "@/components/ui/styles";
import { haushaltOf } from "@/lib/core/haushalt";
import { toIsoDate, useMinutes, useToday } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profileHelper";
import { useForecast } from "@/lib/wetter/client";
import { karteVon } from "@/lib/wundertuete/auswahl";
import { lageAus } from "@/lib/wundertuete/lage";
import { useWundertuete, wtNoch, wtZeigen } from "@/lib/wundertuete/store";
import { FILTER, KOMMT_BALD, antwortTeile, sorteMeta, teilText, type Eintrag, type Filter } from "@/lib/wundertuete/sorten";

/** Antwort mit EINEM fetten Wort */
const Antwort = ({ text }: { text: string }) => <>{antwortTeile(text).map((t, i) => (t.fett ? <strong key={i} className="font-extrabold">{t.text}</strong> : <span key={i}>{t.text}</span>))}</>;

function KarteGross({ karte, name }: { karte: Eintrag; name: string }) {
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
    <section className={`${CARD} wt-neu flex flex-col gap-4 p-5`} key={karte.id} data-wt-karte={karte.id} data-sorte={karte.sorte} data-tone={meta.tone} aria-live="polite">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-tile-label" strokeWidth={2} aria-hidden />
        <span className="flex-1 text-[12px] font-extrabold uppercase tracking-wider text-tile-label">{meta.label ?? meta.titel}</span>
        <QuickButton icon={Share} label="Teilen" onClick={() => void teilen()} />
      </div>
      <p className="text-[26px] font-extrabold leading-tight tracking-tight" lang="de" data-frage>
        {karte.vorne}
      </p>
      {karte.hinten &&
        (meta.frage ? (
          <div className="rounded-field border-2 border-dashed border-line-strong px-4 py-3" data-loesung>
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent-strong">{karte.sorte === "platt" ? "Heißt" : "Lösung"}</p>
            <p className="mt-1 text-[21px] font-semibold leading-snug">
              <Antwort text={karte.hinten} />
            </p>
          </div>
        ) : (
          <p className="text-[20px] font-semibold leading-snug" data-pointe>
            {karte.hinten}
          </p>
        ))}
    </section>
  );
}

export function WundertueteSeite() {
  const stand = useWundertuete();
  const profile = useProfile();
  const day = useToday();
  const minutes = useMinutes();
  const { forecast } = useForecast();
  const [filter, setFilter] = useState<Filter>("alles");
  const bereit = Boolean(day && minutes !== undefined && profile !== undefined);
  const lage = bereit ? lageAus({ heute: toIsoDate(day!), minuten: minutes!, haushalt: haushaltOf(profile?.householdType), forecast }) : null;
  // Ohne Karte von heute (direkt aufgerufen): wie die Kachel die Karte des Tages
  useEffect(() => {
    if (lage) wtZeigen(lage);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- einmal, sobald Tag und Profil da sind
  }, [bereit]);
  const karte = stand ? karteVon(stand, stand.aktuell?.id) : undefined;
  const sichtbar = karte && (filter === "alles" || karte.sorte === filter) ? karte : undefined;
  const waehlen = (f: Filter) => {
    setFilter(f);
    if (lage && !(karte && (f === "alles" || karte.sorte === f))) wtNoch(lage, f);
  };
  const name = helperName(profile);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Wundertüte" backHref="/" />
      <main className={PAGE_MAIN}>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="group" aria-label="Sorte">
          {FILTER.map((f) => (
            <button key={f.id} type="button" className={chipClass(filter === f.id)} aria-pressed={filter === f.id} onClick={() => waehlen(f.id)} data-filter={f.id}>
              {f.label}
            </button>
          ))}
        </div>
        {!stand || !bereit ? (
          <div className={`${CARD} h-64 animate-pulse`} />
        ) : sichtbar ? (
          <KarteGross karte={sichtbar} name={name} />
        ) : (
          <section className={`${CARD} flex min-h-40 items-center justify-center p-6 text-center`} data-kommt-bald>
            <p className="text-[20px] font-extrabold leading-snug">{KOMMT_BALD[filter]}</p>
          </section>
        )}
        <button type="button" className={`${buttonClass("primary", "lg")} w-full`} onClick={() => lage && wtNoch(lage, filter)} disabled={!lage} data-noch-eine>
          Noch eine <ChevronRight className="h-5 w-5" strokeWidth={2.5} aria-hidden />
        </button>
        <p className="text-center text-[14px] font-semibold text-muted">Nie doppelt. {name} legt immer neue nach.</p>
      </main>
    </div>
  );
}
