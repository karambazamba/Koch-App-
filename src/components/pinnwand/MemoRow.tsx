"use client";

// Eine Sprachnachricht zwischen den Text-Nachrichten: Avatar (Punkt = noch
// nicht gehört), Abspiel-Knopf, Tonwelle (füllt sich beim Abspielen), Dauer.
// Antippen der Zeile = Fenster: reagieren; beim eigenen Memo „Gehört von“
// (Häkchen je Person) und „Memo löschen“ (Gelöscht · Rückgängig).

import { useEffect, useSyncExternalStore } from "react";
import { Check, Pause, Play, Trash2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass, chipClass } from "@/components/ui/styles";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { now } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { REACTIONS, changeMemos, dauerWords, formatDauer, memoUnheard, removeMemo, setMemoHeard, toggleMemoReaction, type MemoMessage } from "@/lib/pinnwand";
import { forgetMemo, memoPlayerIdle, memoPlayerState, playMemo, prepareMemo, stopMemo, subscribeMemoPlayer } from "@/lib/pinnwand/memoPlayer";
import { buzz } from "@/components/alltag/actions";
import { MemoWave } from "./MemoParts";
import { pinMetaLine } from "./PinSheets";

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

/** Zeile in Kachel (`soft`) bzw. auf der Seite */
export function MemoItem({ memo, me, household, soft = false, onOpen }: { memo: MemoMessage; me: string; household: string[]; soft?: boolean; onOpen: () => void }) {
  const player = usePlayer();
  const progress = player.id === memo.id ? player.progress : 0;
  const unheard = memoUnheard(memo, me);
  const reacted = REACTIONS.filter((r) => (memo.data.reactions[r]?.length ?? 0) > 0);
  useEffect(() => {
    void prepareMemo(memo);
  }, [memo]);
  return (
    <div className="flex w-full items-center gap-2.5">
      <span className="relative shrink-0">
        <PersonAvatar name={memo.data.author} soft={soft} />
        {unheard && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-tile-accent" aria-label="Noch nicht gehört" />}
      </span>
      <PlayButton memo={memo} me={me} household={household} size={soft ? 30 : 34} />
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left" aria-label={`Sprachnachricht ${pinMetaLine(memo, me)} – mehr`}>
        <span className="flex items-center gap-2">
          <MemoWave wave={memo.data.wave} progress={progress} className="min-w-0 flex-1 overflow-hidden" />
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-muted">{formatDauer(memo.data.dauer)}</span>
        </span>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          {pinMetaLine(memo, me)}
          {reacted.length > 0 && <span className="text-sm">{reacted.join("")}</span>}
        </span>
      </button>
    </div>
  );
}

/** Fenster zur Sprachnachricht */
export function MemoSheet({ memo, me, household, onClose }: { memo: MemoMessage; me: string; household: string[]; onClose: () => void }) {
  const mine = memo.data.author === me;
  const others = household.filter((p) => p !== memo.data.author);
  return (
    <Sheet title="Sprachnachricht" onClose={onClose}>
      <div className="flex flex-col gap-4 pb-3" data-tone="pinnwand">
        <MemoItem memo={memo} me={me} household={household} onOpen={() => undefined} />
        <div className="flex gap-2" role="group" aria-label="Reagieren">
          {REACTIONS.map((r) => {
            const on = memo.data.reactions[r]?.includes(me) ?? false;
            const count = memo.data.reactions[r]?.length ?? 0;
            return (
              <button
                key={r}
                type="button"
                aria-pressed={on}
                aria-label={`Mit ${r} reagieren`}
                onClick={() => {
                  buzz();
                  changeMemos((all) => toggleMemoReaction(all, memo.id, r, me, stamp()));
                }}
                className={`${chipClass(on)} text-lg`}
              >
                {r}
                {count > 0 && <span className="text-sm">{count}</span>}
              </button>
            );
          })}
        </div>
        {mine && others.length > 0 && (
          <section className="flex flex-col gap-1" aria-label="Gehört von">
            <h3 className="px-1 text-[15px] font-extrabold">Gehört von</h3>
            <ul className="flex flex-col">
              {others.map((p) => {
                const heard = memo.data.gehoertVon.includes(p);
                return (
                  <li key={p}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={heard}
                      onClick={() => changeMemos((all) => setMemoHeard(all, memo.id, p, !heard, household, stamp()))}
                      className="flex min-h-11 w-full items-center gap-3 px-1 text-left"
                    >
                      <PersonAvatar name={p} size={28} />
                      <span className="flex-1 text-base">{p}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${heard ? "bg-good text-on-accent" : "border-2 border-line-strong"}`}>{heard && <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        {mine && (
          <button
            type="button"
            onClick={() => {
              stopMemo();
              forgetMemo(memo.id);
              const undo = changeMemos((all) => removeMemo(all, memo.id));
              showDeleted(pushUndo("das Löschen der Sprachnachricht", undo));
              onClose();
            }}
            className={`${buttonClass("ghost", "sm")} text-danger`}
          >
            <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
            Memo löschen
          </button>
        )}
        <p className="text-xs text-muted">Sprachnachrichten verschwinden einen Tag, nachdem alle sie gehört haben – spätestens nach 3 Tagen.</p>
      </div>
    </Sheet>
  );
}
