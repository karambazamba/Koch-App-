"use client";

// Der runde Mia-Knopf unten rechts – auf allen Seiten gleich (statt der
// früheren Schreib-Leiste). Tippen holt die Begleitung in die Mitte (sie hört
// gleich zu, wenn das Mikro erlaubt ist); lange drücken = sofort sprechen,
// Loslassen = absenden. Beim ersten Mal einmal der Hinweis „Tippen & sprechen“.
// Beim Runterscrollen gleitet er weg und kommt beim Hochscrollen bzw. nach
// kurzer Ruhe zurück (nur transform/opacity).
// Eigene Datei, damit das Layout nicht die ganze Startseite mitlädt.

import { useEffect, useRef, useState } from "react";
import { wakeAvatar } from "@/lib/core/avatarState";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { openHelper, releaseHelperVoice } from "@/lib/begleitung/open";
import { knopfAway, REST_MS } from "@/lib/begleitung/knopfScroll";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { useMiaLook, useMiaMoment } from "@/components/begleitung/useMiaLook";
import { useKnopfLinks } from "@/lib/mia/knopf";

const LONG_MS = 450;
const HINT_MS = 7000;

/** Weg beim Runterscrollen, zurück beim Hochscrollen oder nach REST_MS Ruhe */
function useScrollAway(): boolean {
  const [away, setAway] = useState(false);
  useEffect(() => {
    let last = window.scrollY;
    let rest: ReturnType<typeof setTimeout> | undefined;
    const onScroll = () => {
      const y = window.scrollY;
      setAway((a) => knopfAway(a, last, y));
      last = y;
      clearTimeout(rest);
      rest = setTimeout(() => setAway(false), REST_MS);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(rest);
    };
  }, []);
  return away;
}

export function MiaButton({ name }: { name: string }) {
  const hint = useHintSeen("mia-knopf") === false;
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; long: boolean } | null>(null);
  const away = useScrollAway();
  const look = useMiaLook();
  const moment = useMiaMoment();
  const links = useKnopfLinks();
  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => markHintSeen("mia-knopf"), HINT_MS);
    return () => clearTimeout(t);
  }, [hint]);

  const down = () => {
    const timer = setTimeout(() => {
      if (!press.current) return;
      press.current.long = true;
      wakeAvatar();
      openHelper("voice");
    }, LONG_MS);
    press.current = { timer, long: false };
  };
  const up = () => {
    const p = press.current;
    press.current = null;
    if (!p) return;
    clearTimeout(p.timer);
    // Lange gedrückt: Loslassen schickt das Gesagte ab
    if (p.long) releaseHelperVoice();
  };

  return (
    <div className={`pointer-events-none fixed bottom-0 z-20 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] ${links ? "left-0 pl-4" : "right-0 pr-4"}`} data-begleitung-leiste data-links={links || undefined}>
      <div className={`mia-knopf-gleiten relative flex items-center ${away ? "pointer-events-none" : "pointer-events-auto"}`} data-weg={away || undefined}>
        {hint && (
          <span role="note" className={`mia-einblenden absolute ${links ? "left-full ml-3" : "right-full mr-3"} whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[14px] font-bold shadow-float`}>
            Tippen &amp; sprechen
          </span>
        )}
        <button
          type="button"
          onPointerDown={down}
          onPointerUp={up}
          onPointerLeave={() => press.current && !press.current.long && (clearTimeout(press.current.timer), (press.current = null))}
          onContextMenu={(e) => e.preventDefault()}
          onClick={() => {
            markHintSeen("mia-knopf");
            if (press.current?.long) return;
            wakeAvatar();
            openHelper();
          }}
          aria-label={`Sag ${name}, was ansteht … (${name} holen)`}
          className="mia-knopf flex h-[72px] w-[72px] items-center justify-center rounded-full select-none"
          data-mia-knopf
          data-moment={moment ?? undefined}
        >
          {moment === "blatt" && <span className="mia-blatt" aria-hidden />}
          <BegleitungAvatar size={72} groesse="gross" zubehoer={look.zubehoer} stimmung={look.verschlafen ? "verschlafen" : look.ruhig ? "ruhig" : undefined} />
        </button>
      </div>
    </div>
  );
}
