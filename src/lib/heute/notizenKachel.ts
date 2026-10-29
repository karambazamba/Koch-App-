// Notizen-Kachel je Größe im festen Raster (rein): XS = die neueste bzw.
// angeheftete Notiz (eine Zeile), S und M = bis 3 Notizen als Zeilen;
// angeheftete zuerst.
// Listen zeigen, wie viel schon erledigt ist (nie, was fehlt).

import { sortNotes, type Note } from "@/lib/notizen/model";
import type { TileSize } from "@/lib/core/homeLayout";

export type NotizZeile = { id: string; title: string; line: string; pinned: boolean };

const MAX: Record<TileSize, number> = { XS: 1, S: 3, M: 3 };

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

/**
 * Vorschau der neuesten Notiz in der Kachel (A-060, Tafel 144): Titel und
 * Anfang fließen in bis zu 2 Zeilen, die zweite läuft weich aus – darum nie
 * ein „…“ am Ende. Ein auf 80 Zeichen gekürzter Titel („… …“) steht ganz im
 * Text: dann zeigt die Vorschau gleich den vollen Anfang.
 */
export function notizVorschau(z: Pick<NotizZeile, "title" | "line">): { titel: string; rest: string } {
  // Auch unvollständige Altdaten (ohne Titel/Text) zeigen sich ruhig
  const title = (z.title ?? "").trim();
  const line = z.line ?? "";
  const kurz = title.replace(/\s*(…|\.\.\.)$/, "").trim();
  if (kurz !== title && line.startsWith(kurz)) return { titel: line, rest: "" };
  return { titel: kurz, rest: line };
}
