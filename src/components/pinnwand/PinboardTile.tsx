"use client";

// PINNWAND auf der Startseite (Tafel 71, Variante B): ruhig und klein. Feste
// Höhe (wie die Wetter-Kachel daneben, auch breit nie höher), genau 2 Zeilen
// à 30 px: Angeheftetes, dann die neuesten Einträge der letzten 24 Std. – Text (Bild 22 px +
// eine Zeile …) bzw. Sprachnachricht (▶, kleine Tonwelle, Länge). „+N“ neben
// dem ＋, wenn es mehr gibt; kein roter Punkt, keine Zahl in Rot. Oben rechts
// ＋ = Mia schreibt mit, unten rechts Mikro = Sprachnachricht (deutlich
// getrennt). Antippen öffnet die Pinnwand-Seite an dieser Nachricht; keine
// Wisch- oder Lange-Drücken-Gesten in der Kachel.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pin, Plus } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { TileSize } from "@/lib/core/homeLayout";
import { now } from "@/lib/core/now";
import { tileEntries } from "@/lib/pinnwand";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { clearDemoTile } from "@/lib/core/demo";
import { openQuick } from "@/lib/core/schnelleingabe";
import { useBoard } from "@/components/pinnwand/useBoard";
import { PinWriteSheet } from "@/components/pinnwand/PinSheets";
import { MemoMini } from "@/components/pinnwand/MemoRow";
import { MemoMic, MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";

/** Beispiel-Tag: eine Familien-Nachricht (nicht von Mia) */
const DEMO = { author: "Lisa", text: "Bringe Brot mit 🥖" };

export function PinboardTile({ size = "S", me, demo = false }: { size?: TileSize; me: string; demo?: boolean }) {
  const board = useBoard(me);
  // Beispiel-Tag: erste eigene Nachricht → Beispiel verschwindet für immer
  const hasOwn = board.hasOwn;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("pinnwand");
  }, [demo, hasOwn]);
  const showDemo = demo && !hasOwn;
  const [writing, setWriting] = useState<string | null>(null);
  const recorder = useMemoRecorder({ me });
  const canRecord = useCanRecordMemo();
  const hintSeen = useHintSeen("pinnwand-kachel");
  const nowMs = board.items ? now().getTime() : 0;
  const { shown, more } = tileEntries(board.items ?? [], nowMs);
  const write = () => {
    markHintSeen("pinnwand-kachel");
    openQuick({ kind: "pinnwand", me, more: setWriting });
  };
  return (
    <>
      <section className={`${TILE} flex h-[156px] flex-col overflow-hidden px-3.5 pb-2.5 pt-3`} aria-label="Pinnwand" data-groesse={size}>
        <div className="flex items-center gap-2">
          <Link href="/pinnwand" className={`hit flex min-w-0 flex-1 items-center gap-1.5 ${TILE_LABEL}`} aria-label="Pinnwand öffnen">
            <Pin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span className="truncate">Pinnwand</span>
          </Link>
          {more > 0 && (
            <Link href="/pinnwand" className="hit shrink-0 text-[13px] font-bold text-tile-accent" aria-label={`${more} weitere Nachrichten ansehen`}>
              +{more}
            </Link>
          )}
          <QuickButton icon={Plus} label="Nachricht an die Pinnwand" onClick={write} />
        </div>
        <div className="mt-1.5 flex h-[64px] flex-col gap-1">
          {recorder.phase !== "idle" ? (
            <RecordingRow recorder={recorder} compact />
          ) : showDemo ? (
            <Link href="/pinnwand" data-zeile className="flex h-[30px] items-center gap-2" aria-label={`Beispiel: ${DEMO.author}: ${DEMO.text}`}>
              <PersonAvatar name={DEMO.author} size={22} soft />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{DEMO.text}</span>
            </Link>
          ) : shown.length ? (
            shown.map((item) =>
              item.kind === "memo" ? (
                <div key={item.id} className="relative flex h-[30px] items-center gap-2">
                  <MemoMini memo={item.memo} me={me} household={board.household} />
                  <Link href={`/pinnwand?n=${item.id}`} data-zeile className="absolute inset-y-0 left-[60px] right-0" aria-label={`Sprachnachricht von ${item.memo.data.author} – auf der Pinnwand öffnen`} />
                </div>
              ) : (
                <Link key={item.id} href={`/pinnwand?n=${item.id}`} data-zeile className="flex h-[30px] items-center gap-2" aria-label={`${item.pin.data.author}: ${item.pin.data.text} – auf der Pinnwand öffnen`}>
                  <PersonAvatar name={item.pin.data.author} size={22} soft />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{item.pin.data.text}</span>
                  {item.pinned && <Pin className="h-[13px] w-[13px] shrink-0 text-tile-accent" strokeWidth={2.25} aria-label="angeheftet" />}
                </Link>
              ),
            )
          ) : (
            <button type="button" onClick={write} className="hit text-left text-[14px] text-muted">
              Hinterlasst euch hier Nachrichten
            </button>
          )}
        </div>
        <MemoNote text={recorder.note} onResend={recorder.unsent ? recorder.resend : undefined} />
        <div className="mt-auto flex items-end justify-between gap-2">
          {hintSeen === false && !recorder.note ? <span className="min-w-0 truncate text-[11px] font-semibold text-muted">＋ = schreiben · Mikro = deine Stimme</span> : <span />}
          {canRecord && <MemoMic recorder={recorder} size={34} />}
        </div>
      </section>
      {writing !== null && <PinWriteSheet me={me} initialText={writing} onClose={() => setWriting(null)} />}
    </>
  );
}
