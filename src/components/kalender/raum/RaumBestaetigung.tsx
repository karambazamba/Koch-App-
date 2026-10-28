"use client";

// Unter Mias Bestätigung („Steht drin.“) ein kleiner Chip „Familie ⌄“ (A-034):
// antippen klappt dieselben Raum-Chips auf wie überall, ein Tipp ändert den
// Raum (mit „Rückgängig“, Mia lernt das Stichwort). Beim allerersten
// Vorwählen steht darunter einmal „Hab Familie gewählt. Tippen zum Ändern.“

import { useEffect, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import type { Room } from "@/lib/core/entries";
import { raumLabel, sichtRaum } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { loadEntries } from "@/lib/kalender/store";
import { raumHinweisGesehen, raumHinweisOffen } from "@/lib/kalender/raum/gedaechtnis";
import { vorgewaehltText } from "@/lib/kalender/raum/wahl";
import { RAUM_AKTIV, RaumChips } from "@/components/ui/RaumChips";
import { raumAenderbar, raumAendern } from "@/components/kalender/raum/raumAendern";

export function RaumBestaetigung({ eintrag }: { eintrag: { id: string; raum: Room } }) {
  const haushalt = useHaushalt();
  const [raum, setRaum] = useState(eintrag.raum);
  const [auf, setAuf] = useState(false);
  const [hinweis] = useState(() => raumHinweisOffen());
  useEffect(() => {
    if (hinweis) raumHinweisGesehen();
  }, [hinweis]);
  const finde = () => loadEntries().find((e) => e.id === eintrag.id) ?? null;
  const [aenderbar] = useState(() => {
    const e = finde();
    return e ? raumAenderbar(e) : false;
  });
  if (!aenderbar) return null;
  const sicht = sichtRaum(raum, haushalt);
  const waehlen = (r: Room) => {
    const e = finde();
    const neu = e && r !== sicht ? raumAendern(e, r, haushalt) : null;
    if (neu) setRaum(neu);
    setAuf(false);
  };
  return (
    <div className="flex flex-col gap-1 pl-11" data-raum-bestaetigung>
      {auf ? (
        <RaumChips value={sicht} haushalt={haushalt} onChange={waehlen} />
      ) : (
        <button type="button" onClick={() => setAuf(true)} aria-label={`Wer sieht es: ${raumLabel(sicht, haushalt)} – ändern`} className={`hit inline-flex h-8 items-center gap-1 self-start rounded-full border px-2.5 text-[14px] font-bold active:scale-95 ${RAUM_AKTIV[sicht]}`}>
          {sicht === "ich" && <Lock className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />}
          {raumLabel(sicht, haushalt)}
          <ChevronDown className="h-4 w-4" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {hinweis && !auf && <p className="px-1 text-[13px] text-muted">{vorgewaehltText(raum, haushalt)}</p>}
    </div>
  );
}
