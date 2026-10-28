"use client";

// PINNWAND auf der Startseite (Tafel 107, Variante 1 „Fächer“): die Kachel
// bleibt rosa (Look „Schlicht“: weiß, die Zettel behalten ihre Farbe) und
// zeigt echte kleine Zettel – so sieht man sofort: Pinnwand, nicht Notizen.
// S = Fächer aus den drei neuesten Zetteln an der Tür („Bleibt hängen“ nur
// zum Auffüllen; gerade Abgehaktes 1 s mit Häkchen, dann weich weg), M = drei nebeneinander, L = bis 6. Oben rechts ＋ =
// „Neuer Zettel“. Leer (Variante 4): gestrichelter Zettel „Erster Zettel?“
// und „Oder 🎙 Sprachnachricht“ (Mikro = gleich aufnehmen; die Aufnahme ist
// EINE Leiste, gesendet nur über ➤). Beispiel-Tag: Mias oranger Zettel, Ole
// und eine Sprachnachricht, unten rechts „Beispiel“. Antippen der Kachel =
// Pinnwand, Tipp auf einen Zettel = Pinnwand mit diesem Zettel hervorgehoben.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pin, Plus } from "lucide-react";
import { TILE, TILE_LABEL } from "@/components/ui/styles";
import { QuickButton } from "@/components/ui/QuickButton";
import type { TileSize } from "@/lib/core/homeLayout";
import { FAECHER, faecherOf, papierFor } from "@/lib/pinnwand";
import { demoBoard } from "@/lib/pinnwand/beispiel";
import { clearDemoTile } from "@/lib/core/demo";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { helperName } from "@/lib/einstellungen/profile";
import { useBoard, type BoardItem } from "@/components/pinnwand/useBoard";
import { NeuerZettel } from "@/components/pinnwand/NeuerZettel";
import { Faecher, LeererZettel, ZettelReihe } from "@/components/pinnwand/Faecher";
import { MemoNote, RecordingRow } from "@/components/pinnwand/MemoParts";
import { useCanRecordMemo, useMemoRecorder } from "@/components/pinnwand/useMemoRecorder";

const ofDoor = (e: { id: string; erstellt: string; typ: string }, kind: "pin" | "memo"): BoardItem =>
  (kind === "pin" ? { kind, id: e.id, at: e.erstellt, pinned: false, pin: e } : { kind, id: e.id, at: e.erstellt, memo: e }) as BoardItem;

export function PinboardTile({ size = "S", me, demo = false }: { size?: TileSize; me: string; demo?: boolean }) {
  const board = useBoard(me);
  const profile = useProfile();
  // Beispiel-Tag: erster eigener Zettel → Beispiel verschwindet für immer
  const hasOwn = board.hasOwn;
  useEffect(() => {
    if (demo && hasOwn) clearDemoTile("pinnwand");
  }, [demo, hasOwn]);
  const showDemo = demo && !hasOwn;
  const [writing, setWriting] = useState(false);
  const recorder = useMemoRecorder({ me });
  const recording = recorder.phase !== "idle";
  const canRecord = useCanRecordMemo();
  const count = FAECHER[size];

  const minis = (() => {
    if (showDemo) {
      const d = demoBoard(helperName(profile));
      const items = [ofDoor(d.pins[0], "pin"), ofDoor(d.memos[0], "memo"), ofDoor(d.pins[1], "pin")];
      return items.map((item) => ({ item, tone: item.id === d.mia ? ("mia" as const) : undefined }));
    }
    const all = board.items ?? [];
    const chosen = faecherOf(
      all.map((i) => ({ ...(i.kind === "pin" ? i.pin : i.memo), item: i })),
      board.nowMs,
      count,
    );
    return chosen.map((c) => ({ item: c.item }));
  })();

  return (
    <>
      <section className={`${TILE} flex ${size === "S" ? "h-[156px]" : ""} flex-col overflow-hidden px-3.5 pb-2.5 pt-3`} aria-label="Pinnwand" data-groesse={size}>
        <div className="flex items-center gap-2">
          <Link href="/pinnwand" className={`hit flex min-w-0 flex-1 items-center gap-1.5 ${TILE_LABEL}`} aria-label="Pinnwand öffnen">
            <Pin className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
            <span>Pinnwand</span>
          </Link>
          {recording ? <span className="h-[26px] w-[26px] shrink-0" aria-hidden /> : <QuickButton icon={Plus} label="Neuer Zettel" onClick={() => setWriting(true)} />}
        </div>
        <div className={`relative mt-1 min-h-0 flex-1 ${size === "S" ? "" : "min-h-[120px]"}`}>
          {recording ? (
            <div className="flex h-full flex-col justify-center">
              <RecordingRow recorder={recorder} compact />
            </div>
          ) : !board.items ? null : minis.length === 0 ? (
            <LeererZettel onWrite={() => setWriting(true)} onRecord={canRecord ? () => void recorder.start("tippen") : null} />
          ) : size === "S" ? (
            <Faecher minis={minis} household={board.household} demo={showDemo} />
          ) : (
            <ZettelReihe minis={minis} household={board.household} demo={showDemo} />
          )}
          {showDemo && !recording && (
            <span className="pointer-events-none absolute bottom-0 right-0 z-10 rounded-full bg-tile-inner px-2 py-0.5 text-[11px] font-bold text-tile-accent">Beispiel</span>
          )}
        </div>
        <MemoNote text={recorder.note} onResend={recorder.unsent ? recorder.resend : undefined} />
      </section>
      {writing && <NeuerZettel me={me} household={board.household} karo={papierFor(me, profile?.persons) === "karo"} onClose={() => setWriting(false)} />}
    </>
  );
}
