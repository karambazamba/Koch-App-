// Termine und Aufgaben im Chat ohne KI: Satz erkennen (parse.ts), Antwort
// formulieren und – bei Änderungen – die reine Änderung liefern, die der
// Chat sofort mit "Rückgängig" anwendet.

import { addDays } from "@/lib/core/now";
import { createEntry } from "@/lib/core/entries";
import { clockLabel, freeAnswer, showAnswer } from "@/lib/kalender/answers";
import { findByTitle, itemsForDay, moveItem, removeItem, REMINDERS, repeatLabel, setDone, setRoom, upsertEntry, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { parseCalendar, type Draft } from "@/lib/kalender/parse";
import type { Room } from "@/lib/core/entries";
import type { RaumHilfen } from "@/lib/kalender/raum/raten";
import { isAboEntry } from "@/lib/kalender/abo/model";
import { darfRaumAendern } from "@/lib/kalender/abgeben/model";

type CalendarChatReply = {
  text: string;
  /** Änderung (rein), falls etwas eingetragen/geändert wird */
  change?: (entries: CalendarEntry[], stamp: string) => CalendarEntry[];
  /** Neu eingetragen: Raum zum Ändern unter Mias Bestätigung („Steht drin. Familie ⌄“, A-034) */
  neu?: { id: string; title: string; raum: Room; typ: "termin" | "aufgabe" };
  /** Raum per Satz geändert: Mia lernt das Stichwort */
  gelernt?: { title: string; raum: Room };
};

/** Kurz nach dem Raum-Wechsel per Satz */
const RAUM_SATZ: Record<Room, string> = { familie: "Sehen jetzt alle.", ich: "Nur für dich.", arbeit: "Steht bei Arbeit." };

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
  const extra = [repeatLabel(d.repeat, draft.typ === "termin" ? draft.data.date : draft.data.date), d.reminder !== "aus" ? `Erinnerung ${REMINDERS.find((r) => r.value === d.reminder)?.short}` : ""].filter(Boolean);
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

/** `abends`: die Startseite steht schon auf morgen – „Was steht morgen an?“ nennt das Mitgewanderte mit; `ohneArbeit`: Feierabend, „Was steht heute an?“ ohne Arbeit */
export function calendarChat(text: string, entries: CalendarEntry[], today: string, persons: { id: string; name: string }[], abends = false, ohneArbeit = false, hilfen: RaumHilfen = {}, me: string | null = null): CalendarChatReply | null {
  const cmd = parseCalendar(text, today, persons, hilfen);
  if (!cmd) return null;
  switch (cmd.kind) {
    case "show":
      return { text: showAnswer(entries, today, cmd.from, cmd.days, cmd.label, abends, ohneArbeit) };
    case "free":
      return { text: freeAnswer(entries, today, cmd.date, cmd.from, cmd.to, cmd.label) };
    case "create": {
      const draft = cmd.draft;
      const entry = createEntry(draft.typ, draft.data, { raum: draft.raum }) as CalendarEntry;
      return { text: `Eingetragen ✓ ${draftSummary(draft)}`, change: (list) => upsertEntry(list, entry), neu: { id: entry.id, title: entry.data.title, raum: entry.raum, typ: entry.typ } };
    }
    case "raum": {
      // „das“ = das zuletzt Eingetragene; nicht gefunden: kein Raum-Befehl (andere Regeln oder die KI)
      // Nur eigene (nie Kalender-Links, nie fremde Familien-Aufgaben)
      const eigene = entries.filter((e) => !isAboEntry(e) && darfRaumAendern(e, me));
      const zuletzt = [...eigene].sort((a, b) => b.erstellt.localeCompare(a.erstellt))[0];
      const entry = /^(das|den|die|es|ihn|sie)$/i.test(cmd.query) ? zuletzt : findByTitle(eigene, cmd.query)[0];
      if (!entry) return null;
      return { text: RAUM_SATZ[cmd.raum], change: (list, stamp) => setRoom(list, entry.id, cmd.raum, stamp), gelernt: { title: entry.data.title, raum: cmd.raum } };
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
