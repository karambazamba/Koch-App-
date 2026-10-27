// Notizen-Kachel je Größe (rein): S = die neueste bzw. angeheftete Notiz
// (Titel + Anfang), M = 3 Notizen als Zeilen, L = bis 5; angeheftete zuerst.
// Listen zeigen, wie viel schon erledigt ist (nie, was fehlt).

import { sortNotes, type Note } from "@/lib/notizen/model";
import type { TileSize } from "@/lib/core/homeLayout";

export type NotizZeile = { id: string; title: string; line: string; pinned: boolean };

const MAX: Record<TileSize, number> = { S: 1, M: 3, L: 5 };

/** Zweite Zeile einer Notiz: Anfang des Texts bzw. „1 von 3 erledigt“ */
export function notizAnfang(n: Note): string {
  if (n.data.kind === "liste") {
    const items = n.data.items ?? [];
    return items.length ? `${items.filter((i) => i.done).length} von ${items.length} erledigt` : "";
  }
  return (n.data.text ?? "").split(/\n/).map((l) => l.trim()).filter(Boolean)[0] ?? "";
}

/** Zeilen der Kachel (Schnellnotiz zählt nicht als eigene Notiz) */
export function notizZeilen(notes: Note[], size: TileSize): NotizZeile[] {
  return sortNotes(notes.filter((n) => !n.data.schnell))
    .slice(0, MAX[size])
    .map((n) => ({ id: n.id, title: n.data.title, line: notizAnfang(n), pinned: n.data.pinned }));
}
