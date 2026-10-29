// Wochenende planen (A-054): nur freitags von 12 bis 20 Uhr fragt die
// Jetzt-Karte „Wochenende planen?“ – mit 2–3 Vorschlägen aus den eigenen
// Daten (nie Tipps aus der Region), darunter „Mit Mia planen“ (Bühne mit
// dem Wochenende als Thema) und „Später“ (für heute weg). Zeile 2 nennt, was
// schon steht („Sa 10:00 Volleyball steht schon.“). Ohne Druck: kein „du
// solltest“, keine Zähler. Rein.

import type { JetztInput, JetztTopic } from "@/lib/heute/jetztTopics";
import { weekdayIndex } from "@/lib/kalender/model";

/** Freitag ab/bis (Minuten) */
const WOCHENENDE_AB = 12 * 60;
const WOCHENENDE_BIS = 20 * 60;
/** So viele offene Sachen auf der Liste machen einen Großeinkauf */
const GROSSEINKAUF_AB = 5;

type Kurz = "Sa" | "So";

export type WochenendDaten = {
  /** Samstag und Sonntag: grobes Wetter (null = unbekannt bzw. nichts Besonderes) und ob schon ein Gericht geplant ist */
  tage: { date: string; kurz: Kurz; wetter: "sonnig" | "nass" | null; essen: boolean }[];
  /** Termine am Wochenende mit Uhrzeit */
  termine: { key: string; date: string; time: string; title: string }[];
  /** Offene Sachen auf der Einkaufsliste */
  einkauf: number;
  /** Steht am Samstag schon ein Einkauf (Termin oder Aufgabe)? */
  einkaufGeplant: boolean;
  /** Allein im Haushalt („was ich“ statt „was wir“) */
  solo?: boolean;
};

/** Was ein Vorschlag tut: Mia fragen, die Essen-Seite (7 Tage) öffnen oder still eine Aufgabe anlegen */
type WochenendZiel = { art: "fragen"; text: string } | { art: "essen" } | { art: "aufgabe"; title: string; date: string };
export type WochenendChip = { id: "wetter" | "essen" | "einkauf"; label: string; ziel: WochenendZiel };

/** Satz an Mia für „Mit Mia planen“ – die Bühne öffnet mit dem Wochenende als Thema */
export const WOCHENENDE_FRAGE = "Lass uns das Wochenende planen.";

const LANG: Record<Kurz, string> = { Sa: "Samstag", So: "Sonntag" };
const clock = (t: string) => t.slice(0, 5).replace(/^0(\d)/, "$1");

/** Grobes Wetter eines Tages: sonnig (kein Regen, viel Sonne), nass (Regnerisch/Gewitter/Schnee), sonst nichts */
export function wetterGrob(d: { text: string; wet: number; sun: number } | undefined): "sonnig" | "nass" | null {
  if (!d) return null;
  if (d.wet === 0 && (d.text === "Sonnig" || d.text === "Sonne und Wolken")) return "sonnig";
  if (["Regnerisch", "Gewitter", "Schnee"].includes(d.text)) return "nass";
  return null;
}

/** Ist gerade Zeit für die Wochenende-Karte? Nur freitags 12–20 Uhr */
export const wochenendeZeit = (today: string, minutes: number) => weekdayIndex(today) === 4 && minutes >= WOCHENENDE_AB && minutes < WOCHENENDE_BIS;

/** Die 2–3 Vorschläge, in dieser Reihenfolge: Wetter, Essen, Einkauf */
export function wochenendChips(d: WochenendDaten): WochenendChip[] {
  const out: WochenendChip[] = [];
  const wir = d.solo ? "ich" : "wir";
  const machen = d.solo ? "mache" : "machen";
  const sonne = d.tage.find((t) => t.wetter === "sonnig");
  const nass = d.tage.find((t) => t.wetter === "nass");
  if (sonne) out.push({ id: "wetter", label: `${sonne.kurz} sonnig: raus?`, ziel: { art: "fragen", text: `${LANG[sonne.kurz]} soll’s sonnig werden. Hast du eine Idee, was ${wir} draußen ${machen}?` } });
  else if (nass) out.push({ id: "wetter", label: `${nass.kurz} Regen: was für drinnen?`, ziel: { art: "fragen", text: `${LANG[nass.kurz]} soll’s regnen. Hast du eine Idee, was ${wir} drinnen ${machen}?` } });
  const frei = d.tage.filter((t) => !t.essen).map((t) => t.kurz);
  if (frei.length) out.push({ id: "essen", label: `Wochenplan ${frei.join("/")} füllen`, ziel: { art: "essen" } });
  const sa = d.tage.find((t) => t.kurz === "Sa");
  if (sa && d.einkauf >= GROSSEINKAUF_AB && !d.einkaufGeplant) out.push({ id: "einkauf", label: "Großeinkauf Sa?", ziel: { art: "aufgabe", title: "Großeinkauf", date: sa.date } });
  return out.slice(0, 3);
}

/** Thema „Wochenende planen?“ für die Rangliste – nur freitags 12–20 Uhr und mit Daten */
export function wochenendThema(x: Pick<JetztInput, "today" | "minutes" | "wochenende">): (Omit<JetztTopic, "rang"> & { arbeit?: boolean }) | null {
  const d = x.wochenende;
  if (!d || !wochenendeZeit(x.today, x.minutes)) return null;
  const steht = [...d.termine].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))[0];
  const kurz = steht ? d.tage.find((t) => t.date === steht.date)?.kurz : undefined;
  return {
    id: `wochenende:${x.today}`,
    kind: "wochenende",
    title: "Wochenende planen?",
    detail: steht && kurz ? `${kurz} ${clock(steht.time)} ${steht.title.trim().replace(/[.!?]+$/, "")} steht schon.` : "",
    target: null,
    chips: wochenendChips(d),
  };
}
