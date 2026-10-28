// Die Kühlschranktür (Tafel 106/107) – Regeln für Zettel und
// Sprachnachrichten gleichermaßen:
// - Abgehakt wie Aufgaben und Einkauf: Häkchen orange, 1 s stehen (nochmal
//   tippen = doch nicht), dann gleitet der Zettel 0,8 s weich ins Archiv
//   „Ältere“ (nie durchgestrichen; Rückgängig holt ihn zurück). Nicht Erledigtes geht nach 7 Tagen
//   leise ins Archiv. „Bleibt hängen“ (intern `pinned`) geht nie von selbst,
//   nur durch Abhaken. Im Archiv wird nach 30 Tagen still gelöscht (als
//   Lösch-Markierung über den Abgleich, die Dateien räumt dann der Server
//   weg); sonst wird nur von Hand gelöscht.
// - Farbe = Person: fünf Pastell-Töne (Tokens `--app-zettel-<n>`), je
//   Mitglied fest (Reihenfolge im Haushalt, sonst aus dem Namen); beim
//   Schreiben wählbar, dann am Zettel gespeichert.
// - Jeder Zettel hängt fest leicht schief (−3° bis +3°, aus der ID) an
//   einem Magneten je Papier: Punkt (Zettel), Stern (Karoblatt), Apfel
//   (Polaroid), Herz (Kassenbon); „Bleibt hängen“ am roten Pin.
// - Kachel „Fächer“: die neuesten an der Tür (gerade Abgehaktes steht dort
//   genauso 1 s mit Häkchen und gleitet dann weg), „Bleibt hängen“ nur zum
//   Auffüllen. Rein.

import { GLEITEN_MS, STEHEN_MS } from "@/lib/core/abhaken";

export const ZETTEL_FARBEN = 5;
export type ZettelFarbe = 0 | 1 | 2 | 3 | 4;
/** Namen der Töne (für VoiceOver und Tests) */
export const FARB_NAMEN = ["Gelb", "Rosa", "Grün", "Blau", "Lila"] as const;

export type Done = { von: string; am: string };

/** So lange bleibt Abgehaktes an der Tür: 1 s mit Häkchen stehen, 0,8 s weich hinaus – dann liegt es im Archiv */
export const ABHAK_MS = STEHEN_MS + GLEITEN_MS;
/** Das Hinausgleiten (nach der 1 s Stehen) */
export const GLEIT_MS = GLEITEN_MS;
/** So lange hängt ein Zettel, bevor er leise ins Archiv geht */
export const ARCHIV_MS = 7 * 86_400_000;
/** So lange liegt ein Zettel im Archiv, bevor er still gelöscht wird */
export const VERGESSEN_MS = 30 * 86_400_000;

/** Größe an der Tür (Tafel 123): klein = halbe Breite, groß = volle Breite */
export type Groesse = "klein" | "gross";

/** Was alle Einträge an der Tür gemeinsam haben (Zettel und Sprachnachrichten) */
export type DoorEntry = {
  id: string;
  erstellt: string;
  data: { author: string; pinned?: boolean; erledigt: Done | null; archiv: string | null; farbe: ZettelFarbe | null; groesse?: Groesse; sort?: number | null; privat?: boolean };
};

export const readGroesse = (v: unknown): Groesse => (v === "gross" ? "gross" : "klein");

/** Platz an der Tür (kleiner = weiter vorn); null = nach der Zeit (neueste vorn) */
export const readSort = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

export const readFarbe = (v: unknown): ZettelFarbe | null => (typeof v === "number" && Number.isInteger(v) && v >= 0 && v < ZETTEL_FARBEN ? (v as ZettelFarbe) : null);

export function readDone(v: unknown): Done | null {
  const d = v as Partial<Done> | null;
  return d && typeof d === "object" && typeof d.von === "string" && typeof d.am === "string" ? { von: d.von, am: d.am } : null;
}

const ms = (iso: string) => Date.parse(iso) || 0;

