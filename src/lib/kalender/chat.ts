// Termine und Aufgaben im Chat ohne KI: Satz erkennen (parse.ts), Antwort
// formulieren und – bei Änderungen – die reine Änderung liefern, die der
// Chat sofort mit "Rückgängig" anwendet.

import { addDays } from "@/lib/core/now";
import { createEntry } from "@/lib/core/entries";
import { clockLabel, freeAnswer, showAnswer } from "@/lib/kalender/answers";
import { findByTitle, itemsForDay, moveItem, removeItem, REMINDERS, repeatLabel, setDone, upsertEntry, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { parseCalendar, type Draft } from "@/lib/kalender/parse";

type CalendarChatReply = {
  text: string;
  /** Änderung (rein), falls etwas eingetragen/geändert wird */
  change?: (entries: CalendarEntry[], stamp: string) => CalendarEntry[];
};

const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${weekdayShort(iso)} ${Number(d)}.${Number(m)}.`;
};

/** "Di 20.10. · 9:00 Steuerberater · Erinnerung 30 Min vorher" */
export function draftSummary(draft: Draft): string {
  const d = draft.data;
  const when =
    draft.typ === "termin"
      ? `${shortDate(draft.data.date)} · ${clockLabel(draft.data.start)}`
      : draft.data.due
        ? `bis ${shortDate(draft.data.due)}`
        : draft.data.date
          ? shortDate(draft.data.date)
          : "für heute";
  const extra = [repeatLabel(d.repeat, draft.typ === "termin" ? draft.data.date : draft.data.date), d.reminder !== "aus" ? `Erinnerung ${REMINDERS.find((r) => r.value === d.reminder)?.short}` : "", draft.raum === "arbeit" ? "Arbeit" : ""].filter(Boolean);
  return [when, d.title, ...extra].join(" · ");
}

/** Nächstes Vorkommen eines Eintrags ab heute (für "Verschieb …", "… ist erledigt") */
function nextItem(entries: CalendarEntry[], entry: CalendarEntry, today: string): DayItem | null {
  for (let i = 0; i < 60; i++) {
    const date = addDays(today, i);
    const item = itemsForDay(entries, date, today).find((x) => x.entry.id === entry.id && !x.done);
    if (item) return item;
  }
  return null;
}

/** `abends`: die Startseite steht schon auf morgen – „Was steht morgen an?“ nennt das Mitgewanderte mit */
export function calendarChat(text: string, entries: CalendarEntry[], today: string, persons: { id: string; name: string }[], abends = false): CalendarChatReply | null {
  const cmd = parseCalendar(text, today, persons);
  if (!cmd) return null;
  switch (cmd.kind) {
    case "show":
      return { text: showAnswer(entries, today, cmd.from, cmd.days, cmd.label, abends) };
    case "free":
      return { text: freeAnswer(entries, today, cmd.date, cmd.from, cmd.to, cmd.label) };
    case "create": {
      const draft = cmd.draft;
      const entry = createEntry(draft.typ, draft.data, { raum: draft.raum }) as CalendarEntry;
      return { text: `Eingetragen ✓ ${draftSummary(draft)}`, change: (list) => upsertEntry(list, entry) };
    }
    default: {
      const found = findByTitle(entries, cmd.query);
      const entry = found.find((e) => nextItem(entries, e, today)) ?? found[0];
      if (!entry) return { text: "Den Eintrag finde ich gerade nicht – wie heißt er genau?" };
      const item = nextItem(entries, entry, today);
      const title = entry.data.title;
      if (cmd.kind === "delete") {
        return { text: `Gelöscht ✓ ${title}${entry.data.repeat && item ? ` am ${shortDate(item.date)}` : ""}`, change: (list, stamp) => removeItem(list, entry.id, stamp, entry.data.repeat ? item?.date : undefined) };
      }
      if (!item) return { text: `${title} steht gerade nirgends an.` };
      if (cmd.kind === "done") return { text: `Erledigt ✓ ${title}`, change: (list, stamp) => setDone(list, item, true, stamp) };
      return {
        text: `Verschoben ✓ ${title} → ${shortDate(cmd.to)}${cmd.time ? ` · ${clockLabel(cmd.time)}` : item.time ? ` · ${clockLabel(item.time)}` : ""}`,
        change: (list, stamp) => moveItem(list, item, cmd.to, stamp, cmd.time),
      };
    }
  }
}
