"use client";

// /vorrat/check = Kurz-Check „Im Haus“ (Tafel 102, Punkt 3): alle Sachen als
// Kacheln wie auf „Im Haus“, Antippen = weg (blass, durchgestrichen), nochmal
// = doch noch da. Unten am Inhaltsende „Fertig · 3 weg“ (aufgebraucht, mit
// Rückgängig) und „Heute nicht“. Beides legt die Woche weg. Logik rein in
// `lib/vorrat/kuehlcheck.ts`.

import { useState } from "react";
import { Refrigerator } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { CARD, PAGE_MAIN, buttonClass } from "@/components/ui/styles";
import { ItemTile, TILE_GRID } from "@/components/einkauf/kacheln/ItemTile";
import { showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { useGoBack } from "@/lib/core/useGoBack";
import { sectionFor } from "@/lib/einkauf/sections";
import { toIsoDate, useToday } from "@/lib/essen/weekPlan";
import { checkSachen, fertigText, kuehlCheckErledigt, sonntagVon, wegRaeumen, wegUmschalten } from "@/lib/vorrat/kuehlcheck";
import { usePantryAll } from "@/lib/vorrat/pantry";

export function KuehlCheck() {
  const all = usePantryAll();
  const today = useToday();
  const goBack = useGoBack();
  const [weg, setWeg] = useState<string[]>([]);

  if (all === undefined || !today) return <div className={`${CARD} m-4 h-64 animate-pulse`} />;
  const todayIso = toIsoDate(today);
  const sachen = checkSachen(all, todayIso);
  const zaehlt = weg.filter((id) => sachen.some((p) => p.id === id));

  const fertig = () => {
    kuehlCheckErledigt(sonntagVon(todayIso));
    const { names, undo } = wegRaeumen(zaehlt, todayIso);
    if (names.length) {
      const text = `Raus: ${names.join(", ")}`;
      showToast({ text, undo: pushUndo(text, undo), undoneText: "Wieder da", seconds: 4, small: true });
    }
    goBack("/vorrat");
  };
  const heuteNicht = () => {
    kuehlCheckErledigt(sonntagVon(todayIso));
    goBack("/vorrat");
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
      <PageHeader title="Kurz-Check" backHref="/vorrat" />
      <main className={PAGE_MAIN}>
        {sachen.length ? (
          <>
            <p className="px-1 text-sm text-muted">Tipp an, was weg ist. Der Rest bleibt.</p>
            <div className={TILE_GRID.normal} data-kuehlcheck>
              {sachen.map((item) => {
                const isWeg = zaehlt.includes(item.id);
                return (
                  <ItemTile
                    key={item.id}
                    name={item.name}
                    section={sectionFor(item.name)}
                    struck={isWeg}
                    label={isWeg ? `${item.name} doch noch da` : `${item.name} ist weg`}
                    onTap={() => setWeg((w) => wegUmschalten(w, item.id))}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <section className={`${CARD} flex flex-col items-center gap-2 px-5 py-8 text-center`}>
            <Refrigerator className="h-8 w-8 text-accent" strokeWidth={2} aria-hidden />
            <p className="text-[17px] font-bold">Noch ruhig hier.</p>
            <p className="text-sm text-muted">Was du einkaufst, landet hier von selbst.</p>
          </section>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <button type="button" onClick={fertig} className={`${buttonClass("primary", "lg")} w-full`}>
            {fertigText(zaehlt.length)}
          </button>
          <button type="button" onClick={heuteNicht} className={`${buttonClass("ghost", "md")} w-full`}>
            Heute nicht
          </button>
        </div>
      </main>
    </div>
  );
}
