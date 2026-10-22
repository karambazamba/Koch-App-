// Push (später, mit Supabase) – schon jetzt die Regeln, damit der Server sie
// nur noch anwenden muss: höchstens eine proaktive Mitteilung pro Tag,
// Ruhezeit 20:00–7:00, Pause = absolute Ruhe, und "Ruhe nach Feierabend":
// im Feierabend nichts zu Arbeit und Aufgaben. Timer-Enden dürfen immer
// (man hat sie selbst gestellt).

import { clockMinutes, type DayRoutine } from "@/lib/heute/tagesablauf";
import { eveningStart } from "@/lib/heute/phases";
import { helperMessage, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { BEGLEITUNG_PUSH_ICON, icon as iconFile } from "@/lib/core/app";

export type PushKind = "timer" | "termin-familie" | "termin-arbeit" | "aufgabe" | "proaktiv";

export type PushCheck = {
  kind: PushKind;
  /** Minuten seit Mitternacht (Europe/Berlin) */
  minutes: number;
  routine: DayRoutine;
  /** Ende des letzten Arbeit-Termins heute (Minuten) */
  workEnd: number | null;
  /** Pause-Modus (Urlaub) */
  paused: boolean;
  /** Heute schon eine proaktive Mitteilung? */
  proactiveSentToday: boolean;
};

const QUIET_FROM = 20 * 60;
const QUIET_UNTIL = 7 * 60;

/** Darf diese Mitteilung jetzt raus? */
export function pushAllowed(c: PushCheck): boolean {
  if (c.kind === "timer") return true;
  if (c.paused) return false;
  const quiet = c.minutes >= QUIET_FROM || c.minutes < QUIET_UNTIL;
  if (c.kind === "proaktiv") return !quiet && !c.proactiveSentToday;
  const evening = c.minutes >= eveningStart({ routine: c.routine, workEnd: c.workEnd }) || c.minutes < clockMinutes(c.routine.morgenBis);
  if (c.routine.ruhe && evening && (c.kind === "termin-arbeit" || c.kind === "aufgabe")) return false;
  return true;
}

/** Mitteilung der Begleitung (für die spätere Push-Anbindung): Text immer "<Name>: …", Bild = ihr Gesicht */
export function begleitungPush(profile: Pick<HouseholdProfile, "helper">, text: string): { body: string; icon: string; badge: string } {
  return { body: helperMessage(profile, text), icon: BEGLEITUNG_PUSH_ICON, badge: iconFile("favicon-48.png") };
}
