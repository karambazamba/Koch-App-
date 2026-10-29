"use client";

// /einkaufsliste/einrichten (A-067): die drei Schritte von „Sortieren ›“
// aus; mit `?nur=was-wo` nur „Meine Läden & was wo“ (Einkauf → „···“), der
// gleiche Bildschirm wie Schritt 2, „Speichern“ führt zurück.

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { Einrichten } from "@/components/einkauf/einrichten/Einrichten";
import { WasWo } from "@/components/einkauf/einrichten/WasWo";
import { useGoBack } from "@/lib/core/useGoBack";
import { useWeekShoppingList } from "@/lib/einkauf/useWeekShoppingList";
import { laterShops, useMeineLaeden, vorauswahl } from "@/lib/einkauf/meineLaeden";
import { ohneLaden } from "@/lib/einkauf/einsortieren";
import { einrichtungSpeichern } from "@/lib/einkauf/sorten/einrichten";
import { vorschlagPlan, type LadenPlan } from "@/lib/einkauf/sorten/plan";
import { useEinkaufWoche } from "@/lib/einkauf/seite/karten";

export function EinrichtenSeite() {
  const nurWasWo = useSearchParams().get("nur") === "was-wo";
  const data = useWeekShoppingList(useEinkaufWoche());
  const meine = useMeineLaeden();
  const goBack = useGoBack();
  if (!data || !meine) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const { settings, list } = data;
  const ohne = list.items.filter((i) => !i.hidden && !i.checked && ohneLaden(i)).map((i) => i.name);
  if (nurWasWo && meine.myShops.length) return <NurWasWo laeden={meine.myShops} start={settings.ladenPlan ?? vorschlagPlan(meine.myShops)} onFertig={() => goBack("/einkaufsliste")} />;
  return (
    <Einrichten
      vorauswahl={[...meine.myShops, ...vorauswahl(settings.itemShops)]}
      eigene={settings.shops}
      ohne={ohne}
      settings={settings}
      onSpaeter={() => {
        laterShops();
        goBack("/einkaufsliste");
      }}
      onFertig={() => goBack("/einkaufsliste")}
    />
  );
}

function NurWasWo({ laeden: start, start: plan0, onFertig }: { laeden: string[]; start: LadenPlan; onFertig: () => void }) {
  const [laeden, setLaeden] = useState(start);
  const [plan, setPlan] = useState(plan0);
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Was holst du wo?" backHref="/einkaufsliste" />
      <main className={PAGE_MAIN}>
        <WasWo laeden={laeden} plan={plan} onPlan={setPlan} onNeuerLaden={(n) => setLaeden((l) => [...l, n])} />
        <button
          type="button"
          onClick={() => {
            einrichtungSpeichern(laeden, plan);
            onFertig();
          }}
          className={`${buttonClass("primary", "lg")} w-full`}
          data-einrichten-speichern
        >
          Speichern
        </button>
      </main>
    </div>
  );
}
