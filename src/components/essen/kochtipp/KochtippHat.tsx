"use client";

// Kochmütze oben rechts in der Essen-Kachel: Tipp → Kochtipp-Chat mit Mia
// (die übrige Kachel bleibt wie sie ist). Beim ersten Erscheinen ploppt sie
// einmal auf, dazu EINMAL die dunkle Sprechblase mit Pfeil – weg bei Tipp
// irgendwo oder nach 6 Sekunden.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ChefHat } from "lucide-react";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { markHatPopped, useKochtipp } from "@/lib/essen/kochtipp/store";
import { openHelper } from "@/lib/begleitung/open";

const HINT_MS = 6000;
const BUBBLE = 224;

/** `quiet`: gerade keinen Hinweis zeigen (z. B. zur Kochzeit); `demo`: Beispiel-Tag –
 *  Mütze nur zeigen, kein Aufploppen, keine Blase (beides bleibt für den echten Tag 3) */
export function KochtippHat({ name, quiet = false, demo = false }: { name: string; quiet?: boolean; demo?: boolean }) {
  const state = useKochtipp();
  const seen = useHintSeen("kochtipp-muetze");
  const [pop] = useState(() => !demo && state !== undefined && !state.popped);
  const hint = seen === false && !quiet && !demo;
  const button = useRef<HTMLButtonElement>(null);
  // Blase unter der Mütze, aber immer ganz im Bild (die Kachel kann links oder rechts stehen)
  const [place, setPlace] = useState<{ left: number; arrow: number } | null>(null);
  useLayoutEffect(() => {
    const b = button.current;
    const tile = b?.offsetParent as HTMLElement | null;
    if (!hint || !b || !tile) return;
    const hat = b.getBoundingClientRect();
    const box = tile.getBoundingClientRect();
    const left = Math.max(16, Math.min(window.innerWidth - 16 - BUBBLE, hat.right + 4 - BUBBLE));
    setPlace({ left: left - box.left, arrow: hat.left + hat.width / 2 - left });
  }, [hint]);
  useEffect(() => {
    if (!demo && state && !state.popped) markHatPopped();
  }, [state, demo]);
  useEffect(() => {
    if (!hint) return;
    const done = () => markHintSeen("kochtipp-muetze");
    const timer = setTimeout(done, HINT_MS);
    // Tipp irgendwo blendet den Hinweis aus (nach dem Tipp, damit die Mütze selbst noch reagiert)
    const tap = () => setTimeout(done, 0);
    document.addEventListener("pointerdown", tap, { once: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", tap);
    };
  }, [hint]);
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => openHelper("kochtipp")}
        aria-label={`Kochtipp – spontan mit ${name}`}
        className={`hit absolute right-2.5 top-2.5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-accent text-on-accent shadow-float ${pop ? "hat-pop" : ""}`}
      >
        <ChefHat className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      {hint && place && (
        <div role="note" style={{ left: place.left, width: BUBBLE }} className="absolute top-14 z-20 rounded-card bg-ink px-3.5 py-2.5 text-[14px] font-semibold leading-snug text-surface shadow-float">
          <span style={{ left: place.arrow - 6 }} className="absolute -top-1.5 h-3 w-3 rotate-45 bg-ink" aria-hidden />
          {state?.unlocked || (state?.days.length ?? 0) < 3 ? "" : "Neu: "}Spontan? Tipp auf die Mütze. Ich frag dich kurz, worauf du Lust hast.
        </div>
      )}
    </>
  );
}
