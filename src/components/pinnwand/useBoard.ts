"use client";

// Pinnwand als eine Liste: Text-Nachrichten und Sprachnachrichten nach Zeit
// gemischt (neueste zuerst), dazu der Haushalt (für „alle gehört“) und ob es
// Ungelesenes/Ungehörtes gibt. Für Kachel und Seite.

import { now } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { PINS, sortBy, via } from "@/lib/core/sort";
import { hasUnread, householdNames, memoUnheard, useMemos, usePins, visibleMemos, visiblePins, type MemoMessage, type PinMessage } from "@/lib/pinnwand";

export type BoardItem = { kind: "pin"; id: string; at: string; pin: PinMessage } | { kind: "memo"; id: string; at: string; memo: MemoMessage };

export function useBoard(me: string) {
  const pins = usePins();
  const memos = useMemos();
  const profile = useProfile();
  const household = householdNames(profile?.persons, me);
  // Zeit erst lesen, wenn die Daten da sind (nicht beim Vorab-Rendern)
  const nowMs = pins === undefined ? 0 : now().getTime();
  const liveMemos = memos && pins !== undefined ? visibleMemos(memos, nowMs) : [];
  const items: BoardItem[] | undefined =
    pins === undefined
      ? undefined
      : [
          ...visiblePins(pins, nowMs).map((pin): BoardItem => ({ kind: "pin", id: pin.id, at: pin.erstellt, pin })),
          ...liveMemos.map((memo): BoardItem => ({ kind: "memo", id: memo.id, at: memo.erstellt, memo })),
        ];
  const sorted = items && sortBy(items, ...via((i: BoardItem) => ({ pinned: i.kind === "pin" && i.pin.data.pinned, at: i.at }), PINS));
  const unread = Boolean(pins && hasUnread(pins, me, nowMs)) || liveMemos.some((m) => memoUnheard(m, me));
  return { items: sorted, household, unread, hasOwn: Boolean(pins?.length || memos?.length) };
}
