"use client";

// Kochidee-Knopf oben rechts in der Essen-Kachel (Tafel 64 C): Gericht für
// heute geplant → weiße Pille „⇄ Was anderes?“, noch frei → rundes orangenes
// Abzeichen mit Mütze und „Idee“. Beim ersten Mal nach dem Freischalten wippt
// er einmal sanft, dazu EINMAL die kleine Blase „Neu: Kochidee“ (weg bei
// Tipp irgendwo oder nach 6 s). Tipp → Kochidee auf der Bühne.

import { useEffect, useState } from "react";
import { ChefHat, Shuffle } from "lucide-react";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { markHatPopped, useKochtipp } from "@/lib/essen/kochtipp/store";
import { kochideeButton } from "@/lib/essen/kochtipp/idee";
import { openHelper } from "@/lib/begleitung/open";

const HINT_MS = 6000;

/** `planned`: heutiges Gericht (oder null); `quiet`: gerade kein Hinweis; `demo`: Beispiel-Tag – kein Wippen, keine Blase */
export function KochideeKnopf({ name, planned, quiet = false, demo = false }: { name: string; planned: string | null; quiet?: boolean; demo?: boolean }) {
  const state = useKochtipp();
  const seen = useHintSeen("kochtipp-muetze");
  const [wobble] = useState(() => !demo && state !== undefined && !state.popped);
  const hint = seen === false && !quiet && !demo;
  const b = kochideeButton(planned, name);
  useEffect(() => {
    if (!demo && state && !state.popped) markHatPopped();
  }, [state, demo]);
  useEffect(() => {
    if (!hint) return;
    const done = () => markHintSeen("kochtipp-muetze");
    const timer = setTimeout(done, HINT_MS);
    const tap = () => setTimeout(done, 0);
    document.addEventListener("pointerdown", tap, { once: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerdown", tap);
    };
  }, [hint]);
  return (
    <>
      {b.kind === "anders" ? (
        <button
          type="button"
          onClick={() => openHelper("kochtipp", undefined, planned ? [planned] : undefined)}
          aria-label={b.aria}
          className={`hit absolute right-2.5 top-2.5 z-10 inline-flex h-[30px] items-center gap-1.5 rounded-full bg-surface px-3 text-[12.5px] font-extrabold text-accent-strong shadow-float ${wobble ? "kochidee-wippen" : ""}`}
        >
          <Shuffle className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
          {b.label}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => openHelper("kochtipp")}
          aria-label={b.aria}
          className={`hit absolute right-2 top-2 z-10 flex h-[47px] w-[47px] flex-col items-center justify-center rounded-full border-[2.5px] border-surface bg-accent text-on-accent shadow-float ${wobble ? "kochidee-wippen" : ""}`}
        >
          <ChefHat className="h-4 w-4" strokeWidth={2.25} aria-hidden />
          <span className="-mt-0.5 text-[10.5px] font-extrabold leading-none">{b.label}</span>
        </button>
      )}
      {hint && (
        <span role="note" className="mia-text absolute right-2 top-[52px] z-20 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-[13px] font-bold text-accent-strong shadow-float">
          Neu: Kochidee
        </span>
      )}
    </>
  );
}
