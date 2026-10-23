"use client";

// Eine Sprachnachricht zwischen den Text-Nachrichten: Avatar (Punkt = noch
// nicht gehört), Abspiel-Knopf, Tonwelle (füllt sich beim Abspielen), Dauer,
// Reaktionen. Reagieren, „Gehört von“ und Löschen gehen über Lange-Drücken
// bzw. Wischen (SwipeRow, ReactionMenu). In der Kachel die schmale Zeile.

import { useEffect, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { now } from "@/lib/core/now";
import { changeMemos, dauerWords, formatDauer, memoUnheard, reactionLine, setMemoHeard, type MemoMessage } from "@/lib/pinnwand";
import { memoPlayerIdle, memoPlayerState, playMemo, prepareMemo, subscribeMemoPlayer } from "@/lib/pinnwand/memoPlayer";
import { MemoWave } from "@/components/pinnwand/MemoParts";
import { pinMetaLine } from "@/components/pinnwand/PinSheets";

function usePlayer() {
  return useSyncExternalStore(subscribeMemoPlayer, memoPlayerState, memoPlayerIdle);
}

const stamp = () => now().toISOString();

/** Abspielen; wer es abspielt, hat es gehört */
function playAndHear(memo: MemoMessage, me: string, household: string[]) {
  return playMemo(memo, () => changeMemos((all) => setMemoHeard(all, memo.id, me, true, household, stamp())));
}

function PlayButton({ memo, me, household, size }: { memo: MemoMessage; me: string; household: string[]; size: number }) {
  const player = usePlayer();
  const playing = player.id === memo.id;
  const who = memo.data.author === me ? "deine" : `von ${memo.data.author}`;
  return (
    <button
      type="button"
      data-no-swipe
      onClick={(e) => {
        e.stopPropagation();
        playAndHear(memo, me, household);
      }}
      aria-label={`${playing ? "Anhalten" : "Abspielen"}: Sprachnachricht ${who}, ${dauerWords(memo.data.dauer)}`}
      className="hit flex shrink-0 items-center justify-center rounded-full bg-tile-accent text-on-accent active:scale-95"
      style={{ width: size, height: size }}
    >
      {playing ? <Pause className="h-[45%] w-[45%] fill-current" strokeWidth={2} aria-hidden /> : <Play className="ml-[2px] h-[45%] w-[45%] fill-current" strokeWidth={2} aria-hidden />}
    </button>
  );
}

/** Zeile auf der Seite: Avatar, Abspielen, Tonwelle, Dauer, wer · wann, Reaktionen */
export function MemoItem({ memo, me, household }: { memo: MemoMessage; me: string; household: string[] }) {
  const player = usePlayer();
  const progress = player.id === memo.id ? player.progress : 0;
  const unheard = memoUnheard(memo, me);
  const reacted = reactionLine(memo.data.reactions);
  useEffect(() => {
    void prepareMemo(memo);
  }, [memo]);
  return (
    <div className="flex w-full items-center gap-2.5">
      <span className="relative shrink-0">
        <PersonAvatar name={memo.data.author} />
        {unheard && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-tile-accent" aria-label="Noch nicht gehört" />}
      </span>
      <PlayButton memo={memo} me={me} household={household} size={34} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <MemoWave wave={memo.data.wave} progress={progress} className="min-w-0 flex-1 overflow-hidden" />
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted">{formatDauer(memo.data.dauer)}</span>
        </span>
        <span className="text-xs text-muted">{pinMetaLine(memo, me)}</span>
        {reacted && <span className="text-[13px] text-muted">{reacted}</span>}
      </span>
    </div>
  );
}

/** Schmale Zeile in der Kachel (30 px): Avatar 22 px, ▶, kleine Tonwelle, Länge */
export function MemoMini({ memo, me, household }: { memo: MemoMessage; me: string; household: string[] }) {
  const player = usePlayer();
  const progress = player.id === memo.id ? player.progress : 0;
  useEffect(() => {
    void prepareMemo(memo);
  }, [memo]);
  return (
    <>
      <PersonAvatar name={memo.data.author} size={22} soft />
      <PlayButton memo={memo} me={me} household={household} size={22} />
      <MemoWave wave={memo.data.wave} progress={progress} className="h-4 min-w-0 flex-1 overflow-hidden" />
      <span className="shrink-0 text-[12px] font-semibold tabular-nums text-muted">{formatDauer(memo.data.dauer)}</span>
    </>
  );
}
