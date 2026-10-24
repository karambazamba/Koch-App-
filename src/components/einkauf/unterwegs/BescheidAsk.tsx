"use client";

// Einkauf Teil 6: die eine Frage beim ersten Einkaufsmodus mit Konto –
// „Familie Bescheid sagen?“ [Nein] [Ja, immer]. Gemerkt, in Einstellungen →
// Mitteilungen änderbar. Wegtippen zählt wie „Nein“.

import { Megaphone } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { setBescheidAnswer } from "@/lib/einkauf/unterwegs/unterwegs";

export function BescheidAsk({ shop, onClose }: { shop: string; onClose: (yes: boolean) => void }) {
  const answer = (yes: boolean) => {
    setBescheidAnswer(yes ? "ja" : "nein");
    onClose(yes);
  };
  return (
    <Sheet title="Familie Bescheid sagen?" onClose={() => answer(false)}>
      <div className="flex flex-col items-center gap-4 pb-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Megaphone className="h-8 w-8" strokeWidth={2.25} aria-hidden />
        </span>
        <p className="text-base leading-snug">Dann wissen die anderen, dass du bei {shop} bist, und können noch was draufsetzen.</p>
        <div className="flex w-full flex-col gap-2">
          <button type="button" onClick={() => answer(true)} className={buttonClass("primary", "md")}>
            Ja, immer
          </button>
          <button type="button" onClick={() => answer(false)} className={buttonClass("ghost", "md")}>
            Nein
          </button>
        </div>
      </div>
    </Sheet>
  );
}
