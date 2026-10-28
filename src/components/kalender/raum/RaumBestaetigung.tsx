"use client";

// Raum direkt in Mias Ergebnis-Karte ändern (A-034, A-037 Tafel 126): die
// kleine Zeile „Termin · Familie ⌄“ antippen klappt dieselben Raum-Chips auf
// wie überall, ein Tipp ändert den Raum (mit „Rückgängig“, Mia lernt das
// Stichwort). Beim allerersten Vorwählen steht darunter einmal „Hab Familie
// gewählt. Tippen zum Ändern.“ Darf man den Raum nicht ändern (Abo, fremde
// Familien-Aufgabe), steht nur der Text da.

import { useEffect, useState } from "react";
import { ChevronDown, Lock } from "lucide-react";
import type { Room } from "@/lib/core/entries";
import { raumLabel, sichtRaum } from "@/lib/core/haushalt";
import { useHaushalt } from "@/lib/einstellungen/useHaushalt";
import { loadEntries } from "@/lib/kalender/store";
import { raumHinweisGesehen, raumHinweisOffen } from "@/lib/kalender/raum/gedaechtnis";
import { vorgewaehltText } from "@/lib/kalender/raum/wahl";
import { RaumChips } from "@/components/ui/RaumChips";
import { raumAenderbar, raumAendern } from "@/components/kalender/raum/raumAendern";

/** Schriftfarbe des Raums in der kleinen Zeile */
const RAUM_TEXT: Record<Room, string> = { familie: "text-accent-strong", ich: "text-ich", arbeit: "text-work" };

const ZEILE = "text-[13px] font-semibold leading-snug text-muted";

/** „Termin · Familie ⌄“ – `art` steht vor dem Punkt; `aus` = nicht mehr änderbar (z. B. zurückgenommen) */
export function RaumZeile({ eintrag, art, aus = false }: { eintrag: { id: string; raum: Room }; art: string; aus?: boolean }) {
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
  const sicht = sichtRaum(raum, haushalt);
  const name = raumLabel(sicht, haushalt);
  if (!aenderbar || aus) return <span className={ZEILE}>{`${art} · ${name}`}</span>;
  const waehlen = (r: Room) => {
    const e = finde();
    const neu = e && r !== sicht ? raumAendern(e, r, haushalt) : null;
    if (neu) setRaum(neu);
    setAuf(false);
  };
  return (
    <div className="relative z-10 flex flex-col items-start gap-1" data-raum-bestaetigung>
      {auf ? (
        <RaumChips value={sicht} haushalt={haushalt} onChange={waehlen} />
      ) : (
        <button type="button" onClick={() => setAuf(true)} aria-label={`Wer sieht es: ${name} – ändern`} className={`hit inline-flex items-center gap-1 ${ZEILE} active:opacity-70`}>
          <span>{`${art} ·`}</span>
          <span className={`inline-flex items-center gap-0.5 font-bold ${RAUM_TEXT[sicht]}`}>
            {sicht === "ich" && <Lock className="h-3 w-3" strokeWidth={2.5} aria-hidden />}
            {name}
          </span>
          <ChevronDown className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {hinweis && !auf && <span className="text-[13px] text-muted">{vorgewaehltText(raum, haushalt)}</span>}
    </div>
  );
}
