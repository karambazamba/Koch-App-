"use client";

// Mias Routinen auf Heute (Tafel 81/82, Punkt 2): Überschneidung und
// Packliste als Fragen mit genau 2 Knöpfen für „Dein Tag“. Regeln rein in `src/lib/mia/routinen.ts`; jede Frage nur
// einmal (`src/lib/mia/fragen.ts`).

import { showToast } from "@/lib/core/toast";
import { createEntry } from "@/lib/core/entries";
import { changeEntries } from "@/lib/kalender/store";
import { sanitizeEntry, upsertEntry, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { quickTaskData } from "@/lib/kalender/quick";
import { addPin, changePins, createPin } from "@/lib/pinnwand";
import { packFrage, ueberschneidungen, type RoutineTermin } from "@/lib/mia/routinen";
import { answerFrage, useAnsweredFragen } from "@/lib/mia/fragen";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";

export type MiaFrage = { key: string; title: string; detail: string; yes: { label: string; run: () => void }; no: { label: string; run: () => void } };

const toRoutine = (i: DayItem): RoutineTermin => {
  const d = i.entry.typ === "termin" ? (i.entry.data as { who?: string[]; note?: string }) : {};
  return { key: i.key, title: i.title, time: i.time, end: i.end, who: d.who ?? [], note: d.note, work: i.room === "arbeit" };
};

/** Notiz an einen Termin hängen („Ich fahre.“) */
function addNote(entries: CalendarEntry[], key: string, note: string) {
  const id = key.split("@")[0];
  const e = entries.find((x) => x.id === id);
  if (!e || e.typ !== "termin") return;
  const old = (e.data as { note?: string }).note?.trim();
  changeEntries((list) => upsertEntry(list, { ...e, data: { ...e.data, note: old ? `${old} ${note}` : note } } as CalendarEntry));
}

export function useMiaRoutinen(o: { today: string; minutes: number; entries: CalendarEntry[]; termine: DayItem[]; tomorrow: DayItem[]; profile: HouseholdProfile; me: string; demo: boolean }): { fragen: MiaFrage[] } {
  const answered = useAnsweredFragen();
  if (o.demo) return { fragen: [] };
  const termine = o.termine.filter((i) => i.entry.typ === "termin").map(toRoutine);
  const ueber = ueberschneidungen(termine).find((u) => !answered[u.key]) ?? null;
  const packRaw = packFrage(o.tomorrow.filter((i) => i.entry.typ === "termin").map(toRoutine), o.minutes);
  const pack = packRaw && !answered[packRaw.key] ? packRaw : null;
  const other = o.profile.persons.find((p) => p.role === "erwachsen" && p.name.trim() && p.name.trim() !== o.me)?.name.trim() ?? null;
  const fragen: MiaFrage[] = [];
  if (ueber) {
    fragen.push({
      key: ueber.key,
      title: ueber.title,
      detail: ueber.detail,
      yes: { label: "Ich fahre", run: () => (addNote(o.entries, ueber.second.key, "Ich fahre."), answerFrage(ueber.key, o.today), showToast({ text: "Steht drin." })) },
      no: {
        label: other ? `${other} fragen` : "An die Pinnwand",
        run: () => {
          const pin = createPin(`${other ? `${other}, kannst` : "Kann jemand"} ${ueber.second.title} um ${ueber.second.time?.replace(/^0/, "")} übernehmen?`, o.me, null);
          if (pin) changePins((all) => addPin(all, pin));
          answerFrage(ueber.key, o.today);
          showToast({ text: "Hängt an der Pinnwand." });
        },
      },
    });
  }
  if (pack) {
    fragen.push({
      key: pack.key,
      title: pack.title,
      detail: pack.detail,
      yes: {
        label: "Ja, bitte",
        run: () => {
          const task = sanitizeEntry(createEntry("aufgabe", quickTaskData(`Packen: ${pack.items}`, "heute", o.today)) as CalendarEntry);
          if (task) changeEntries((list) => upsertEntry(list, task));
          answerFrage(pack.key, o.today);
          showToast({ text: "Steht auf der Liste." });
        },
      },
      no: { label: "Hab ich schon", run: () => answerFrage(pack.key, o.today) },
    });
  }
  return {
    fragen,
  };
}
