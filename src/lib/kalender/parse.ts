// Termine und Aufgaben aus normalen Sätzen erkennen – ohne KI (für den
// Testmodus und wenn die KI gerade nicht da ist). Erkennt Tag ("morgen",
// "Donnerstag", "am 24.10."), Uhrzeit ("um 9", "14:30 Uhr", "nachmittags"),
// Frist ("bis Mittwoch"), Wiederholung ("jeden Dienstag", "täglich"),
// Erinnerung ("erinner mich 30 Minuten vorher", "am Vorabend"), Raum
// (Arbeit/Familie) und Etikett (Kita, Arzt, Café …). Termin = feste
// Uhrzeit, sonst Aufgabe. Dazu Befehle: verschieben, löschen, erledigt,
// anzeigen, "Hab ich … Zeit?". Rein, damit App und Server gleich rechnen.

import type { Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import { weekdayIndex, type AufgabeData, type Reminder, type Repeat, type TerminData } from "@/lib/kalender/model";

const WEEKDAYS = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"];
const WD = "(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)";
const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const NUMBERS: Record<string, number> = { eine: 1, einer: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, zehn: 10, fünfzehn: 15, zwanzig: 20, dreißig: 30, halbe: 30 };

export type Draft =
  | { typ: "termin"; raum: Room; data: TerminData }
  | { typ: "aufgabe"; raum: Room; data: AufgabeData };

type CalendarCommand =
  | { kind: "create"; draft: Draft }
  | { kind: "move"; query: string; to: string; time?: string }
  | { kind: "delete"; query: string }
  | { kind: "done"; query: string }
  | { kind: "show"; from: string; days: number; label: string }
  | { kind: "free"; date: string; from: string; to: string; label: string };

type Person = { id: string; name: string };

/** Nächster Tag mit diesem Wochentag ab heute (heute selbst zählt, außer `next`) */
function nextWeekday(today: string, index: number, next = false): string {
  let diff = (index - weekdayIndex(today) + 7) % 7;
  if (diff === 0 && next) diff = 7;
  return addDays(today, diff);
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Tag aus dem Text (erster Treffer) */
export function findDate(text: string, today: string): { date: string; match: string } | null {
  const t = text.toLowerCase();
  let m = t.match(/\bübermorgen\b/);
  if (m) return { date: addDays(today, 2), match: m[0] };
  m = t.match(/\bmorgen(?:\s+(?:früh|vormittag|nachmittag|mittag|abend))?\b/);
  if (m && !/\bguten morgen\b/.test(t)) return { date: addDays(today, 1), match: "morgen" };
  m = t.match(/\bheute\b/);
  if (m) return { date: today, match: m[0] };
  m = t.match(/\bin (\d+|zwei|drei|vier|fünf) tagen\b/);
  if (m) return { date: addDays(today, Number(m[1]) || NUMBERS[m[1]] || 1), match: m[0] };
  m = t.match(/\b(?:am\s+)?(\d{1,2})\.\s?(\d{1,2})\.(?:(\d{2,4}))?/);
  if (m) {
    const y = m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : Number(today.slice(0, 4));
    let iso = `${y}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    if (!m[3] && iso < today) iso = `${y + 1}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`;
    return { date: iso, match: m[0] };
  }
  m = t.match(new RegExp(`\\b(?:am\\s+)?(\\d{1,2})\\.\\s*(${MONTHS.join("|")})\\b`));
  if (m) {
    const y = Number(today.slice(0, 4));
    let iso = `${y}-${pad(MONTHS.indexOf(m[2]) + 1)}-${pad(Number(m[1]))}`;
    if (iso < today) iso = `${y + 1}-${iso.slice(5)}`;
    return { date: iso, match: m[0] };
  }
  m = t.match(new RegExp(`\\b(nächsten|kommenden)\\s+${WD}\\b`));
  if (m) return { date: nextWeekday(today, WEEKDAYS.indexOf(m[2]), true), match: m[0] };
  m = t.match(new RegExp(`\\b(?:am\\s+|ab\\s+)?${WD}\\b`));
  if (m) return { date: nextWeekday(today, WEEKDAYS.indexOf(m[1])), match: m[0] };
  m = t.match(/\bnächste woche\b/);
  if (m) return { date: nextWeekday(today, 0, true), match: m[0] };
  return null;
}

/** Uhrzeit aus dem Text: "um 9", "um 9:30", "14 Uhr", "halb drei", Tageszeit */
function findTime(text: string): { time: string; match: string; vague: boolean } | null {
  const t = text.toLowerCase();
  const evening = /\b(abends|abend|nachmittags|nachmittag)\b/.test(t);
  const fix = (h: number) => (h >= 1 && h <= 7 && !/\b(früh|morgens)\b/.test(t)) || (evening && h < 12) ? h + 12 : h;
  let m = t.match(/\bum\s+halb\s+(\d{1,2}|eins|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf)\b/);
  if (m) {
    const words = ["eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
    const h = Number(m[1]) || words.indexOf(m[1]) + 1;
    return { time: `${pad(fix(h - 1 === 0 ? 12 : h - 1) % 24)}:30`, match: m[0], vague: false };
  }
  m = t.match(/\b(?:um\s+)?(\d{1,2})[:.](\d{2})(?:\s*uhr)?\b/);
  if (m && Number(m[1]) < 24 && Number(m[2]) < 60 && !/\d{1,2}\.\d{1,2}\./.test(m[0] + ".")) return { time: `${pad(fix(Number(m[1])))}:${m[2]}`, match: m[0], vague: false };
  m = t.match(/\bum\s+(\d{1,2})(?:\s*uhr)?\b/) ?? t.match(/\b(\d{1,2})\s*uhr\b/);
  if (m && Number(m[1]) < 24) return { time: `${pad(fix(Number(m[1])))}:00`, match: m[0], vague: false };
  m = t.match(/\b(früh|morgens|vormittags?|mittags?|nachmittags?|abends?)\b/);
  if (m) {
    const map: Record<string, string> = { früh: "08:00", morgens: "08:00", vormittag: "10:00", vormittags: "10:00", mittag: "12:00", mittags: "12:00", nachmittag: "15:00", nachmittags: "15:00", abend: "19:00", abends: "19:00" };
    return { time: map[m[1]], match: m[0], vague: true };
  }
  return null;
}

function findRepeat(text: string): { repeat: Repeat; match: string } | null {
  const t = text.toLowerCase();
  let m = t.match(/\b(jeden tag|täglich|jeden morgen|jeden abend)\b/);
  if (m) return { repeat: { kind: "taeglich" }, match: m[1] };
  m = t.match(/\b(jede woche|wöchentlich)\b/);
  if (m) return { repeat: { kind: "woechentlich" }, match: m[1] };
  m = t.match(/\b(jeden monat|monatlich)\b/);
  if (m) return { repeat: { kind: "monatlich" }, match: m[1] };
  m = t.match(new RegExp(`\\bjeden\\s+${WD}(?:\\s*(?:und|,)\\s*${WD})?\\b`));
  if (m) return { repeat: { kind: "wochentage", days: [WEEKDAYS.indexOf(m[1]), ...(m[2] ? [WEEKDAYS.indexOf(m[2])] : [])].sort() }, match: m[0] };
  m = t.match(/\b(montags|dienstags|mittwochs|donnerstags|freitags|samstags|sonntags)\b/);
  if (m) return { repeat: { kind: "wochentage", days: [WEEKDAYS.indexOf(m[1].slice(0, -1))] }, match: m[1] };
  return null;
}

/** Zeitraum für Aufgaben: "diese Woche" / "nächste Woche" → Montag der Woche */
function findPeriod(text: string, today: string): { week: string; match: string } | null {
  const m = text.toLowerCase().match(/\b(?:(?:in\s+)?(diese[rn]?|nächste[rn]?|kommende[rn]?)\s+woche|die\s+woche\s+(?:über|noch))\b/);
  if (!m) return null;
  const monday = addDays(today, -weekdayIndex(today));
  return { week: m[1] && !/^dies/.test(m[1]) ? addDays(monday, 7) : monday, match: m[0] };
}

function findDeadline(text: string, today: string): { due: string; match: string } | null {
  const t = text.toLowerCase();
  let m = t.match(/\bbis\s+(?:zum\s+)?ende\s+der\s+woche\b/);
  if (m) return { due: nextWeekday(today, 6), match: m[0] };
  m = t.match(/\bbis\s+(?:zum\s+|spätestens\s+)?(.{1,24})/);
  if (!m) return null;
  const found = findDate(m[1], today);
  if (!found || m[1].indexOf(found.match.replace(/^am\s+/, "")) > 6) return null;
  return { due: found.date, match: `${m[0].slice(0, m[0].indexOf(m[1]))}${m[1].slice(0, m[1].indexOf(found.match) + found.match.length)}` };
}

function findReminder(text: string): { reminder: Reminder; match: string } | null {
  const t = text.toLowerCase();
  let m = t.match(/(?:,\s*)?\b(?:und\s+)?erinner\w*\s+(?:mich|uns)\s+(?:bitte\s+)?(\d+|eine|einer|halbe|zehn|fünfzehn|zwanzig|dreißig)\s*(minuten|min|stunden?)\s+(?:vorher|davor)/);
  if (m) {
    const n = Number(m[1]) || NUMBERS[m[1]] || 30;
    const minutes = /stunde/.test(m[2]) ? (m[1] === "halbe" ? 30 : n * 60) : n;
    const reminder: Reminder = minutes <= 15 ? "15" : minutes <= 30 ? "30" : "60";
    return { reminder, match: m[0] };
  }
  m = t.match(/(?:,\s*)?\b(?:und\s+)?(?:erinner\w*\s+(?:mich|uns)\s+)?(?:am\s+vorabend|am\s+abend\s+(?:vorher|davor))(?:\s+erinner\w*)?/);
  if (m) return { reminder: "vorabend", match: m[0] };
  return null;
}

const ARBEIT = /\b(meeting|büro|kunden?|präsentation|call|projekt\w*|chef\w*|kolleg\w*|arbeit|dienstreise|abgabe|teams|zoom|besprechung|bewerbung|team)\b/i;

const LABELS: [RegExp, string][] = [
  [/\bkita\b/i, "Kita"],
  [/\bschul\w*/i, "Schule"],
  [/\b(zahn)?ärzt\w*|\b(kinder|zahn|haus)?arzt\w*/i, "Arzt"],
  [/\bcafé|\bcafe\b|\bkaffee\b/i, "Café"],
  [/\beis(laden|diele|café)?\b/i, "Eisladen"],
  [/\b(turnen|schwimm\w*|fußball|training|sport)\b/i, "Sport"],
  [/\bsteuer\w*/i, "Steuern"],
  [/\bgeburtstag\w*/i, "Geburtstag"],
];

/** Etikett aus dem Titel (Kita, Arzt, Café …) */
export function guessLabel(title: string): string | undefined {
  return LABELS.find(([re]) => re.test(title))?.[1];
}

export function guessRoom(text: string): Room {
  return ARBEIT.test(text) ? "arbeit" : "familie";
}

const capitalize = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Titel = was übrig bleibt, ohne Füllwörter */
function cleanTitle(rest: string, persons: Person[]): { title: string; who: string[] } {
  let t = ` ${rest} `;
  const who: string[] = [];
  for (const p of persons) {
    if (!p.name.trim()) continue;
    const re = new RegExp(`\\b${p.name.trim()}s?\\b`, "i");
    // Der Name bleibt im Titel ("Jonne abholen"), nur `who` merkt sich die Person
    if (re.test(t)) who.push(p.id);
  }
  t = t
    .replace(/\b(erinner\w*\s+(?:mich|uns)\s*(?:bitte\s*)?(?:an|daran,?)?|trag\w*\s*(?:bitte\s*)?(?:ein)?|ich\s+(?:muss|möchte|will|sollte)|wir\s+(?:müssen|wollen)|bitte|noch|termin(?:\s+(?:beim|bei|mit|für))?|aufgabe:?|neue[rn]?|eintragen|eine?n?|um|am|ab|bis|im|in|den|dem|der|die|das|und|hat|habe|ich|wir|mal|dann|daran|dran|soll|erinner\w*)\b/gi, " ")
    .replace(/[,.!?;:]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\s+(mit|vom|zum|zur|beim|für)$/i, "");
  return { title: capitalize(t), who };
}

const QUESTION = /\?\s*$/;
const TODO_WORDS = /\b(erinner|termin|aufgabe|muss|müssen|nicht vergessen|trag)\w*/i;

/** Satz zu Termin/Aufgabe/Befehl – oder null, wenn es nicht danach klingt */
/** "Dringend: Steuerberater anrufen", "Steuerberater anrufen – ist wichtig" → Titel ohne das Wort, dringend */
export function urgentFrom(text: string): { text: string; urgent: boolean } {
  const t = text.trim();
  const pre = t.match(/^(?:❗\s*)?(?:dringend|wichtig|eilig)\s*[:!–-]\s*(.+)$/i);
  if (pre) return { text: pre[1].trim(), urgent: true };
  const post = t.match(/^(.+?)[\s,–-]+(?:ist\s+)?(?:(?:sehr|echt)\s+)?(?:dringend|wichtig|eilig)[.!]*$/i);
  if (post) return { text: post[1].trim(), urgent: true };
  return { text: t, urgent: false };
}

export function parseCalendar(text: string, today: string, persons: Person[] = []): CalendarCommand | null {
  const raw = text.trim();
  if (!raw) return null;
  const t = raw.toLowerCase();
  // Essen und Einkauf gehören nicht hierher
  if (/\bgibt['’]?s\b|\bkochen\b|\bessen\b|\beinkaufsliste\b|\bauf die liste\b|\bwir brauchen\b|\burlaub\b/i.test(t)) return null;
  // "Wir kommen erst um 19 Uhr heim" = schnelle Essensideen, kein Termin
  if (/\berst um \d{1,2}(:\d{2})?\s*(uhr\s*)?(heim|nach hause|zu hause)\b|\bspät (heim|nach hause|zu hause)\b|\bwas schnelles\b/i.test(t)) return null;

  // "Was steht diese Woche an?" / "Was hab ich morgen?"
  if (/\b(was steht|was hab(?:e)? ich|was haben wir|was ist|was liegt|zeig(?:\s+mir)?)\b.*\b(an|vor|los|termine|aufgaben|woche|heute|morgen|tag)\b/.test(t) && !/\bzeit\b|\bfrei\b/.test(t)) {
    if (/\bnächste woche\b/.test(t)) return { kind: "show", from: nextWeekday(today, 0, true), days: 7, label: "nächste Woche" };
    if (/\bwoche\b/.test(t)) return { kind: "show", from: today, days: 7, label: "diese Woche" };
    const d = findDate(raw, today);
    if (d) return { kind: "show", from: d.date, days: 1, label: d.date === today ? "heute" : d.date === addDays(today, 1) ? "morgen" : `am ${capitalize(d.match.replace(/^am\s+/, ""))}` };
    return { kind: "show", from: today, days: 1, label: "heute" };
  }
  // "Hab ich morgen Nachmittag Zeit?"
  if (/\b(hab(?:e)? ich|haben wir|bin ich|sind wir)\b.*\b(zeit|frei)\b/.test(t)) {
    const d = findDate(raw, today) ?? { date: today, match: "heute" };
    const part = t.match(/\b(vormittags?|nachmittags?|abends?|mittags?)\b/)?.[1] ?? t.match(/\b(früh|morgens)\b/)?.[1] ?? "";
    const ranges: Record<string, [string, string, string]> = {
      vormittag: ["08:00", "12:00", "Vormittag"],
      mittag: ["11:30", "14:00", "Mittag"],
      nachmittag: ["12:00", "18:00", "Nachmittag"],
      abend: ["18:00", "22:00", "Abend"],
      morgen: ["06:00", "10:00", "früh"],
      früh: ["06:00", "10:00", "früh"],
    };
    const key = part.replace(/s$/, "");
    const [from, to, partLabel] = ranges[key] ?? ["08:00", "20:00", ""];
    const dayLabel = d.date === today ? "heute" : d.date === addDays(today, 1) ? "morgen" : capitalize(d.match.replace(/^am\s+/, ""));
    return { kind: "free", date: d.date, from, to, label: `${dayLabel}${partLabel ? ` ${partLabel}` : ""}` };
  }
  // "Verschieb den Steuerberater auf Donnerstag"
  let m = raw.match(/^(?:bitte\s+)?(?:verschieb|verleg|schieb)\w*\s+(?:bitte\s+)?(.+?)\s+(?:auf|nach|zu)\s+(.+?)[.!]?$/i);
  if (m) {
    const target = findDate(m[2], today);
    const time = findTime(m[2]);
    if (target || time) return { kind: "move", query: m[1], to: target?.date ?? today, time: time && !time.vague ? time.time : undefined };
  }
  // "Lösch den Zahnarzt" / "Der Zahnarzt fällt aus"
  m = raw.match(/^(?:bitte\s+)?(?:lösch|streich|entfern)\w*\s+(?:bitte\s+)?(.+?)[.!]?$/i) ?? raw.match(/^(.+?)\s+fällt\s+aus[.!]?$/i);
  if (m) return { kind: "delete", query: m[1] };
  // "Kita-Formular ist erledigt" / "Hab den Müll erledigt"
  m = raw.match(/^(.+?)\s+(?:ist|sind)\s+(?:erledigt|gemacht|fertig)[.!]?$/i) ?? raw.match(/^(?:ich\s+)?hab\w*\s+(.+?)\s+(?:erledigt|gemacht)[.!]?$/i) ?? raw.match(/^erledigt:?\s+(.+?)[.!]?$/i);
  if (m) return { kind: "done", query: m[1] };

  if (QUESTION.test(raw)) return null;
  // Anlegen: braucht einen Hinweis auf Zeit, Tag, Frist, Wiederholung oder ein Merk-Wort ("Dringend: …" zählt)
  const urgent = urgentFrom(raw);
  let rest = urgent.text;
  const strip = (match: string) => {
    const at = rest.toLowerCase().indexOf(match.toLowerCase());
    if (at >= 0) rest = `${rest.slice(0, at)} ${rest.slice(at + match.length)}`;
  };
  const reminder = findReminder(rest);
  if (reminder) strip(reminder.match);
  const repeat = findRepeat(rest);
  if (repeat) strip(repeat.match);
  const deadline = findDeadline(rest, today);
  if (deadline) strip(deadline.match);
  // "Ich muss diese Woche noch die Reifen machen" → Aufgabe für diese Woche (ohne festen Tag)
  const period = !deadline ? findPeriod(rest, today) : null;
  if (period) strip(period.match);
  const date = findDate(rest, today);
  if (date) strip(date.match);
  const time = findTime(rest);
  if (time) strip(time.match);
  if (!reminder && !repeat && !deadline && !period && !date && !time && !urgent.urgent && !TODO_WORDS.test(t)) return null;
  const { title, who } = cleanTitle(rest, persons);
  if (title.length < 2) return null;
  const raum = guessRoom(raw);
  const label = guessLabel(raw);
  const start = date?.date ?? (repeat?.repeat.kind === "wochentage" ? nextWeekday(today, repeat.repeat.days[0]) : period && period.week > today ? period.week : today);
  // Termin = feste Uhrzeit (nicht nur "abends") und keine Frist
  if (time && !time.vague && !deadline) {
    return {
      kind: "create",
      draft: { typ: "termin", raum, data: { title, date: start, start: time.time, label, repeat: repeat?.repeat ?? null, reminder: reminder?.reminder ?? "aus", ...(who.length ? { who } : {}) } },
    };
  }
  return {
    kind: "create",
    draft: {
      typ: "aufgabe",
      raum,
      data: {
        title,
        ...(date || repeat ? { date: start } : {}),
        ...(deadline ? { due: deadline.due } : {}),
        ...(period && !date && !repeat ? { week: period.week } : {}),
        ...(time ? { time: time.time } : {}),
        label,
        repeat: repeat?.repeat ?? null,
        reminder: reminder?.reminder ?? (time && /erinner/i.test(t) ? "15" : "aus"),
        ...(urgent.urgent ? { dringend: true } : {}),
      },
    },
  };
}
