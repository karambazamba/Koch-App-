"use client";

// „Dein Tag“ (Tafel 67/68, Reihenfolge angepasst): die Jetzt-Karte öffnet wie
// jede Kachel per Antippen diese Seite – alles von heute in vier ruhigen
// Abschnitten: TERMINE nach Uhrzeit (mit „Jetzt“-Linie, Vorbei grau ✓),
// ESSEN, neue PINNWAND-Nachrichten von heute, AUFGABEN zum Abhaken. Das Thema
// der Karte ist dort hervorgehoben. Hier: Themen-Symbol je Thema (EINE
// Stelle), wohin ein Thema gehört, die Termin-Zeilen, Mias 2-Satz-Übersicht
// und das Öffnen-Ereignis. Rein, bis auf das Ereignis.

import type { DayItem } from "@/lib/kalender/model";
import type { JetztKind, JetztTopic } from "@/lib/heute/jetztTopics";

/** Linien-Symbol (lucide) je Thema – statt Mias Gesicht in der Jetzt-Karte; passend zum Thema, nie Glitzer (A-054) */
export type TopicIcon = "Clock" | "CloudRain" | "CookingPot" | "Gift" | "Heart" | "Timer" | "Sunrise" | "CalendarDays" | "Bell" | "Mail" | "MapPin" | "Lightbulb" | "Wind";

const ICONS: Record<JetztKind, TopicIcon> = {
  beispiel: "CalendarDays",
  erinnerung: "Bell",
  gleich: "Clock",
  wetter: "CloudRain",
  essen: "CookingPot",
  vorlauf: "CookingPot",
  geburtstag: "Gift",
  jahrestag: "Heart",
  familie: "Bell",
  timer: "Timer",
  kochen: "CookingPot",
  pause: "Sunrise",
  wochenende: "CalendarDays",
  morgen: "Sunrise",
  durchatmen: "Wind",
  mail: "Mail",
  region: "MapPin",
  spendentopf: "Heart",
  freizeit: "Sunrise",
  tipp: "Lightbulb",
};

export const topicIcon = (kind: JetztKind): TopicIcon => ICONS[kind];

export type DaySection = "termine" | "essen" | "pinnwand" | "aufgaben";

/** Wohin ein Thema auf „Dein Tag“ gehört (Abschnitt + Eintrag, falls bekannt) – null = oben */
export function topicSpot(topic: Pick<JetztTopic, "id" | "kind">): { section: DaySection; key: string | null } | null {
  const key = topic.id.includes(":") ? topic.id.slice(topic.id.indexOf(":") + 1) : null;
  switch (topic.kind) {
    case "gleich":
    case "wetter":
    case "geburtstag":
    case "jahrestag":
    case "morgen":
      return { section: "termine", key };
    case "essen":
    case "vorlauf":
    case "kochen":
      return { section: "essen", key: null };
    case "erinnerung":
      return { section: "aufgaben", key };
    default:
      return null;
  }
}

/** Abend-Thema über morgen (Tafel 98): „Dein Tag“ öffnet gleich auf „Morgen · Mi“ */
export const zeigtMorgen = (topic: Pick<JetztTopic, "target"> | null, tomorrowIso: string) => Boolean(topic?.target && "href" in topic.target && topic.target.href === `/tag?datum=${tomorrowIso}`);

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

export type TerminRow = { item: DayItem; past: boolean };

/**
 * Termine von heute nach Uhrzeit (ganztägig zuerst); vorbei = Ende bzw.
 * Beginn + 1 Std. liegt hinter jetzt oder abgehakt. `nowAt` = vor welcher
 * Zeile die „Jetzt“-Linie steht (Länge = am Ende).
 */
export function terminRows(items: DayItem[], minutes: number): { rows: TerminRow[]; nowAt: number } {
  const termine = items.filter((i) => i.entry.typ === "termin");
  const allDay = termine.filter((i) => !i.time);
  const timed = termine.filter((i) => i.time).sort((a, b) => toMin(a.time!) - toMin(b.time!));
  const rows: TerminRow[] = [
    ...allDay.map((item) => ({ item, past: item.done })),
    ...timed.map((item) => ({ item, past: item.done || (item.end ? toMin(item.end) : toMin(item.time!) + 60) <= minutes })),
  ];
  const firstLater = rows.findIndex((r, n) => n >= allDay.length && !r.past);
  return { rows, nowAt: firstLater < 0 ? rows.length : Math.max(firstLater, allDay.length) };
}

/** „Was steht heute an?“, „Wie sieht mein Tag aus?“, „Mein Tag“ → „Dein Tag“ öffnen */
export const isDayQuestion = (text: string) =>
  /^(was\s+steht\s+heute(\s+noch)?\s+an|wie\s+sieht\s+mein\s+tag(\s+heute)?\s+aus|was\s+hab(e)?\s+ich\s+heute(\s+noch)?(\s+vor)?|zeig\s+mir\s+meinen\s+tag|mein\s+tag)\s*[?!.]*$/i.test(text.trim());

const joinList = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);
const clock = (t: string) => t.replace(/^0(\d)/, "$1");

/** Mias Übersicht in höchstens 2 Sätzen – ruhig, ohne Zähler-Druck */
export function daySummary(x: { termine: DayItem[]; tasks: DayItem[]; dish: string | null; minutes: number }): string {
  const coming = x.termine.filter((i) => !i.done && (!i.time || toMin(i.time) + 60 > x.minutes));
  const first = coming.length
    ? `Heute kommt ${joinList(coming.slice(0, 3).map((i) => (i.time ? `${clock(i.time)} ${i.title}` : i.title)))}${coming.length > 3 ? " und mehr" : ""}.`
    : "Heute stehen keine Termine mehr an.";
  const tasks = x.tasks.filter((i) => !i.done);
  const second = x.dish
    ? `Zum Essen gibt’s ${x.dish}${tasks.length ? `, dazu ${tasks.length === 1 ? `„${tasks[0].title}“` : "ein paar Aufgaben"}` : ""}.`
    : tasks.length
      ? `Dazu ${tasks.length === 1 ? `„${tasks[0].title}“` : "ein paar Aufgaben"} – alles unten in „Dein Tag“.`
      : "Sonst ist alles ruhig.";
  return `${first} ${second}`;
}

// --- Öffnen ----------------------------------------------------------------------

const EVENT = "mia:dein-tag";
let pending: { topic: string | null } | null = null;
let listening = 0;

/** „Dein Tag“ öffnen (von der Jetzt-Karte mit Thema, von Mia ohne) */
export function openDeinTag(topic: string | null = null) {
  if (!listening) {
    pending = { topic };
    return;
  }
  window.dispatchEvent(new CustomEvent<{ topic: string | null }>(EVENT, { detail: { topic } }));
}

export function onOpenDeinTag(listener: (topic: string | null) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<{ topic: string | null }>).detail.topic);
  window.addEventListener(EVENT, handler);
  listening++;
  if (pending) {
    const p = pending;
    pending = null;
    listener(p.topic);
  }
  return () => {
    window.removeEventListener(EVENT, handler);
    listening--;
  };
}
