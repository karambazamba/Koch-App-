"use client";

// Abspielen einer Sprachnachricht (Kassenbon an der Tür, ▶ im Fächer): wer
// sie abspielt, hat sie gehört. Der Fortschritt füllt die Tonwelle.

import { useEffect, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";
import { now } from "@/lib/core/now";
import { changeMemos, dauerWords, setMemoHeard, type MemoMessage } from "@/lib/pinnwand";
import { memoPlayerIdle, memoPlayerState, playMemo, prepareMemo, subscribeMemoPlayer } from "@/lib/pinnwand/memoPlayer";

/** Was gerade spielt (id, Fortschritt 0..1) */
export function useMemoPlayer() {
  return useSyncExternalStore(subscribeMemoPlayer, memoPlayerState, memoPlayerIdle);
}

const stamp = () => now().toISOString();

/** Abspielen; wer es abspielt, hat es gehört */
function playAndHear(memo: MemoMessage, me: string, household: string[]) {
  return playMemo(memo, () => changeMemos((all) => setMemoHeard(all, memo.id, me, true, household, stamp())));
}

/** ▶ / ⏸ in der Farbe der Person; lädt den Ton schon vor */
export function PlayButton({ memo, me, household, size, color }: { memo: MemoMessage; me: string; household: string[]; size: number; color: string }) {
  const player = useMemoPlayer();
  const playing = player.id === memo.id;
  const who = memo.data.author === me ? "deine" : `von ${memo.data.author}`;
  useEffect(() => {
    void prepareMemo(memo);
  }, [memo]);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        playAndHear(memo, me, household);
      }}
      aria-label={`${playing ? "Anhalten" : "Abspielen"}: Sprachnachricht ${who}, ${dauerWords(memo.data.dauer)}`}
      className="hit pointer-events-auto relative z-10 flex shrink-0 items-center justify-center rounded-full text-on-accent active:scale-95"
      style={{ width: size, height: size, background: color }}
    >
      {playing ? <Pause className="h-[45%] w-[45%] fill-current" strokeWidth={2} aria-hidden /> : <Play className="ml-[2px] h-[45%] w-[45%] fill-current" strokeWidth={2} aria-hidden />}
    </button>
  );
}
