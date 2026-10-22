"use client";

// Der runde Mia-Knopf unten rechts – auf allen Seiten gleich (statt der
// früheren Schreib-Leiste). Tippen holt die Begleitung in die Mitte (sie hört
// gleich zu, wenn das Mikro erlaubt ist); lange drücken = sofort sprechen,
// Loslassen = absenden. Beim ersten Mal einmal der Hinweis „Tippen & sprechen“.
// Eigene Datei, damit das Layout nicht die ganze Startseite mitlädt.

import { useEffect, useRef } from "react";
import { wakeAvatar } from "@/lib/core/avatarState";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { openHelper, releaseHelperVoice } from "@/lib/begleitung/open";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";

const LONG_MS = 450;
const HINT_MS = 7000;

export function MiaButton({ name }: { name: string }) {
  const hint = useHintSeen("mia-knopf") === false;
  const press = useRef<{ timer: ReturnType<typeof setTimeout>; long: boolean } | null>(null);
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
    <div className="pointer-events-none fixed bottom-0 right-0 z-20 pb-[max(1rem,env(safe-area-inset-bottom))] pr-4" data-begleitung-leiste>
      <div className="pointer-events-auto relative flex items-center">
        {hint && (
          <span role="note" className="mia-einblenden absolute right-full mr-3 whitespace-nowrap rounded-full bg-surface px-3.5 py-2 text-[14px] font-bold shadow-float">
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
          className="mia-knopf hit flex h-[72px] w-[72px] items-center justify-center rounded-full select-none"
          data-mia-knopf
        >
          <BegleitungAvatar size={72} groesse="gross" />
        </button>
      </div>
    </div>
  );
}
