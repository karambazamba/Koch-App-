// Migration des Pinnwand-Speichers (`wasgibts.pinnwand`) – rein, damit auch
// der Abgleich (`konten/sync/docs.ts`) ältere Stände heben kann.

import { sanitizePin, type PinMessage } from "@/lib/pinnwand/model";
import { sanitizeMemo, type MemoMessage } from "@/lib/pinnwand/memo";

export type PinStore = { version: 5; messages: PinMessage[]; memos: MemoMessage[] };

/**
 * v1 → v2: Memos kommen dazu; v2 → v3: Reaktionen umgedreht; v3 → v4:
 * Farbe/Papier/Erledigt/Archiv; v4 → v5 (Tafel 123): Größe „klein“, Platz
 * `sort` null (= nach der Zeit, also genau die bisherige Reihenfolge:
 * „Bleibt hängen“ vorn, sonst neueste zuerst) und `privat` aus – alles beim
 * Lesen jedes Eintrags, nichts geht verloren.
 */
export function migratePinStore(raw: unknown): PinStore | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { version?: number; messages?: unknown; memos?: unknown };
  if (r.version !== 1 && r.version !== 2 && r.version !== 3 && r.version !== 4 && r.version !== 5) return null;
  const messages = (Array.isArray(r.messages) ? r.messages : []).map(sanitizePin).filter((m): m is PinMessage => m !== null);
  const memos = r.version !== 1 && Array.isArray(r.memos) ? r.memos.map(sanitizeMemo).filter((m): m is MemoMessage => m !== null) : [];
  return { version: 5, messages, memos };
}

