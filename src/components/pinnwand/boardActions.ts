"use client";

// Was man mit einer Nachricht auf der Pinnwand tun kann – überall gleich
// (Wischen, Lange-Drücken-Menü, VoiceOver-Aktionen): löschen (nur eigene,
// „Gelöscht · Rückgängig“), reagieren (eine je Person), antworten
// (Schnelleingabe, die Antwort trägt ein Zitat), an Mia weiterleiten.

import { now } from "@/lib/core/now";
import { showDeleted } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { canDelete, changeMemos, changePins, removeMemo, removePin, toggleMemoReaction, toggleReaction, type PinQuote, type Reaction } from "@/lib/pinnwand";
import { quoteOf } from "@/lib/pinnwand/schreiben";
import { forgetMemo, stopMemo } from "@/lib/pinnwand/memoPlayer";
import { openHelper } from "@/lib/begleitung/open";
import { openQuick } from "@/lib/core/schnelleingabe";
import { buzz } from "@/components/heute/actions";
import type { BoardItem } from "@/components/pinnwand/useBoard";

const stamp = () => now().toISOString();

const authorOf = (item: BoardItem) => (item.kind === "pin" ? item.pin.data.author : item.memo.data.author);
export const reactionsOf = (item: BoardItem) => (item.kind === "pin" ? item.pin.data.reactions : item.memo.data.reactions);
export const mayDelete = (item: BoardItem, me: string) => canDelete({ data: { author: authorOf(item) } }, me);

/** Eigene Nachricht löschen – mit „Gelöscht · Rückgängig“ (3 s) */
export function deleteItem(item: BoardItem, me: string): boolean {
  if (!mayDelete(item, me)) return false;
  buzz();
  if (item.kind === "memo") {
    stopMemo();
    forgetMemo(item.id);
    showDeleted(pushUndo("das Löschen der Sprachnachricht", changeMemos((all) => removeMemo(all, item.id))));
  } else {
    showDeleted(pushUndo("das Löschen der Nachricht", changePins((all) => removePin(all, item.id))));
  }
  return true;
}

/** Reaktion setzen, tauschen oder entfernen */
export function reactTo(item: BoardItem, reaction: Reaction, me: string) {
  buzz();
  if (item.kind === "memo") changeMemos((all) => toggleMemoReaction(all, item.id, reaction, me, stamp()));
  else changePins((all) => toggleReaction(all, item.id, reaction, me, stamp()));
}

/** Antworten: Schnelleingabe „NACHRICHT AN ALLE“, die neue Nachricht zitiert diese */
export function replyTo(item: BoardItem, me: string, openForm: (text: string, quote: PinQuote) => void) {
  const quote = quoteOf(item.kind === "pin" ? item.pin : { id: item.id, data: { author: item.memo.data.author } });
  openQuick({ kind: "pinnwand", me, quote, more: (text) => openForm(text, quote) });
}

/** An Mia weiterleiten: sie macht daraus z. B. einen Termin oder eine Aufgabe (Vorschau mit „Übernehmen“) */
export function forwardToMia(item: BoardItem) {
  if (item.kind !== "pin") return;
  openHelper(undefined, `Mach daraus bitte einen Termin oder eine Aufgabe: „${item.pin.data.text}“ (von ${item.pin.data.author})`);
}
