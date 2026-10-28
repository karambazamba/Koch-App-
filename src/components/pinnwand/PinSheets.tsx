"use client";

// Pinnwand: die „wer · wann“-Zeile („Du · 7:48“, „Lisa · gestern“) – auch in
// zwei Teilen, damit bei Platzmangel nur die Zeit bleibt (Tafel 123).

import { todayIso, toIsoDate } from "@/lib/core/now";
import { pinMeta, pinMetaParts } from "@/lib/pinnwand";
import { shortClock } from "@/components/notizen/Schnellnotiz";

type Meta = { erstellt: string; data: { author: string } };
const dayOf = (iso: string) => toIsoDate(new Date(iso));

export const pinMetaLine = (m: Meta, me: string) => pinMeta(m, me, todayIso(), shortClock, dayOf);

/** An der Tür kurz: heute die Uhrzeit, die letzten sechs Tage der Wochentag („Lisa · Mo“) */
export const pinMetaPartsOf = (m: Meta, me: string) => pinMetaParts(m, me, todayIso(), shortClock, dayOf, true);
