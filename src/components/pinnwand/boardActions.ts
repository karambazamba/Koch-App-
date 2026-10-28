"use client";

// Was man mit einem Zettel an der Kühlschranktür tun kann – überall gleich
// (Menü nach langem Drücken bzw. Antippen, Haken-Kreis, VoiceOver): Erledigt
// (blass mit Haken, nach 3 s ins Archiv, „Erledigt · Rückgängig“ 5 s),
// Antworten (neuer Zettel mit Bezug), In Notizen (eigene Notiz, Zettel ins
// Archiv), Bleibt hängen / Nicht mehr festhalten, Löschen (nur eigene,
// „Gelöscht · Rückgängig“), reagieren (eine je Person).

import { now } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { canDelete, changeMemos, changePins, doneValue, removeMemo, removePin, setPinPinned, toggleMemoReaction, toggleReaction, updateMemo, updatePin, type Done, type Reaction } from "@/lib/pinnwand";
import { archivePin, noteOfPin } from "@/lib/pinnwand/notizBruecke";
import { changeNotes, upsertNote } from "@/lib/notizen";
import { forgetMemo, stopMemo } from "@/lib/pinnwand/memoPlayer";
import { buzz } from "@/components/heute/actions";
import { entryOf, type BoardItem } from "@/components/pinnwand/useBoard";

const stamp = () => now().toISOString();

export const reactionsOf = (item: BoardItem) => entryOf(item).data.reactions;
export const mayDelete = (item: BoardItem, me: string) => canDelete(entryOf(item), me);

/** Eigenen Zettel löschen – mit „Gelöscht · Rückgängig“ (3 s); das Einzige, was etwas entfernt */
export function deleteItem(item: BoardItem, me: string): boolean {
  if (!mayDelete(item, me)) return false;
  buzz();
  if (item.kind === "memo") {
    stopMemo();
    forgetMemo(item.id);
    showDeleted(pushUndo("das Löschen der Sprachnachricht", changeMemos((all) => removeMemo(all, item.id))));
  } else {
    // Das Bild bleibt auf dem Gerät, bis das Aufräumen beim nächsten Start es wegnimmt (Rückgängig geht so immer)
    showDeleted(pushUndo("das Löschen des Zettels", changePins((all) => removePin(all, item.id))));
  }
  return true;
}

/** Erledigt an/aus (nur dieser Eintrag – Änderungen anderer bleiben) */
function setDone(item: BoardItem, erledigt: Done | null) {
  const s = stamp();
  if (item.kind === "memo") changeMemos((all) => updateMemo(all, item.id, { erledigt }, s));
  else changePins((all) => updatePin(all, item.id, { erledigt }, s));
}

/** So lange steht „Erledigt · Rückgängig“ (der Zettel gleitet nach 3 s ins Archiv) */
const ERLEDIGT_TOAST_S = 5;

/**
 * Abhaken: blass mit Haken, nach 3 s gleitet der Zettel ins Archiv „Ältere“;
 * „Erledigt · Rückgängig“ (5 s) holt ihn zurück an die Tür – auch aus dem
 * Archiv. Nochmal tippen, solange er hängt, nimmt es still zurück.
 */
export function toggleDone(item: BoardItem, me: string) {
  buzz();
  const erledigt = doneValue(entryOf(item), me, stamp());
  setDone(item, erledigt);
  if (!erledigt) return;
  const undo = pushUndo("Erledigt", () => setDone(item, null));
  showToast({ text: "Erledigt", undo, undoneText: "Hängt wieder", seconds: ERLEDIGT_TOAST_S, small: true });
}

/** Reaktion setzen, tauschen oder entfernen */
export function reactTo(item: BoardItem, reaction: Reaction, me: string) {
  buzz();
  if (item.kind === "memo") changeMemos((all) => toggleMemoReaction(all, item.id, reaction, me, stamp()));
  else changePins((all) => toggleReaction(all, item.id, reaction, me, stamp()));
}

/** „Bleibt hängen“ an/aus (Menü: „Nicht mehr festhalten“) */
export function togglePinned(item: BoardItem) {
  if (item.kind === "pin") changePins((all) => setPinPinned(all, item.id, !item.pin.data.pinned, stamp()));
}

/** „In Notizen“: der Text wird eine eigene Notiz, der Zettel geht ins Archiv (Rückgängig nimmt beides zurück) */
export function moveToNotes(item: BoardItem): boolean {
  if (item.kind !== "pin") return false;
  const note = noteOfPin(item.pin);
  if (!note) return false;
  const undoNote = changeNotes((all) => upsertNote(all, note));
  const undoPin = changePins((all) => archivePin(all, item.id, stamp()));
  const undo = pushUndo("In Notizen", () => (undoPin(), undoNote()));
  showToast({ text: "Liegt bei den Notizen", undo, undoneText: "Hängt wieder", seconds: 4, small: true });
  return true;
}
