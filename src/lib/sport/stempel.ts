// Stempelkarte (A-044, Tafel 132, rein): die Woche Mo–So als Karte mit so
// vielen runden Feldern wie das Wochenziel (ohne Ziel 3). Jedes Training
// dieser Woche ist ein Stempel (Sportart, Tag „MO“, fest gedreht je
// Training), geplante Trainings stehen als gestrichelte Felder („Do 8:00“),
// mehr Trainings als Felder sind kleine Bonus-Stempel. Geschafft nur mit
// Ziel. Dazu zwei Sätze, „Letzte Wochen“ (3 Zeilen ohne Serien und Summen)
// und die Text-Bausteine für Mia (Bestätigung „Volleyball · heute ·
// gestempelt“, Lage „Mo war Laufen, Do ist geplant.“), damit eine spätere
// Ergebnis-Karte sie unverändert übernimmt.

import { addDays } from "@/lib/core/now";
import { clockLabel } from "@/lib/kalender/answers";
import { mondayOf, weekdayShort, type CalendarEntry, type DayItem } from "@/lib/kalender/model";
import { OHNE_ZIEL_FELDER, plannedOn, sportById, trainingsBetween, type SportState, type Training } from "@/lib/sport/model";
import { sportOfTitle } from "@/lib/sport/plan";

/** Ein Stempel = ein Training dieser Woche */
export type Stempel = { id: string; sport: string; label: string; date: string; tag: string; dreh: number };

/** Ein Feld der Karte: gestempelt, geplant (gestrichelt mit „Do 8:00“) oder frei (gestrichelt, leer) */
export type Feld =
  | { art: "stempel"; stempel: Stempel; training: Training }
  | { art: "geplant"; date: string; label: string; sport: string; item: DayItem }
  | { art: "frei" };

export type Stempelkarte = {
  monday: string;
  /** Wochenziel oder null (ohne Ziel) */
  ziel: number | null;
  felder: Feld[];
  /** Mehr Trainings als Felder: kleine Bonus-Stempel daneben */
  bonus: { stempel: Stempel; training: Training }[];
  /** Nur mit Ziel: so viele Trainings wie das Ziel (oder mehr) */
  geschafft: boolean;
  /** Großer Satz: „Mo war Laufen.“ / „Woche geschafft.“ / „Diese Woche ist noch frei.“ */
  satz: string;
  /** Kleiner Satz: „Do 8:00 ist geplant.“ / „Mehr ist Bonus.“ (oder nichts) */
  klein: string | null;
  /** Das letzte Training und das nächste geplante dieser Woche (für Mia) */
  zuletzt: Training | null;
  geplant: DayItem | null;
};

const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

/** Drehung eines Stempels: fest je Training (aus der ID), ganze Grad von −10 bis +10 */
export function stempelDrehung(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 21) - 10;
}

/** Tag in Großbuchstaben im Stempel: „MO“ */
const stempelTag = (date: string) => weekdayShort(date).toUpperCase();

/** Name der Sportart eines Trainings (aus einem Sport-Termin: dessen Titel, wenn die Sportart nicht erkannt ist) */
const trainingLabel = (t: Training) => (t.data.terminKey && t.data.note && sportOfTitle(t.data.note) === t.data.note ? t.data.note : sportById(t.data.sport).label);

function stempel(t: Training): Stempel {
  const sport = t.data.terminKey && t.data.note ? sportOfTitle(t.data.note) : t.data.sport;
  return { id: t.id, sport, label: trainingLabel(t), date: t.data.date, tag: stempelTag(t.data.date), dreh: stempelDrehung(t.id) };
}

/** „Do 8:00“ (heute: „Heute 8:00“), ohne Uhrzeit nur der Tag */
function geplantLabel(item: Pick<DayItem, "date" | "time">, today: string): string {
  const day = item.date === today ? "Heute" : weekdayShort(item.date);
  return `${day}${item.time ? ` ${clockLabel(item.time)}` : ""}`;
}

/** Geplante, noch nicht abgehakte Trainings von heute (was noch kommt) bis Sonntag */
function geplanteDerWoche(entries: CalendarEntry[], today: string, minutes: number, me: string | null | undefined, monday: string): DayItem[] {
  const out: DayItem[] = [];
  for (let d = today < monday ? monday : today; d <= addDays(monday, 6); d = addDays(d, 1)) {
    for (const item of plannedOn(entries, d, today, me)) {
      if (d === today && item.time && toMin(item.end ?? item.time) + (item.end ? 0 : 60) <= minutes) continue;
      out.push(item);
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "").localeCompare(b.time ?? ""));
}

const tagWort = (date: string, today: string) => (date === today ? "Heute" : weekdayShort(date));

