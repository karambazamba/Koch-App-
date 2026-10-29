"use client";

// Ergebnis-Karte „Tomaten“ (A-041, Tafel 128, Bild 3): klein darunter der
// Laden mit Farbpunkt, „Rewe · wie immer ⌄“, wenn Mia ihn selbst ausgesucht
// hat. Antippen = andere Läden als Chips; die Korrektur gilt sofort und wird
// gemerkt (nächstes Mal gleich dort). Hat Mia zum ersten Mal selbst
// gewählt, steht einmal darunter „Hab Rewe genommen, wie letztes Mal.“

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { chipClass } from "@/components/ui/styles";
import { ladenFarbe } from "@/components/einkauf/seite/LadenKarten";
import { useShoppingSettings } from "@/lib/einkauf/listStore";
import { useMeineLaeden } from "@/lib/einkauf/meineLaeden";
import { ladenHerkunft, ladenKorrigieren } from "@/lib/einkauf/shopRules";
import { kartenLaden, kartenLadenText, selbstGewaehltText } from "@/lib/einkauf/merken/karte";
import { hintSeen, markHintSeen } from "@/lib/core/hints";

const ZEILE = "text-[13px] font-semibold leading-snug text-muted";
const lower = (s: string) => s.trim().toLowerCase();
/** Bei welcher Sache der Hinweis „Hab Rewe genommen …“ in dieser Sitzung steht (höchstens eine) */
const HINWEIS_BEI = new Set<string>();

export function ErgebnisLaden({ sache, gesagt, art, aus = false }: { sache: string; gesagt: string | null; art: string; aus?: boolean }) {
  const settings = useShoppingSettings();
  const meine = useMeineLaeden();
  const [auf, setAuf] = useState(false);
  const laden = settings ? kartenLaden(ladenHerkunft(sache, settings), gesagt) : null;
  // Einmal: Mia hat zum ersten Mal selbst einen Laden ausgesucht (gemerkt beim ersten Zeigen;
  // dieselbe Karte behält ihn, auch wenn sie neu aufgebaut wird oder die Einstellungen später laden)
  const hinweis = Boolean(laden?.wieImmer) && (HINWEIS_BEI.has(lower(sache)) || (!HINWEIS_BEI.size && !hintSeen("einkauf-laden-gewaehlt")));
  useEffect(() => {
    if (!hinweis) return;
    HINWEIS_BEI.add(lower(sache));
    markHintSeen("einkauf-laden-gewaehlt");
  }, [hinweis, sache]);
  const laeden = meine?.myShops ?? [];
  if (!laden && !laeden.length) return <span className={ZEILE}>{`${art} · für alle`}</span>;
  if (aus) return <span className={ZEILE}>{laden ? kartenLadenText(laden) : `${art} · für alle`}</span>;
  const andere = [...laeden, ...(laden && !laeden.some((x) => lower(x) === lower(laden.shop)) ? [laden.shop] : [])];
  const text = laden ? kartenLadenText(laden) : "Noch ohne Laden";
  return (
    <div className="relative z-10 flex flex-col items-start gap-1" data-ergebnis-laden={laden?.shop ?? ""}>
      {auf ? (
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Anderer Laden">
          {andere.map((shop) => {
            const jetzt = Boolean(laden && lower(shop) === lower(laden.shop));
            return (
            <button
              key={shop}
              type="button"
              onClick={() => {
                if (!jetzt) ladenKorrigieren(sache, shop);
                setAuf(false);
              }}
              className={`${chipClass(jetzt)} min-h-9 py-1 text-[14px]`}
            >
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ladenFarbe(shop).voll }} aria-hidden />
              {shop}
            </button>
            );
          })}
        </div>
      ) : (
        <button type="button" onClick={() => setAuf(true)} aria-label={`Laden: ${text}, ändern`} className={`hit inline-flex items-center gap-1 ${ZEILE} active:opacity-70`} data-wie-immer={laden?.wieImmer ? "" : undefined}>
          {laden && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ladenFarbe(laden.shop).voll }} aria-hidden />}
          <span>{text}</span>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {hinweis && laden && !auf && (
        <span className="text-[13px] text-muted" data-laden-gewaehlt-hinweis>
          {selbstGewaehltText(laden.shop)}
        </span>
      )}
    </div>
  );
}
