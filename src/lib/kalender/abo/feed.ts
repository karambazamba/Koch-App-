// Kalender-Text eines Abos → seine Termine (ab heute, feste ids, besitzer
// "abo:<id>"). Eigene Datei, damit der Parser erst beim Abruf geladen wird.

import type { CalendarEntry } from "@/lib/kalender/model";
import { parseIcs } from "@/lib/kalender/import/ics";
import { planImport } from "@/lib/kalender/import/plan";
import { ABO_PREFIX, type Abo } from "@/lib/kalender/abo/model";

/** Todoist-Link (Kalender-Abonnement): seine Einträge sind Aufgaben, keine Termine */
const isTodoistUrl = (url: string) => /(^|\.|\/\/)todoist\.com\//i.test(url) || /todoist\.test/i.test(url);

/** Termin aus einer Aufgaben-Quelle → schreibgeschützte Aufgabe (Etikett „Todoist“, Tag, ggf. Uhrzeit) */
function asTask(e: CalendarEntry, label: string): CalendarEntry {
  if (e.typ !== "termin") return e;
  const d = e.data;
  return { ...e, typ: "aufgabe", data: { title: d.title, date: d.date, ...(d.start ? { time: d.start } : {}), label, repeat: d.repeat ?? null, reminder: "aus", doneOn: null, doneDates: [], skipDates: d.skipDates ?? [] } };
}

/** Kalender-Text → Termine des Abos (ab heute, feste ids); null = kein Kalender. Aufgaben (VTODO, Todoist) werden Aufgaben. */
export function feedEntries(abo: Pick<Abo, "id" | "raum"> & { url?: string }, text: string, today: string): { entries: CalendarEntry[]; name: string | null } | null {
  const cal = parseIcs(text);
  if (!cal) return null;
  const allTasks = Boolean(abo.url && isTodoistUrl(abo.url));
  const todoUids = new Set(cal.events.filter((ev) => ev.todo).map((ev) => ev.uid));
  const { entries } = planImport([cal], { range: "ab-heute", today, rooms: [abo.raum] });
  return {
    name: cal.name,
    entries: entries.map((e) => {
      const uid = e.typ === "termin" ? e.data.source?.uid : e.id;
      const own = { ...e, id: `${ABO_PREFIX}${abo.id}:${uid}`, besitzer: `${ABO_PREFIX}${abo.id}` };
      return allTasks || (uid && todoUids.has(uid)) ? asTask(own, allTasks ? "Todoist" : "Aufgabe") : own;
    }),
  };
}