/** Die Karte dieser Woche (Woche ab Montag, `today` über `now()`) */
export function stempelkarte(state: SportState, entries: CalendarEntry[], today: string, minutes: number, me?: string | null): Stempelkarte {
  const monday = mondayOf(today);
  const trainings = trainingsBetween(state, entries, monday, addDays(monday, 6), today, me);
  const anzahl = state.goal ?? OHNE_ZIEL_FELDER;
  const geplant = geplanteDerWoche(entries, today, minutes, me, monday);
  const felder: Feld[] = trainings.slice(0, anzahl).map((t) => ({ art: "stempel", stempel: stempel(t), training: t }));
  for (const item of geplant) {
    if (felder.length >= anzahl) break;
    felder.push({ art: "geplant", date: item.date, label: geplantLabel(item, today), sport: sportOfTitle(item.title), item });
  }
  while (felder.length < anzahl) felder.push({ art: "frei" });
  const geschafft = state.goal !== null && trainings.length >= state.goal;
  const zuletzt = trainings.length ? trainings[trainings.length - 1] : null;
  const naechstes = geplant[0] ?? null;
  const satz = geschafft ? "Woche geschafft." : zuletzt ? `${tagWort(zuletzt.data.date, today)} war ${trainingLabel(zuletzt)}.` : "Diese Woche ist noch frei.";
  const klein = geschafft ? "Mehr ist Bonus." : naechstes ? `${geplantLabel(naechstes, today)} ist geplant.` : null;
  return { monday, ziel: state.goal, felder, bonus: trainings.slice(anzahl).map((t) => ({ stempel: stempel(t), training: t })), geschafft, satz, klein, zuletzt, geplant: naechstes };
}

// --- Letzte Wochen ---------------------------------------------------------------------------

const MONATE = ["Jan", "Feb", "März", "Apr", "Mai", "Juni", "Juli", "Aug", "Sept", "Okt", "Nov", "Dez"];
const tagMonat = (iso: string) => ({ tag: Number(iso.slice(8, 10)), monat: MONATE[Number(iso.slice(5, 7)) - 1] });

/** „20.–26. Okt“, über den Monat: „27. Okt–2. Nov“ */
export function wochenLabel(monday: string): string {
  const a = tagMonat(monday);
  const b = tagMonat(addDays(monday, 6));
  return a.monat === b.monat ? `${a.tag}.–${b.tag}. ${b.monat}` : `${a.tag}. ${a.monat}–${b.tag}. ${b.monat}`;
}

/** Eine Zeile „Letzte Wochen“: Punkte je Training, gestrichelt bis zum Ziel, „geschafft“ nur mit Ziel */
export type WochenZeile = { monday: string; label: string; punkte: number; leer: number; geschafft: boolean };

/** Die 3 Wochen vor dieser – ohne Serien und Summen; nichts, solange es keine Trainings gab */
export function letzteWochen(state: SportState, entries: CalendarEntry[], today: string, me?: string | null, n = 3): WochenZeile[] {
  const monday = mondayOf(today);
  const rows = Array.from({ length: n }, (_, i) => {
    const m = addDays(monday, -7 * (i + 1));
    const punkte = trainingsBetween(state, entries, m, addDays(m, 6), today, me).length;
    return { monday: m, label: wochenLabel(m), punkte, leer: state.goal === null ? 0 : Math.max(0, state.goal - punkte), geschafft: state.goal !== null && punkte >= state.goal };
  });
  return rows.some((r) => r.punkte > 0) ? rows : [];
}

// --- Texte für Mia (die spätere Ergebnis-Karte übernimmt sie) -----------------------------------

/** Bestätigung nach dem Eintragen: „Volleyball · heute · gestempelt“ */
export function gestempeltText(sport: string, date: string, today: string): string {
  const wann = date === today ? "heute" : date === addDays(today, -1) ? "gestern" : weekdayShort(date);
  return `${sportById(sport).label} · ${wann} · gestempelt`;
}

/** „Wie läuft’s mit Sport?“ → „Mo war Laufen, Do ist geplant.“ bzw. „Woche geschafft.“ */
export function sportLage(karte: Stempelkarte, today: string): string {
  if (karte.geschafft) return "Woche geschafft.";
  const war = karte.zuletzt ? `${tagWort(karte.zuletzt.data.date, today)} war ${trainingLabel(karte.zuletzt)}` : null;
  const plan = karte.geplant ? `${tagWort(karte.geplant.date, today)} ist geplant` : null;
  if (war && plan) return `${war}, ${plan}.`;
  if (war || plan) return `${war ?? plan}.`;
  return "Diese Woche ist noch frei.";
}

/** Die Ziel-Frage kommt einmal: beim ersten Training, solange kein Ziel gesetzt und noch nicht gefragt */
export const zielFrageFaellig = (state: SportState) => !state.zielGefragt && state.goal === null && state.trainings.length > 0;

/** Text der Ziel-Frage (Tafel 132) */
export const ZIEL_FRAGE = "Wie oft willst du Sport machen? Pro Woche. Dann sag ich dir, wenn die Woche geschafft ist.";
