"use client";

// Die Kühlschranktür als eine Liste: Zettel und Sprachnachrichten nach Zeit
// gemischt („Bleibt hängen“ oben, sonst neueste zuerst), dazu das Archiv
// „Ältere“, der Haushalt (für Farben und „alle gehört“) und ob es
// Ungelesenes/Ungehörtes gibt. Abgehaktes gleitet nach 3 s ins Archiv – dafür
// rechnet die Liste genau dann neu. Für Kachel und Seite.

import { useEffect, useState } from "react";
import { now } from "@/lib/core/now";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { PINS, sortBy, via } from "@/lib/core/sort";
import { ABHAK_MS, archivedMemos, archivedPins, farbeOf, hasUnread, householdNames, memoUnheard, useMemos, usePins, visibleMemos, visiblePins, type MemoMessage, type PinMessage, type ZettelFarbe } from "@/lib/pinnwand";

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
  // Sobald der nächste abgehakte Zettel seine 3 s hinter sich hat: neu rechnen (er geht ins Archiv)
  const [, tick] = useState(0);
  const leaving = (items ?? []).map((i) => entryOf(i).data.erledigt?.am).filter((am): am is string => Boolean(am));
  const next = leaving.length ? Math.min(...leaving.map((am) => (Date.parse(am) || 0) + ABHAK_MS)) : null;
  useEffect(() => {
    if (next === null) return;
    const t = setTimeout(() => tick((n) => n + 1), Math.max(0, next - now().getTime()) + 30);
    return () => clearTimeout(t);
  }, [next]);
  const unread = Boolean(pins && hasUnread(pins, me, nowMs)) || liveMemos.some((m) => !m.data.erledigt && memoUnheard(m, me));
  return { items: sorted, archived, household, unread, nowMs, hasOwn: Boolean(pins?.length || memos?.length) };
}