/**
 * Seit wann ein Eintrag im Archiv liegt (ms): von Hand hineingelegt, 1,8 s nach
 * dem Abhaken oder (ohne „Bleibt hängen“) 7 Tage nach dem Schreiben; null =
 * gehört an die Tür, solange niemand abhakt.
 */
function archivedSince(e: DoorEntry): number | null {
  if (e.data.archiv) return ms(e.data.archiv);
  if (e.data.erledigt) return ms(e.data.erledigt.am) + ABHAK_MS;
  return e.data.pinned ? null : ms(e.erstellt) + ARCHIV_MS;
}

/** Im Archiv „Ältere“ (und noch nicht vergessen) */
export function isArchived(e: DoorEntry, nowMs: number): boolean {
  const since = archivedSince(e);
  return since !== null && nowMs >= since;
}

/** 30 Tage im Archiv – wird beim nächsten Start still gelöscht */
export function isForgotten(e: DoorEntry, nowMs: number): boolean {
  const since = archivedSince(e);
  return since !== null && nowMs - since >= VERGESSEN_MS;
}

export const onDoor = (e: DoorEntry, nowMs: number) => !isArchived(e, nowMs);

/** Abgehakt und noch an der Tür: so viele ms, bis er hinausgleitet (sonst null) */
export function leavesIn(e: DoorEntry, nowMs: number): number | null {
  if (!e.data.erledigt || e.data.archiv) return null;
  const left = ms(e.data.erledigt.am) + ABHAK_MS - nowMs;
  return left > 0 ? left : null;
}

/** Erledigt an/aus (zurücknehmen geht über „Rückgängig“ – auch, wenn er schon im Archiv liegt) */
export const doneValue = (e: DoorEntry, me: string, stamp: string): Done | null => (e.data.erledigt ? null : { von: me, am: stamp });

/** „erledigt von Lisa“ bzw. „erledigt von dir“ */
export const doneLine = (d: Done, me: string) => `erledigt von ${d.von === me ? "dir" : d.von}`;

const hash = (s: string) => {
  let h = 7;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
};

/** Farbe einer Person: Reihenfolge im Haushalt (Person 1 = Gelb …), sonst aus dem Namen */
export function personFarbe(name: string, household: string[] = []): ZettelFarbe {
  const i = household.findIndex((p) => p.trim().toLowerCase() === name.trim().toLowerCase());
  return ((i >= 0 ? i : hash(name.trim().toLowerCase())) % ZETTEL_FARBEN) as ZettelFarbe;
}

/** Farbe eines Eintrags: gewählt, sonst die der Person */
export const farbeOf = (e: DoorEntry, household: string[]) => e.data.farbe ?? personFarbe(e.data.author, household);

/** Fest je Zettel: −3° bis +3° (eine Nachkommastelle), nie bei jedem Laden neu */
export const tiltOf = (id: string) => Math.round(((hash(id) % 61) / 10 - 3) * 10) / 10;

export type MagnetForm = "punkt" | "stern" | "apfel" | "herz" | "pin";

/** Magnet je Papier; „Bleibt hängen“ hängt am roten Pin */
export function magnetOf(papier: "zettel" | "karo" | "foto" | "memo", pinned = false): MagnetForm {
  if (pinned) return "pin";
  return papier === "karo" ? "stern" : papier === "foto" ? "apfel" : papier === "memo" ? "herz" : "punkt";
}

/** Fächer je Größe: S und M je drei (L gibt es seit dem festen Raster nicht mehr) */
export const FAECHER = { S: 3, M: 3 } as const;

/** Winkel im Fächer (hinten → vorn) */
export const FAECHER_WINKEL = [-10, -2, 7] as const;

/**
 * Kachel: die neuesten Einträge an der Tür (neueste zuerst) – gerade
 * Abgehaktes bleibt wie an der Tür 1 s mit Häkchen und gleitet dann weg;
 * nur Zettel für alle („Nur für mich“ nie auf der Startseite);
 * „Bleibt hängen“ zählt nur mit, wenn weniger als `count` neue da sind.
 */
