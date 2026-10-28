"use client";

// Im Menü einer Aufgabe (Tafel 52 B): „An … geben“ mit den Leuten aus dem
// Haushalt (Anfangsbuchstabe im Kreis), bei bekommenen „Passt gerade nicht“
// (geht freundlich zurück), bei abgegebenen „Zurückholen“. Nur mit Konto und
// mindestens einer zweiten Person im Haushalt.

import { HandHeart, Undo2, UserRoundCheck } from "lucide-react";
import { act } from "@/components/heute/actions";
import { useCachedAccount } from "@/lib/konten/cache";
import { changeTask, giveBack, giveTargets, giveTo, memberName, takeBack, taskRole } from "@/lib/kalender/abgeben/model";
import type { DayItem } from "@/lib/kalender/model";
import { mitgliedName } from "@/lib/konten/namen";
import { PersonAvatar } from "@/components/ui/PersonAvatar";

export function GiveRows({ item, row, onDone }: { item: DayItem; row: string; onDone: () => void }) {
  const household = useCachedAccount().household;
  if (item.entry.typ !== "aufgabe" || !household) return null;
  const me = household.me.userId;
  const role = taskRole(item.entry, me);
  const targets = giveTargets(household.members, me);
  const id = item.entry.id;
  const done = (fn: () => void) => () => {
    fn();
    onDone();
  };
  if (role === "bekommen")
    return (
      <button type="button" className={row} onClick={done(() => act((l, s) => changeTask(l, id, (d) => giveBack(d, me), s), `${item.title} zurückgegeben`))}>
        <Undo2 className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
        Passt gerade nicht
      </button>
    );
  if (role === "abgegeben")
    return (
      <button type="button" className={row} onClick={done(() => act((l, s) => changeTask(l, id, takeBack, s), `${item.title} zurückgeholt`))}>
        <UserRoundCheck className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
        <span className="flex-1">Zurückholen</span>
        <span className="text-sm font-semibold text-accent-strong">bei {memberName(household.members, (item.entry.data as { fuer?: string }).fuer) ?? "jemandem"}</span>
      </button>
    );
  if (!targets.length || item.done) return null;
  return (
    <div className="flex flex-col gap-2 px-4 py-3" role="group" aria-label="An jemanden geben">
      <span className="flex items-center gap-3 text-base font-semibold">
        <HandHeart className="h-5 w-5 text-accent" strokeWidth={2} aria-hidden />
        An … geben
      </span>
      <div className="flex flex-wrap gap-2 pl-8">
        {targets.map((m) => (
          <button
            key={m.userId}
            type="button"
            onClick={done(() => act((l, s) => changeTask(l, id, (d) => giveTo(d, m.userId), s), `${item.title} an ${mitgliedName(m)}`))}
            className="flex h-11 items-center gap-2 rounded-full bg-fill pl-1 pr-4 text-[15px] font-bold active:scale-95"
            aria-label={`An ${mitgliedName(m)} geben`}
          >
            <PersonAvatar name={mitgliedName(m)} size={36} />
            {mitgliedName(m)}
          </button>
        ))}
      </div>
    </div>
  );
}
