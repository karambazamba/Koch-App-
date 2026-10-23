"use client";

// PINNWAND (Rosé): Zettel am Kühlschrank. Kopf "PINNWAND" (+ Punkt bei
// Ungelesenem/Ungehörtem), rosé Mikro = Sprachnachricht (gedrückt halten),
// "+" = neue Nachricht (bis 140 Zeichen, "Anheften"). S/M/L = 1/2/4 neueste
// Einträge – Text (Kreis mit Anfangsbuchstabe, Text, "Lisa · 7:48") und
// Sprachnachrichten (Abspielen, Tonwelle, Dauer) gemischt. Antippen → 👍 ❤️,
// anheften (nur Text), Gehört von / Löschen (nur eigene, mit Rückgängig).

import Link from "next/link";
import { useEffect, useState } from "react";
import { PinSheet, PinWriteSheet, pinMetaLine } from "@/components/pinnwand/PinSheets";
import { Pin, Plus } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import type { TileSize } from "@/lib/core/homeLayout";
import { REACTIONS, changePins, markPinsRead } from "@/lib/pinnwand";
import { useBoard } from "@/components/pinnwand/useBoard";
import { MemoItem, MemoSheet } from "@/components/pinnwand/MemoRow";
import { MemoMic, MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { clearDemoTile } from "@/lib/core/demo";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { askMiaFirst } from "@/lib/begleitung/open";


const meta = pinMetaLine;

export function PinboardTile({ size = "M", me, demo = false, helper = "" }: { size?: TileSize; me: string; demo?: boolean; helper?: string }) {
  const board = useBoard(me);
  // Beispiel-Tag: erste eigene Nachricht → Beispiel verschwindet für immer
  const hasOwn = board.hasOwn;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("pinnwand");
  }, [demo, hasOwn]);
  const showDemo = demo && !hasOwn;
  const [writing, setWriting] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const recorder = useMemoRecorder({ me });
  const canRecord = useCanRecordMemo();
  const list = board.items ?? [];
  const shown = list.slice(0, size === "S" ? 1 : size === "L" ? 4 : 2);
  const unread = board.unread;
  const selected = list.find((m) => m.id === open) ?? null;
  return (
    <>
      <section className={`${TILE} flex min-h-[92px] flex-col p-3.5`} aria-label="Pinnwand">
        {/* Kopf: Titel links, Plus oben rechts (wie jede Kachel); das Mikro steht unten
            rechts – getrennt, damit sich die Tippflächen nie überlappen */}
        <div className="-mt-0.5 flex items-center gap-4">
          <Link href="/pinnwand" className={`hit flex min-w-0 flex-1 items-center gap-1.5 ${TILE_LABEL}`} aria-label="Pinnwand öffnen">
            <Pin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">Pinnwand</span>
            {(unread || showDemo) && <span className="h-2 w-2 shrink-0 rounded-full bg-tile-accent" aria-label="Neue Nachricht" />}
          </Link>
          <QuickButton icon={Plus} label="Neue Nachricht an die Pinnwand" onClick={() => askMiaFirst("pinnwand", () => setWriting(true))} />
        </div>
        {recorder.phase !== "idle" ? (
          <div className="mt-2">
            <RecordingRow recorder={recorder} compact={size === "S"} />
          </div>
        ) : showDemo ? (
          <button type="button" onClick={() => setWriting(true)} className="mt-1.5 flex w-full items-start gap-2.5 text-left" aria-label="Beispiel-Nachricht – eigene schreiben">
            <BegleitungAvatar size={28} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={`${size === "S" ? "line-clamp-2" : "line-clamp-3"} text-[14px] font-semibold leading-snug`}>Willkommen! Hier hinterlasst ihr euch kleine Nachrichten.</span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                {helper} · gerade eben
              </span>
            </span>
          </button>
        ) : shown.length ? (
          <ul className="mt-2 flex flex-col gap-2">
            {shown.map((item) => {
              if (item.kind === "memo") {
                return (
                  <li key={item.id}>
                    <MemoItem memo={item.memo} me={me} household={board.household} soft onOpen={() => setOpen(item.id)} />
                  </li>
                );
              }
              const m = item.pin;
              const reacted = REACTIONS.filter((r) => (m.data.reactions[r]?.length ?? 0) > 0);
              return (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(m.id);
                      changePins((all) => markPinsRead(all, me));
                    }}
                    className="hit flex w-full items-start gap-2.5 text-left"
                    aria-label={`${m.data.text} – ${meta(m, me)}`}
                  >
                    <PersonAvatar name={m.data.author} soft />
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
        <MemoNote text={recorder.note} onResend={recorder.unsent ? recorder.resend : undefined} />
        {canRecord && (
          <div className="mt-auto flex justify-end pt-1.5">
            <MemoMic recorder={recorder} />
          </div>
        )}
      </section>
      {writing && <PinWriteSheet me={me} onClose={() => setWriting(false)} />}
      {selected?.kind === "pin" && <PinSheet message={selected.pin} me={me} onClose={() => setOpen(null)} />}
      {selected?.kind === "memo" && <MemoSheet memo={selected.memo} me={me} household={board.household} onClose={() => setOpen(null)} />}
    </>
  );
}