export function faecherOf<T extends DoorEntry>(items: T[], nowMs: number, count: number): T[] {
  const live = items.filter((e) => onDoor(e, nowMs) && !e.data.privat).sort((a, b) => b.erstellt.localeCompare(a.erstellt));
  const fresh = live.filter((e) => !e.data.pinned);
  const pinned = live.filter((e) => e.data.pinned);
  return [...fresh, ...pinned].slice(0, count);
}

/**
 * Fächer (S) als EIN Link: die Zettel liegen übereinander, darum wäre jeder
 * hintere Zettel ein Knopf, den der vordere verdeckt (Tipp landet daneben).
 * Der Name nennt den vordersten zuerst, dann die dahinter.
 */
export function faecherLabel(texts: string[], demo: boolean): string {
  const [front = "", ...rest] = texts;
  const behind = rest.length ? `; dahinter ${rest.join("; ")}` : "";
  return demo ? `Beispiel: ${front}${behind}` : `${front}${behind} – auf der Pinnwand öffnen`;
}

/**
 * Wohin ein Tipp in den Fächer führt: zum Zettel unter dem Finger (der oberste
 * sichtbare bekommt ihn), sonst zum vordersten.
 */
export function faecherZiel(tapped: string | null | undefined, front: string, ids: string[]): string {
  return tapped && ids.includes(tapped) ? tapped : front;
}

/** Zwei Spalten (Masonry): der Reihe nach immer in die kürzere Spalte – das Erste oben links */
export function twoColumns<T>(items: T[], heightOf: (item: T) => number): [T[], T[]] {
  const cols: [T[], T[]] = [[], []];
  const h = [0, 0];
  for (const item of items) {
    const c = h[1] < h[0] ? 1 : 0;
    cols[c].push(item);
    h[c] += heightOf(item);
  }
  return cols;
}

/** Geschätzte Höhe für die Spalten (Text-Länge und Zeilen; Foto quadratisch, Kassenbon fest; groß = doppelt so breit) */
export function guessHeight(kind: "zettel" | "karo" | "foto" | "memo", text = "", gross = false): number {
  if (kind === "memo") return 120;
  if (kind === "foto") return (gross ? 300 : 200) + (text ? 24 : 0);
  const perLine = gross ? 34 : 16;
  const lines = text.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / perLine)), 0);
  return 70 + lines * 22;
}

/**
 * Sieht der Zettel nach Notiz aus? Liste mit 3+ Zeilen, Passwort/PIN/WLAN,
 * Telefonnummer oder Adresse – dann fragt Mia EINMAL, ob er zu den Notizen soll.
 */
export function looksLikeNote(text: string): boolean {
  const t = text.trim();
  if (t.split("\n").filter((l) => l.trim()).length >= 3) return true;
  if (/(?<![a-zäöüß])(passwort|kennwort|pw|pin|wlan|wifi|wi-fi|zugangsdaten)(?![a-zäöüß])/i.test(t)) return true;
  if (/(?:\+49|0)[\d /-]{7,}\d/.test(t)) return true;
  return /(?<![a-zäöüß])[a-zäöüß-]+(straße|str\.|weg|allee|platz|gasse|ring|damm)\s*\d{1,4}\s*[a-z]?(?![a-zäöüß])/i.test(t) || /\b\d{5}\s+[A-ZÄÖÜ][a-zäöüß]+/.test(t);
}

/** CSS-Farben eines Zettels (Tokens): Papier und Magnet; "mia" = Orange (nur im Beispiel) */
export const zettelTon = (f: ZettelFarbe | "mia") => ({ bg: `var(--app-zettel-${f})`, mag: `var(--app-zettel-${f}-mag)` });

/** Karoblatt für Kinder-Profile (Rolle „kind“ im Profil), sonst Haftnotiz */
export const papierFor = (name: string, persons: { name: string; role: string }[] = []): "zettel" | "karo" =>
  persons.some((p) => p.role === "kind" && p.name.trim().toLowerCase() === name.trim().toLowerCase()) ? "karo" : "zettel";
