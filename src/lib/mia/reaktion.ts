"use client";

// Mia freut sich (Tafel 81/82, Punkt 4): „Danke“ → Herzchen-Augen und
// Herzen, Lob → Freudensprung. Große Reaktion höchstens 1× je Gespräch und
// 3× am Tag (`wasgibts.miareaktion`), sonst nur das ruhige Lächeln.

import { readRaw, writeRaw } from "@/lib/core/localStore";
import { triggerAvatar } from "@/lib/core/avatarState";
import { bigReactionAllowed, miaReaktion } from "@/lib/mia/persona";

let conversation = 0;

/** Neues Gespräch (Bühne geöffnet) */
export function newMiaConversation() {
  conversation = 0;
}

function today(): { day: string; today: number } {
  try {
    const raw = JSON.parse(readRaw("wasgibts.miareaktion") ?? "null") as { version?: number; day?: string; count?: number } | null;
    return raw?.version === 1 && typeof raw.day === "string" ? { day: raw.day, today: Number(raw.count) || 0 } : { day: "", today: 0 };
  } catch {
    return { day: "", today: 0 };
  }
}

/** Auf das Gesagte reagieren; liefert, ob es eine große Reaktion gab */
export function reactToUser(text: string, todayIso: string): boolean {
  const kind = miaReaktion(text);
  if (!kind) return false;
  const t = today();
  if (!bigReactionAllowed({ conversation, ...t }, todayIso)) return false;
  conversation += 1;
  writeRaw("wasgibts.miareaktion", JSON.stringify({ version: 1, day: todayIso, count: (t.day === todayIso ? t.today : 0) + 1 }));
  triggerAvatar(kind === "danke" ? "herzen" : "freuen");
  return true;
}
