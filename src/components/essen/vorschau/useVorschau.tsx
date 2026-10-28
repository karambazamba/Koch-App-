"use client";

// Vorschläge erst anschauen, dann nehmen (A-038) – EIN Hook für alle
// Auswahl-Stellen: `zeigen(vorschlag, nehmen)` öffnet die Rezept-Vorschau
// (die Vorschläge dahinter bleiben stehen, nichts lädt neu, Scrollposition
// bleibt), `nehmen(vorschlag, nehmen)` ist der eine Weg für „Nehmen“ – auf
// der Karte wie in der Vorschau (das eben von Mia geschriebene Rezept kommt mit).
// `hinweis(index)`: einmal „Antippen zum Reinschauen.“ unter der ersten Karte.

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { saveRecipe, useRecipes } from "@/lib/essen/cookbook";
import { HINWEIS_TEXT, nehmenMitRezept, zeigeHinweis, type Vorschlag } from "@/lib/essen/vorschau";
import type { GeladenesRezept } from "@/lib/essen/vorschau/laden";

const RezeptVorschau = dynamic(() => import("@/components/essen/vorschau/RezeptVorschau").then((m) => m.RezeptVorschau));

/** Was „Nehmen“ an der jeweiligen Stelle tut; `rezeptId` nur, wenn Mia das Rezept eben geschrieben hat */
export type Nehmen = (rezeptId?: string, geladen?: GeladenesRezept) => void;

/** `insKochbuch: false` – die Stelle übernimmt das Rezept selbst (Mias Wochenplan-Vorschlag) */
export function useVorschau({ insKochbuch = true }: { insKochbuch?: boolean } = {}) {
  const recipes = useRecipes();
  const [anzeige, setAnzeige] = useState<{ v: Vorschlag; nehmen: Nehmen | null } | null>(null);
  const seen = useHintSeen("vorschau-antippen");
  // Einmal gezeigt = gemerkt; an dieser einen Liste (`wo`) bleibt er stehen, bis sie zugeht
  const [hinweisAn, setHinweisAn] = useState<string | null>(null);

  const nehmen = useCallback((v: Vorschlag, tun: Nehmen) => nehmenMitRezept(v, recipes ?? {}, tun, insKochbuch ? saveRecipe : null), [recipes, insKochbuch]);
  /** `tun` null = nur anschauen (z. B. ältere Vorschläge im Verlauf) */
  const zeigen = useCallback((v: Vorschlag, tun: Nehmen | null) => setAnzeige({ v, nehmen: tun }), []);
  const schliessen = useCallback(() => setAnzeige(null), []);

  const fenster = anzeige ? (
    <RezeptVorschau
      vorschlag={anzeige.v}
      onClose={schliessen}
      onNehmen={
        anzeige.nehmen
          ? () => {
              const { v, nehmen: tun } = anzeige;
              setAnzeige(null);
              if (tun) nehmen(v, tun);
            }
          : undefined
      }
    />
  ) : null;

  const hinweis = (index: number, wo = "") => {
    const hier = hinweisAn === null ? seen : hinweisAn === wo ? false : true;
    return zeigeHinweis(hier, index) ? <VorschauHinweis onShown={() => setHinweisAn((a) => a ?? wo)} /> : null;
  };
  return { zeigen, nehmen, fenster, hinweis };
}

export type Vorschau = ReturnType<typeof useVorschau>;

function VorschauHinweis({ onShown }: { onShown: () => void }) {
  const [melden] = useState(() => onShown);
  useEffect(() => {
    melden();
    markHintSeen("vorschau-antippen");
  }, [melden]);
  return (
    <p className="px-1 text-[13px] font-semibold text-muted" data-vorschau-hinweis>
      {HINWEIS_TEXT}
    </p>
  );
}
