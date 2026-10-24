"use client";

// PINNWAND auf der Startseite (Tafel 71, Variante B): ruhig und klein. Größe =
// Menge (Launch 1.0): S 1, M 2, L 4 Zeilen à 30 px (S mit fester Höhe wie die
// Wetter-Kachel daneben): Angeheftetes, dann die neuesten Einträge der letzten 24 Std. – Text (Bild 22 px +
// eine Zeile …) bzw. Sprachnachricht (▶, kleine Tonwelle, Länge). „+N“ neben
// dem ＋, wenn es mehr gibt; kein roter Punkt, keine Zahl in Rot. Oben rechts
// ＋ = Schnelleingabe (beim ersten Mal kleines Schild „schreiben“ links neben
// dem ＋, nie über dem Text; in S weg, sonst würde „Pinnwand“ abgeschnitten), unten links
// „Sprachnachricht“, rechts das Mikro. Aufnahme (Tafel 80) = EINE Leiste statt
// der Zeilen (＋ und Mikro sind dann weg), gesendet nur über ➤; danach steht
// die Sprachnachricht oben (zart hervorgehoben) und unten kurz „✓ Gesendet“.
// Antippen öffnet die Pinnwand-Seite an dieser Nachricht; keine Wisch- oder
// Lange-Drücken-Gesten in der Kachel.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, Pin, Plus } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import type { TileSize } from "@/lib/core/homeLayout";
import { now } from "@/lib/core/now";
import { PIN_ROWS, tileEntries } from "@/lib/pinnwand";
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
  // Nach dem Senden: die neue Sprachnachricht kurz hervorheben, unten „✓ Gesendet“ (1,5 s)
  const [sent, setSent] = useState<string | null>(null);
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => setSent(null), 1500);
    return () => clearTimeout(t);
  }, [sent]);
  const recorder = useMemoRecorder({ me, onSent: (m) => setSent(m.id) });
  const recording = recorder.phase !== "idle";
  const canRecord = useCanRecordMemo();
  // Schild „schreiben“ unter dem ＋: bis zum ersten Tipp darauf oder nach 2 Besuchen
  const hintSeen = useHintSeen("pinnwand-kachel");
  const visited = useHintSeen("pinnwand-kachel-1");
  const counted = useRef(false);
  useEffect(() => {
    if (visited === undefined || counted.current) return;
    counted.current = true;
    if (!visited) markHintSeen("pinnwand-kachel-1");
    else return () => markHintSeen("pinnwand-kachel");
  }, [visited]);
  const nowMs = board.items ? now().getTime() : 0;
  const rows = PIN_ROWS[size];
  const { shown, more } = tileEntries(board.items ?? [], nowMs, rows);
  const write = () => {
    markHintSeen("pinnwand-kachel");
    openQuick({ kind: "pinnwand", me, more: setWriting });
  };
  return (
    <>
      <section className={`${TILE} flex ${size === "S" ? "h-[156px]" : ""} flex-col overflow-hidden px-3.5 pb-2.5 pt-3`} aria-label="Pinnwand" data-groesse={size}>
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
          {recording ? (
            <span className="h-[26px] w-[26px] shrink-0" aria-hidden />
          ) : (
            <span className="flex shrink-0 items-center gap-1">
              {hintSeen === false && size !== "S" && (
                <span className="pointer-events-none rounded-full bg-tile-inner px-1.5 py-px text-[10px] font-bold text-tile-accent" aria-hidden>
                  schreiben
                </span>
              )}
              <QuickButton icon={Plus} label="Nachricht an die Pinnwand" onClick={write} />
            </span>
          )}
        </div>
        <div className={`mt-1.5 flex flex-col gap-1 ${recording ? "min-h-0 flex-1" : ""}`} style={recording ? undefined : { minHeight: Math.max(64, rows * 30 + (rows - 1) * 4) }}>
          {recording ? (
            <RecordingRow recorder={recorder} compact />
          ) : showDemo ? (
            <Link href="/pinnwand" data-zeile className="flex h-[30px] items-center gap-2" aria-label={`Beispiel: ${DEMO.author}: ${DEMO.text}`}>
              <PersonAvatar name={DEMO.author} size={22} soft />
              <span className="min-w-0 flex-1 truncate text-[14px] font-semibold">{DEMO.text}</span>
            </Link>
          ) : shown.length ? (
            shown.map((item) =>
              item.kind === "memo" ? (
                <div key={item.id} className={`relative flex h-[30px] items-center gap-2 rounded-field ${sent === item.id ? "pin-hervor" : ""}`}>
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
        {!recording && canRecord && (
          <div className="mt-auto flex items-center justify-between gap-2">
            {sent ? (
              <span className="flex items-center gap-1 text-[12px] font-bold text-tile-accent" role="status">
                <Check className="h-3.5 w-3.5" strokeWidth={2.75} aria-hidden /> Gesendet
              </span>
            ) : (
              <span className="min-w-0 text-[12px] font-semibold leading-tight text-tile-accent">Sprach&shy;nachricht</span>
            )}
            <MemoMic recorder={recorder} size={34} tapOnly />
          </div>
        )}
      </section>
      {writing !== null && <PinWriteSheet me={me} initialText={writing} onClose={() => setWriting(null)} />}
    </>
  );
}
