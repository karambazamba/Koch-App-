"use client";

// PINNWAND (weiß): Zettel am Kühlschrank. Kopf "PINNWAND" (+ oranger Punkt
// bei Ungelesenem), "+" = neue Nachricht (bis 140 Zeichen, Mikrofon,
// "Anheften"). S/M/L = 1/2/4 neueste Nachrichten: Kreis mit Anfangsbuchstabe
// (feste Farbe je Person), Text, klein "Lisa · 7:48". Antippen → 👍 ❤️,
// dauerhaft anheften, Löschen (nur eigene, mit Rückgängig).

import Link from "next/link";
import { useEffect, useState } from "react";
import { PinSheet, PinWriteSheet, pinMetaLine } from "@/components/pinnwand/PinSheets";
import { Pin, Plus } from "lucide-react";
import { CARD } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import type { TileSize } from "@/lib/core/homeLayout";
import { now } from "@/lib/core/now";
import { REACTIONS, changePins, hasUnread, markPinsRead, usePins, visiblePins } from "@/lib/pinnwand";
import { DEMO_OUTLINE, DemoBadge } from "./DemoBits";
import { LotteAvatar } from "@/components/LotteAvatar";
import { clearDemoTile } from "@/lib/core/demo";
import { PersonAvatar } from "@/components/ui/PersonAvatar";


const meta = pinMetaLine;

export function PinboardTile({ size = "M", me, demo = false, helper = "" }: { size?: TileSize; me: string; demo?: boolean; helper?: string }) {
  const pins = usePins();
  // Beispiel-Tag: erste eigene Nachricht → Beispiel verschwindet für immer
  const hasOwn = Boolean(pins?.length);
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("pinnwand");
  }, [demo, hasOwn]);
  const showDemo = demo && !hasOwn;
  const [writing, setWriting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const nowMs = now().getTime();
  const list = pins ? visiblePins(pins, nowMs) : [];
  const shown = list.slice(0, size === "S" ? 1 : size === "L" ? 4 : 2);
  const unread = pins ? hasUnread(pins, me, nowMs) : false;
  const selected = list.find((m) => m.id === open) ?? null;
  return (
    <>
      <section className={`${CARD} relative flex min-h-[92px] flex-col p-3.5 ${showDemo ? DEMO_OUTLINE : ""}`} aria-label="Pinnwand">
        <Link href="/pinnwand" className="flex items-center gap-1.5 pr-8 text-[10px] font-extrabold uppercase tracking-wider text-muted" aria-label="Pinnwand öffnen">
          <Pin className="h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2} aria-hidden />
          Pinnwand
          {(unread || showDemo) && <span className="h-2 w-2 rounded-full bg-accent" aria-label="Neue Nachricht" />}
        </Link>
        <span className="absolute right-3.5 top-3">
          <QuickButton icon={Plus} label="Neue Nachricht an die Pinnwand" onClick={() => setWriting(true)} />
        </span>
        {showDemo ? (
          <button type="button" onClick={() => setWriting(true)} className="mt-1.5 flex w-full items-start gap-2.5 text-left" aria-label="Beispiel-Nachricht – eigene schreiben">
            <LotteAvatar size={28} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="line-clamp-3 text-[14px] font-semibold leading-snug">Willkommen! Hier hinterlasst ihr euch kleine Nachrichten.</span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {helper} · gerade eben <DemoBadge />
              </span>
            </span>
          </button>
        ) : shown.length ? (
          <ul className="mt-1.5 flex flex-col gap-2">
            {shown.map((m) => {
              const reacted = REACTIONS.filter((r) => (m.data.reactions[r]?.length ?? 0) > 0);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(m.id);
                      changePins((all) => markPinsRead(all, me));
                    }}
                    className="flex w-full items-start gap-2.5 text-left"
                    aria-label={`${m.data.text} – ${meta(m, me)}`}
                  >
                    <PersonAvatar name={m.data.author} />
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="line-clamp-2 text-[14.5px] font-semibold leading-snug">{m.data.text}</span>
                      <span className="text-xs text-muted">
                        {meta(m, me)}
                        {m.data.pinned ? " · angeheftet" : ""}
                      </span>
                    </span>
                    {reacted.length > 0 && <span className="shrink-0 text-sm">{reacted.join("")}</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <button type="button" onClick={() => setWriting(true)} className="hit mt-1 text-left text-[14px] text-muted">
            Kurze Nachricht an alle – z. B. „Bin um 20 Uhr da“
          </button>
        )}
      </section>
      {writing && <PinWriteSheet me={me} onClose={() => setWriting(false)} />}
      {selected && <PinSheet message={selected} me={me} onClose={() => setOpen(null)} />}
    </>
  );
}
