"use client";

// Pinnwand: die „wer · wann“-Zeile („Du · 7:48“, „Lisa · gestern“).

import { todayIso, toIsoDate } from "@/lib/core/now";
import { pinMeta } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";

export const pinMetaLine = (m: { erstellt: string; data: { author: string } }, me: string) => pinMeta(m, me, todayIso(), shortClock, (iso) => toIsoDate(new Date(iso)));
