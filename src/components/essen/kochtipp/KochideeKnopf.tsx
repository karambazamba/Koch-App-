"use client";

// Kochidee-Knopf oben links in der Essen-Kachel (Tafel 64 C, seit Tafel 122 links): Gericht für
// immer dieselbe weiße Pille „⇄ Was anderes?“ (Tafel 134, kein oranger
// Kreis): heute geplant → Alternativen dazu, sonst eine Kochidee. Beim ersten Mal nach dem Freischalten wippt
// er einmal sanft, dazu EINMAL die kleine Blase „Neu: Kochidee“ (weg bei
// Tipp irgendwo oder nach 6 s). Tipp → Kochidee auf der Bühne.

import { useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { KachelPille } from "@/components/ui/KachelPille";
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
      <KachelPille
        label={b.label}
        icon={Shuffle}
        aria={b.aria}
        onClick={() => openHelper("kochtipp", undefined, planned ? [planned] : undefined)}
        className={wobble ? "kochidee-wippen" : ""}
      />
      {hint && (
        <span role="note" className="mia-text absolute left-2 top-[52px] z-20 whitespace-nowrap rounded-full bg-surface px-3 py-1.5 text-[13px] font-bold text-accent-strong shadow-float">
          Neu: Kochidee
        </span>
      )}
    </>
  );
}
