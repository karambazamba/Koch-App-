"use client";

// Die Kühlschranktür als eine Liste: Zettel und Sprachnachrichten nach Zeit
// gemischt (Angeheftetes oben, sonst neueste zuerst), dazu das Archiv
// „Ältere“, der Haushalt (für Farben und „alle gehört“) und ob es
// Ungelesenes/Ungehörtes gibt. Für Kachel und Seite.

import { now } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { PINS, sortBy, via } from "@/lib/core/sort";
import { archivedMemos, archivedPins, farbeOf, hasUnread, householdNames, memoUnheard, useMemos, usePins, visibleMemos, visiblePins, type MemoMessage, type PinMessage, type ZettelFarbe } from "@/lib/pinnwand";

export type BoardItem = { kind: "pin"; id: string; at: string; pinned: boolean; pin: PinMessage } | { kind: "memo"; id: string; at: string; pinned?: undefined; memo: MemoMessage };

const ofPin = (pin: PinMessage): BoardItem => ({ kind: "pin", id: pin.id, at: pin.erstellt, pinned: pin.data.pinned, pin });
const ofMemo = (memo: MemoMessage): BoardItem => ({ kind: "memo", id: memo.id, at: memo.erstellt, memo });

/** Der Eintrag dahinter (Zettel oder Sprachnachricht) */
export const entryOf = (i: BoardItem) => (i.kind === "pin" ? i.pin : i.memo);

/** Farbe des Eintrags (gewählt, sonst die der Person) */
export const toneOf = (i: BoardItem, household: string[]): ZettelFarbe => farbeOf(entryOf(i), household);

export function useBoard(me: string) {
  const pins = usePins();
  const memos = useMemos();
  const profile = useProfile();
  const household = householdNames(profile?.persons, me);
  // Zeit erst lesen, wenn die Daten da sind (nicht beim Vorab-Rendern)
  const nowMs = pins === undefined ? 0 : now().getTime();
  const liveMemos = memos && pins !== undefined ? visibleMemos(memos, nowMs) : [];
  const items: BoardItem[] | undefined = pins === undefined ? undefined : [...visiblePins(pins, nowMs).map(ofPin), ...liveMemos.map(ofMemo)];
  const sorted = items && sortBy(items, ...via((i: BoardItem) => ({ pinned: i.kind === "pin" && i.pin.data.pinned, at: i.at }), PINS));
  const archived = pins === undefined ? [] : sortBy([...archivedPins(pins, nowMs).map(ofPin), ...archivedMemos(memos ?? [], nowMs).map(ofMemo)], ...via((i: BoardItem) => ({ at: i.at }), PINS));
  const unread = Boolean(pins && hasUnread(pins, me, nowMs)) || liveMemos.some((m) => !m.data.erledigt && memoUnheard(m, me));
  return { items: sorted, archived, household, unread, nowMs, hasOwn: Boolean(pins?.length || memos?.length) };
}
