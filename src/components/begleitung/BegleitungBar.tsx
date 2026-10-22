"use client";

// Die Leiste der Begleitung unten auf allen Seiten (im Layout über
// KitchenHelper). Eigene Datei, damit das Layout nicht die ganze Startseite
// mitlädt.

import { Mic } from "lucide-react";
import { wakeAvatar } from "@/lib/core/avatarState";
import { openHelper } from "@/lib/begleitung/open";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";

/** Lotte-Leiste unten: hell und schwebend, Avatar links, oranges Mikrofon rechts */
export function BegleitungBar({ name, bottom }: { name: string; bottom?: string }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-20 bg-linear-to-t from-background via-background/90 to-transparent px-4 pt-6 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      style={bottom ? { bottom } : undefined}
      data-begleitung-leiste
    >
      <div className="pointer-events-auto mx-auto flex h-14 max-w-lg items-center gap-2.5 rounded-bar border border-line bg-surface pl-2 pr-1.5 shadow-bar">
        <button type="button" onClick={() => (wakeAvatar(), openHelper())} aria-label={`Sag ${name}, was ansteht … (${name} öffnen)`} className="flex h-full min-w-0 flex-1 items-center gap-2.5 text-left">
          <BegleitungAvatar size={40} groesse="klein" />
          <span className="truncate text-[15px] text-muted">Sag {name}, was ansteht …</span>
        </button>
        <button
          type="button"
          onClick={() => (wakeAvatar(), openHelper("voice"))}
          aria-label={`${name} etwas sagen`}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent transition active:scale-95"
        >
          <Mic className="h-5 w-5" strokeWidth={2.25} aria-hidden />
        </button>
      </div>
    </div>
  );
}
