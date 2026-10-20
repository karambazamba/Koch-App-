// Kurze Antworten zu Terminen und Aufgaben – ohne KI (lokaler Chat, Testmodus)
// und als Text für Lottes Kontext. Ruhig formuliert: keine Zähler, nichts
// "Offenes", nur was ansteht.

import { addDays } from "../core/now";
import { itemsForDay, weekdayShort, type CalendarEntry, type DayItem } from "./model";

/** "9:00" statt "09:00" (zum Vorlesen und Anzeigen) */
export const clockLabel = (time: string) => time.replace(/^0(\d)/, "$1");

/** "9:00 Steuerberater" bzw. "Kita-Formular (bis Mi)" */
export function itemText(item: DayItem): string {
  const time = item.time ? `${clockLabel(item.time)} ` : "";
  const due = item.dueLabel ? ` (${item.dueLabel})` : "";
  return `${time}${item.title}${due}`;
}

const joinList = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);

/** Antwort auf "Was steht heute/morgen/diese Woche an?" */
export function showAnswer(entries: CalendarEntry[], today: string, from: string, days: number, label: string): string {
  if (days <= 1) {
    const items = itemsForDay(entries, from, today).filter((i) => !i.done);
    if (!items.length) return `${capital(label)} steht nichts an – ein freier Tag.`;
    return `${capital(label)}: ${joinList(items.map(itemText))}.`;
  }
  const busy = Array.from({ length: days }, (_, i) => addDays(from, i))
    .map((date) => ({ date, items: itemsForDay(entries, date, today).filter((i) => !i.done) }))
    .filter((d) => d.items.length);
  if (!busy.length) return `${capital(label)} ist noch alles frei.`;
  const lines = busy.slice(0, 5).map((d) => `${weekdayShort(d.date)}: ${joinList(d.items.slice(0, 3).map(itemText))}`);
  return `${capital(label)}: ${lines.join(". ")}.${busy.length > 5 ? " Und ein paar Sachen mehr – schau gern in die Woche." : ""}`;
}

const minutes = (clock: string) => {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
};

/** Antwort auf "Hab ich morgen Nachmittag Zeit?" (Termine im Zeitraum; Termine ohne Ende zählen 1 Stunde) */
export function freeAnswer(entries: CalendarEntry[], today: string, date: string, from: string, to: string, label: string): string {
  const start = minutes(from);
  const end = minutes(to);
  const busy = itemsForDay(entries, date, today).filter((i) => {
    if (i.done || !i.time || i.entry.typ !== "termin") return false;
    const s = minutes(i.time);
    const e = i.end ? minutes(i.end) : s + 60;
    return s < end && e > start;
  });
  if (!busy.length) return `Ja, ${label} ist frei.`;
  return `${capital(label)} hast du ${joinList(busy.map(itemText))}${busy.length === 1 ? " – davor und danach ist Luft" : ""}.`;
}

const capital = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Kompakte Liste für Lottes Kontext: je Tag Einträge mit ID, Art, Raum, Etikett, Erinnerung */
export function contextLines(entries: CalendarEntry[], today: string, days = 7, from = today): string {
  const range = Array.from({ length: days }, (_, i) => addDays(from, i)).map((date) => ({ date, items: itemsForDay(entries, date, today) }));
  const lines = range.map(({ date, items }) => {
    const list = items.map((i) => {
      const meta = [
        i.entry.typ,
        i.room,
        i.label ? `Etikett ${i.label}` : "",
        i.end ? `bis ${i.end}` : "",
        i.reminder !== "aus" ? `Erinnerung ${i.reminder}` : "",
        i.repeat ? "wiederkehrend" : "",
        i.carried ? i.carried : "",
        i.dueLabel ?? "",
        i.done ? "erledigt" : "",
      ].filter(Boolean);
      return `${i.time ? `${i.time} ` : ""}${i.title} [id=${i.entry.id}; ${meta.join(", ")}]`;
    });
    return `- ${weekdayShort(date)} ${date}: ${list.length ? list.join(" | ") : "frei"}`;
  });
  return lines.join("\n");
}
