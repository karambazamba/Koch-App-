// Ein Satz genügt (Tafel 26): Tag und Uhrzeit aus Tippen oder Sprechen
// erkennen („Mittwoch 12.30 Zahnarzt“, „28.10. Zahnarzt“, „halb eins“,
// „viertel nach 3“, „um 4“, „in 3 Tagen“ …) – mit den Stellen im Text (für
// die orange Hinterlegung) und dem Titel ohne diese Wörter. Rein, damit
// Termin-Fenster, Wochencheck und Tests gleich rechnen.

import { addDays } from "@/lib/core/now";
import { weekdayIndex } from "@/lib/kalender/model";

type Span = { start: number; end: number };
export type Sentence = { date?: string; time?: string; title: string; spans: Span[] };

const WEEKDAYS = ["montag", "dienstag", "mittwoch", "donnerstag", "freitag", "samstag", "sonntag"];
const MONTHS = ["januar", "februar", "märz", "april", "mai", "juni", "juli", "august", "september", "oktober", "november", "dezember"];
const HOUR_WORDS = ["eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun", "zehn", "elf", "zwölf"];
const NUM_WORDS: Record<string, number> = { einem: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10 };

// Wortgrenzen ohne \b (dort gibt es an ä/ö/ü/ß keine)
const B = "(?<![a-zäöüß0-9])";
const E = "(?![a-zäöüß0-9])";
const WD = `(${WEEKDAYS.join("|")})`;
const HW = `(\\d{1,2}|${HOUR_WORDS.join("|")})`;

const pad = (n: number) => String(n).padStart(2, "0");
const hourOf = (w: string) => (/^\d/.test(w) ? Number(w) : HOUR_WORDS.indexOf(w) + 1);

/** Tagsüber plausibel: 1–7 Uhr ohne „früh/morgens“ meint nachmittags/abends */
const plausible = (h: number, early: boolean) => (!early && h >= 1 && h <= 7 ? h + 12 : h);

function nextWeekday(today: string, index: number, next: boolean): string {
  let diff = (index - weekdayIndex(today) + 7) % 7;
  if (diff === 0 && next) diff = 7;
  return addDays(today, diff);
}

/** ISO-Datum aus Tag/Monat(/Jahr); ohne Jahr und schon vorbei = nächstes Jahr; ungültig = null */
function dayMonth(d: number, m: number, y: number | null, today: string): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const year = y ?? Number(today.slice(0, 4));
  const iso = `${year}-${pad(m)}-${pad(d)}`;
  if (new Date(`${iso}T12:00:00Z`).getUTCDate() !== d) return null;
  return y === null && iso < today ? `${year + 1}-${iso.slice(5)}` : iso;
}

type Hit = { value: string; start: number; end: number };

function find(t: string, re: RegExp, value: (m: RegExpExecArray) => string | null): Hit | null {
  const g = new RegExp(re.source, "g");
  for (let m = g.exec(t); m; m = g.exec(t)) {
    const v = value(m);
    if (v) return { value: v, start: m.index, end: m.index + m[0].length };
  }
  return null;
}

function findDay(t: string, today: string): Hit | null {
  return (
    find(t, new RegExp(`${B}übermorgen${E}`), () => addDays(today, 2)) ??
    find(t, new RegExp(`${B}morgen${E}`), (m) => (/guten\s+$/.test(t.slice(0, m.index)) ? null : addDays(today, 1))) ??
    find(t, new RegExp(`${B}heute${E}`), () => today) ??
    find(t, new RegExp(`${B}in\\s+(\\d{1,2}|${Object.keys(NUM_WORDS).join("|")})\\s+tag(?:en)?${E}`), (m) => addDays(today, Number(m[1]) || NUM_WORDS[m[1]])) ??
    find(t, new RegExp(`${B}(?:am\\s+)?(\\d{1,2})\\.(\\d{1,2})\\.(\\d{4}|\\d{2})?(?![\\d])`), (m) => dayMonth(Number(m[1]), Number(m[2]), m[3] ? (m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])) : null, today)) ??
    // „28.10“ ohne Punkt am Ende – nur, wenn es keine Uhrzeit sein kann (12.30 bleibt 12:30)
    find(t, new RegExp(`${B}(?:am\\s+)?(\\d{1,2})\\.(\\d{1,2})(?![.\\d:])`), (m) => (Number(m[1]) < 24 && m[2].length === 2 && Number(m[2]) < 60 ? null : dayMonth(Number(m[1]), Number(m[2]), null, today))) ??
    find(t, new RegExp(`${B}(?:am\\s+)?(\\d{1,2})\\.?\\s*(${MONTHS.join("|")})(?:\\s+(\\d{4}))?${E}`), (m) => dayMonth(Number(m[1]), MONTHS.indexOf(m[2]) + 1, m[3] ? Number(m[3]) : null, today)) ??
    find(t, new RegExp(`${B}(?:am\\s+)?(?:nächsten|kommenden)\\s+${WD}${E}`), (m) => nextWeekday(today, WEEKDAYS.indexOf(m[1]), true)) ??
    find(t, new RegExp(`${B}(?:am\\s+)?${WD}${E}`), (m) => nextWeekday(today, WEEKDAYS.indexOf(m[1]), false)) ??
    find(t, new RegExp(`${B}nächste\\s+woche${E}`), () => nextWeekday(today, 0, true))
  );
}

