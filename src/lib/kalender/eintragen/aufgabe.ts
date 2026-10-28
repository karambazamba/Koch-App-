// Fenster „Neue Aufgabe“ (Tafel 114, Bild 1–3): EIN Feld („Was steht an?“),
// darunter EINE Zeile (Raum | Glocke | Mehr). Hier die reine Rechnung:
// - Satz lesen: Titel, genannter Tag („Freitag …“ → „Ab Freitag“), Raum aus
//   dem Satz, dringend; eine genannte Uhrzeit wird zur Erinnerung.
// - Glocke: Vorschläge „In 1 Std · 16:00 · 18:00 · Morgen früh“, darunter
//   die Zeile „Erinnern heute 16:00“.
// - „Mehr“: Ab wann (Standard Heute), Wiederholen, An jemanden geben.
// - Daten bauen (neu oder beim Bearbeiten – alles andere bleibt erhalten,
//   auch alte Etiketten, Fristen und Listen).

import type { Room } from "@/lib/core/entries";
import { addDays } from "@/lib/core/now";
import type { AufgabeData, Repeat } from "@/lib/kalender/model";
import { ohneRaumWorte, raumRaten, type RaumGrund, type RaumHilfen } from "@/lib/kalender/raum/raten";
import { readQuickText } from "@/lib/kalender/quick";
import { minutenVon, tagWort, uhr, uhrVon } from "@/lib/kalender/eintragen/tage";

/** Erinnern an einem Tag um eine Uhrzeit */
export type Erinnern = { date: string; time: string };

export type AufgabeGelesen = {
  title: string;
  /** Genannter Tag (sonst null = heute) */
  ab: string | null;
  /** Mias Vorschlag (A-034): aus dem Satz, gelernt oder Standard (Aufgaben „Ich“) */
  raum: Room;
  raumGrund: RaumGrund;
  /** Genannte Uhrzeit → Erinnerung (korrigierbar) */
  erinnern: Erinnern | null;
  dringend: boolean;
  label?: string;
  due?: string;
};

/** Den Satz lesen (ohne KI) */
export function aufgabeLesen(text: string, today: string, hilfen: RaumHilfen = {}): AufgabeGelesen {
  const r = readQuickText(text, today);
  const when = r.when;
  const ab = when === "morgen" ? addDays(today, 1) : when && when !== "heute" && when.date && when.date !== today ? when.date : null;
  const due = when && typeof when === "object" ? when.due : undefined;
  return {
    title: ohneRaumWorte(r.title),
    ab,
    ...vorschlag(raumRaten(text, "aufgabe", hilfen)),
    erinnern: r.time ? { date: ab ?? today, time: r.time } : null,
    dringend: r.urgent,
    ...(r.label ? { label: r.label } : {}),
    ...(due ? { due } : {}),
  };
}

export type GlockeVorschlag = { id: string; label: string } & Erinnern;

/** Vorschläge der Glocke: in 1 Std, 16:00, 18:00 (nur, wenn noch nicht vorbei), morgen früh */
export function glockeVorschlaege(today: string, minutes: number): GlockeVorschlag[] {
  const inEiner = Math.ceil((minutes + 60) / 5) * 5;
  return [
    ...(inEiner < 24 * 60 ? [{ id: "1std", label: "In 1 Std", date: today, time: uhrVon(inEiner) }] : []),
    ...["16:00", "18:00"].filter((t) => minutenVon(t) > minutes && minutenVon(t) !== inEiner).map((t) => ({ id: t, label: t, date: today, time: t })),
    { id: "morgen", label: "Morgen früh", date: addDays(today, 1), time: "08:00" },
  ];
}

/** „Erinnern heute 16:00“, „Erinnern morgen 8:00“, „Erinnern Freitag 9:30“ */
export function erinnernText(e: Erinnern, today: string): string {
  const tag = tagWort(e.date, today);
  return `Erinnern ${e.date === today || e.date === addDays(today, 1) ? tag.toLowerCase() : tag} ${uhr(e.time)}`;
}

/** Hinweis unter der Zeile: „Für heute. Return = speichern.“ bzw. „Ab Freitag. Return = speichern.“ */
export const aufgabeHinweis = (ab: string | null, today: string) => (!ab || ab <= today ? "Für heute. Return = speichern." : `Ab ${tagWort(ab, today)}. Return = speichern.`);

export type Wiederholen = "nie" | "taeglich" | "woechentlich" | "monatlich";

export const WIEDERHOLEN: { value: Wiederholen; label: string }[] = [
  { value: "nie", label: "Nie" },
  { value: "taeglich", label: "Täglich" },
  { value: "woechentlich", label: "Wöchentlich" },
  { value: "monatlich", label: "Monatlich" },
];

/** Wert für die Zeile „Wiederholen“ (auch für alte Serien wie „An Wochentagen“) */
export function wiederholenLabel(r: Repeat | null | undefined): string {
  if (!r) return "Nie";
  if (r.kind === "wochentage") return "An Wochentagen";
  if (r.kind === "woechentlich" && r.every && r.every > 1) return `Alle ${r.every} Wochen`;
  return WIEDERHOLEN.find((w) => w.value === r.kind)?.label ?? "Nie";
}

/** Auswahl → Serie; gleiche Art wie vorher behält Feinheiten („alle 2 Wochen“, Wochentage) */
export function serie(w: Wiederholen, vorher: Repeat | null | undefined): Repeat | null {
  if (w === "nie") return null;
  return vorher?.kind === w ? vorher : { kind: w };
}

/** Wie die Auswahl zu einer bestehenden Serie steht */
export const wiederholenVon = (r: Repeat | null | undefined): Wiederholen => (!r ? "nie" : r.kind === "wochentage" ? "woechentlich" : r.kind);

/**
 * Daten der Aufgabe. Ohne genannten Tag ist sie für heute; „Morgen früh
 * erinnern“ legt sie auf morgen (die Erinnerung gehört an ihren Tag).
 * Beim Bearbeiten bleibt alles andere (Etikett, Frist, Liste, Abgehaktes).
 */
export function aufgabeDaten(o: { title: string; ab: string | null; erinnern: Erinnern | null; repeat: Repeat | null; today: string; dringend?: boolean; label?: string; due?: string; vorher?: AufgabeData }): AufgabeData {
  const start = o.ab ?? o.vorher?.date ?? o.today;
  const date = o.erinnern && o.erinnern.date > start ? o.erinnern.date : start;
  const base: AufgabeData = o.vorher ? { ...o.vorher } : { title: "", reminder: "aus", repeat: null, ...(o.label ? { label: o.label } : {}), ...(o.dringend ? { dringend: true } : {}), ...(o.due ? { due: o.due } : {}) };
  const zeit = o.erinnern ? { time: o.erinnern.time, reminder: "30" as const } : { time: o.vorher?.time, reminder: "aus" as const };
  const data: AufgabeData = { ...base, title: o.title.trim().slice(0, 120), date, repeat: o.repeat, ...zeit };
  if (!data.time) delete data.time;
  return data;
}

/** Beim Bearbeiten: die Erinnerung, wie sie gespeichert ist */
export const erinnernVon = (d: Pick<AufgabeData, "date" | "time" | "reminder">, today: string): Erinnern | null => (d.time && d.reminder !== "aus" ? { date: d.date ?? today, time: d.time } : null);

const vorschlag = (r: { raum: Room; grund: RaumGrund }) => ({ raum: r.raum, raumGrund: r.grund });
