// Durchatmen (A-051, Tafel 138): die 12 festen Übungen aus
// `content/durchatmen/uebungen.json` – mit Typen, Sorten und kurzen Texten.
// Wiederholen sich bewusst, neue braucht es nicht. Rein und testbar.

import roh from "@/content/durchatmen/uebungen.json";

export type Sorte = "atmen" | "augen" | "koerper" | "ankommen" | "fokus";

/** Eine Atem-Phase: Wort (= ID der Ansage) und Dauer in Sekunden */
type Takt = { phase: string; s: number };

/** Ein Schritt (Körper, Ankommen, Augen): ab Sekunde, ID der Ansage */
type Schritt = { ab: number; ansage: string };

type Animation = "kaestchen" | "kreis" | "ring" | "symbol";

export type Uebung = {
  id: string;
  titel: string;
  sorte: Sorte;
  /** Dauer in Sekunden */
  dauer: number;
  /** Kurzbeschreibung in der Liste („4 ein, 4 halten, 4 aus“) */
  kurz: string;
  /** Kleiner Satz unter der Übung („Folge dem Punkt.“) */
  hilfe: string;
  takt: Takt[];
  schritte: Schritt[];
  /** Fokus: so viele Sekunden Atmen am Ende (der Rest ist das kurze Gespräch) */
  atmen?: number;
  /** IDs der Ansagen dieser Übung (höchstens 6) */
  ansagen: string[];
  animation: Animation;
};

export const UEBUNGEN: readonly Uebung[] = (roh as { uebungen: Uebung[] }).uebungen;

export const SORTEN: { id: Sorte | "alle"; label: string }[] = [
  { id: "alle", label: "Alle" },
  { id: "atmen", label: "Atmen" },
  { id: "augen", label: "Augen" },
  { id: "koerper", label: "Körper" },
  { id: "ankommen", label: "Ankommen" },
  { id: "fokus", label: "Fokus" },
];

export const uebungVon = (id: string): Uebung | undefined => UEBUNGEN.find((u) => u.id === id);

/** Dauer kurz: „30 s“, „1 Min“, „2 Min“ */
export function dauerText(sekunden: number): string {
  if (sekunden < 60) return `${sekunden} s`;
  const min = Math.round(sekunden / 60);
  return `${min} Min`;
}

/** Zeile in der Liste: „2 Min · 4 ein, 4 halten, 4 aus“ */
export const listenZeile = (u: Uebung) => `${dauerText(u.dauer)} · ${u.kurz}`;

/** Restzeit „Noch 1:12“ (Sekunden, aufgerundet) */
export function restText(restMs: number): string {
  const s = Math.max(0, Math.ceil(restMs / 1000));
  return `Noch ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Ende: „Zwei Minuten nur für dich.“ – passend zur Dauer, ohne Zähler */
export function endeSatz(sekunden: number): string {
  if (sekunden < 60) return "Eine halbe Minute nur für dich.";
  if (sekunden < 120) return "Eine Minute nur für dich.";
  return "Zwei Minuten nur für dich.";
}

/** Lieblinge oben, sonst feste Reihenfolge (wie in der Datei) */
export function sortiert(lieblinge: readonly string[], sorte: Sorte | "alle" = "alle"): Uebung[] {
  const liste = UEBUNGEN.filter((u) => sorte === "alle" || u.sorte === sorte);
  return [...liste.filter((u) => lieblinge.includes(u.id)), ...liste.filter((u) => !lieblinge.includes(u.id))];
}