function findClock(t: string): Hit | null {
  const early = new RegExp(`${B}(früh|morgens|vormittags?)${E}`).test(t);
  const evening = new RegExp(`${B}(abends?|nachmittags?)${E}`).test(t);
  const fix = (h: number) => (evening && h < 12 ? h + 12 : plausible(h, early));
  const ok = (h: number, m: number) => h >= 0 && h < 24 && m >= 0 && m < 60;
  return (
    // halb eins → 12:30 (halb X = X−1:30)
    find(t, new RegExp(`${B}(?:um\\s+)?halb\\s+${HW}${E}`), (m) => {
      const h = hourOf(m[1]) - 1;
      return h >= 0 && h < 24 ? `${pad(h === 0 ? 12 : fix(h) % 24)}:30` : null;
    }) ??
    find(t, new RegExp(`${B}(?:um\\s+)?viertel\\s+nach\\s+${HW}${E}`), (m) => (hourOf(m[1]) < 24 ? `${pad(fix(hourOf(m[1])) % 24)}:15` : null)) ??
    find(t, new RegExp(`${B}(?:um\\s+)?viertel\\s+vor\\s+${HW}${E}`), (m) => {
      const h = hourOf(m[1]) - 1;
      return h >= 0 && h < 24 ? `${pad(fix(h === 0 ? 12 : h) % 24)}:45` : null;
    }) ??
    // 12 Uhr 30
    find(t, new RegExp(`${B}(?:um\\s+)?(\\d{1,2})\\s*uhr\\s+(\\d{1,2})${E}`), (m) => (ok(Number(m[1]), Number(m[2])) ? `${pad(fix(Number(m[1])))}:${pad(Number(m[2]))}` : null)) ??
    // 12:30 / 12.30 (kein Datum wie 28.10.)
    find(t, new RegExp(`${B}(?:um\\s+)?(\\d{1,2})[:.](\\d{2})(?![.\\d])(?:\\s*uhr${E})?`), (m) => (ok(Number(m[1]), Number(m[2])) ? `${pad(fix(Number(m[1])))}:${m[2]}` : null)) ??
    find(t, new RegExp(`${B}(?:um\\s+)?(\\d{1,2})\\s*uhr${E}`), (m) => (ok(Number(m[1]), 0) ? `${pad(fix(Number(m[1])))}:00` : null)) ??
    find(t, new RegExp(`${B}um\\s+(\\d{1,2})${E}(?![.:]\\d)`), (m) => (ok(Number(m[1]), 0) ? `${pad(fix(Number(m[1])))}:00` : null)) ??
    find(t, new RegExp(`${B}(mittags?|abends?)${E}`), (m) => (m[1].startsWith("mittag") ? "12:00" : "19:00"))
  );
}

/** Tag und Uhrzeit aus einem Satz – und der Titel ohne die erkannten Wörter */
export function readSentence(text: string, today: string): Sentence {
  const t = text.toLowerCase();
  const day = findDay(t, today);
  // Uhrzeit nicht im Datum suchen („28.10.“ ist kein 28:10)
  const masked = day ? t.slice(0, day.start) + " ".repeat(day.end - day.start) + t.slice(day.end) : t;
  const clock = findClock(masked);
  const spans = [day, clock].filter((h): h is Hit => Boolean(h)).map(({ start, end }) => ({ start, end })).sort((a, b) => a.start - b.start);
  let title = text;
  for (const s of [...spans].reverse()) title = title.slice(0, s.start) + " " + title.slice(s.end);
  title = title
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:am|um|ab|,|-|–)\s+/i, "")
    .replace(/\s+(?:am|um|ab)\s*$/i, "")
    .replace(/^[\s,.–-]+|[\s,–-]+$/g, "")
    .trim();
  return { ...(day ? { date: day.value } : {}), ...(clock ? { time: clock.value } : {}), title, spans };
}

/** Uhrzeit überall gleich: „19:30“, „18:00“ (nie „19“ oder „18“) */
export const timeLabel = (hhmm: string) => (/^\d{1,2}:\d{2}$/.test(hhmm) ? `${Number(hhmm.split(":")[0])}:${hhmm.split(":")[1]}` : hhmm);

/** Vorschläge ohne Uhrzeit: heute ab der nächsten halben Stunde, sonst 08:00 / 12:00 / 15:00 / 19:30 */
export function timeSuggestions(date: string, today: string, nowMinutes: number, count = 4): string[] {
  if (date !== today) return ["08:00", "12:00", "15:00", "19:30"].slice(0, count);
  const out: string[] = [];
  for (let m = Math.ceil((nowMinutes + 1) / 30) * 30; m < 22 * 60 && out.length < count; m += m < 17 * 60 ? 60 : 30) out.push(`${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  return out;
}

/** Heute schon vorbei? (nie still in der Vergangenheit speichern) */
export const isPast = (date: string, time: string | null | undefined, today: string, nowMinutes: number) => Boolean(time) && date === today && Number(time!.slice(0, 2)) * 60 + Number(time!.slice(3, 5)) < nowMinutes;
