"use client";

// Was man mit einem Zettel an der Kühlschranktür tun kann – überall gleich
// (Menü nach langem Drücken bzw. Antippen, Haken-Kreis, VoiceOver): Erledigt
// (Häkchen orange, 1 s stehen – nochmal tippen = doch nicht –, dann weich
// ins Archiv, danach „Erledigt · Rückgängig“ 5 s),
// Antworten (neuer Zettel mit Bezug), In Notizen (eigene Notiz, Zettel ins
// Archiv), Bleibt hängen / Nicht mehr festhalten, Löschen (nur eigene,
// „Gelöscht · Rückgängig“), reagieren (eine je Person). Dazu Tafel 123:
// Größe (klein/groß), Platz (Ziehen, „Nach oben“) und „Nur für mich“ bzw.
// „Für alle“ – still, ohne Meldung (nichts wird gelöscht).

import { now } from "@/lib/core/now";
import { showDeleted, showToast } from "@/lib/core/toast";
import { pushUndo } from "@/lib/core/undo";
import { ABHAK_MS, canDelete, changeMemos, changePins, doneValue, loadMemos, loadPins, makePinPrivate, removeMemo, removePin, setPinPinned, toggleMemoReaction, toggleReaction, updateMemo, updatePin, type Done, type Groesse, type Reaction } from "@/lib/pinnwand";
import { sortForMove, sortForTop } from "@/lib/pinnwand";
import { fotoStore } from "@/lib/pinnwand/fotoStore";
import { newId } from "@/lib/core/entries";
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

/** So lange steht „Erledigt · Rückgängig“ (erst, wenn der Zettel im Archiv liegt) */
const ERLEDIGT_TOAST_S = 5;

/** Noch genau so abgehakt (nicht inzwischen zurückgenommen oder neu abgehakt)? */
function stillDone(item: BoardItem, am: string): boolean {
  const list = item.kind === "memo" ? loadMemos() : loadPins();
  return list.find((e) => e.id === item.id)?.data.erledigt?.am === am;
}

/**
 * Abhaken wie Aufgaben und Einkauf: Häkchen orange, 1 s stehen (nochmal
 * tippen = doch nicht, still), dann gleitet der Zettel 0,8 s weich ins Archiv
 * „Ältere“ – nie durchgestrichen. Liegt er dort, steht „Erledigt ·
 * Rückgängig“ (5 s) und holt ihn zurück an die Tür.
 */
export function toggleDone(item: BoardItem, me: string) {
  buzz();
  const erledigt = doneValue(entryOf(item), me, stamp());
  setDone(item, erledigt);
  if (!erledigt) return;
  window.setTimeout(() => {
    if (!stillDone(item, erledigt.am)) return;
    const undo = pushUndo("Erledigt", () => setDone(item, null));
    showToast({ text: "Erledigt", undo, undoneText: "Hängt wieder", seconds: ERLEDIGT_TOAST_S, small: true });
  }, ABHAK_MS);
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

/** Nur dieses Feld dieses Eintrags ändern (Zettel oder Sprachnachricht) */
function setField(item: BoardItem, data: { groesse?: Groesse; sort?: number }) {
  const s = stamp();
  if (item.kind === "memo") changeMemos((all) => updateMemo(all, item.id, data, s));
  else changePins((all) => updatePin(all, item.id, data, s));
}

/** Klein (halbe Breite) oder groß (volle Breite) */
export function setGroesse(item: BoardItem, groesse: Groesse) {
  if (entryOf(item).data.groesse !== groesse) setField(item, { groesse });
}

/** „Nach oben“: vor alle anderen (Zettel, die hängen bleiben, stehen davor) */
export function toTop(item: BoardItem, all: BoardItem[]) {
  const sort = sortForTop(all.map(entryOf), item.id, now().getTime());
  if (sort !== null) setField(item, { sort });
}

/** Gezogen: an Stelle `to` der Reihenfolge `ordered` (nur der gezogene Zettel bekommt einen neuen Platz) */
export function moveItem(item: BoardItem, ordered: BoardItem[], to: number): boolean {
  const sort = sortForMove(ordered.map(entryOf), item.id, to);
  if (sort === null) return false;
  buzz();
  setField(item, { sort });
  return true;
}

/**
 * „Nur für mich“ an/aus (nur Zettel). An: neue ID (der alte Zettel geht als
 * Lösch-Markierung an den Haushalt, so verschwindet er auch dort, wo er schon
 * war); das Bild zieht auf dem Gerät mit um und wird nicht mehr geteilt.
 * Aus: gleiche ID, für alle.
 */
export async function setPrivat(item: BoardItem, privat: boolean): Promise<void> {
  if (item.kind !== "pin" || item.pin.data.privat === privat) return;
  if (!privat) {
    changePins((all) => updatePin(all, item.id, { privat: false }, stamp()));
    return;
  }
  const id = newId();
  if (item.pin.data.foto) {
    const blob = await fotoStore.load(item.pin).catch(() => null);
    if (blob) await fotoStore.save(id, blob).catch(() => undefined);
  }
  changePins((all) => makePinPrivate(all, item.id, id, stamp()));
}
