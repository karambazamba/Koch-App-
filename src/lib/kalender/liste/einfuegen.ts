// „Liste einfügen“: eine kopierte To-do-Liste (Apple Erinnerungen, Notizen,
// Todoist, Zettel …) in Aufgaben verwandeln. Jede Zeile = eine Aufgabe;
// Aufzählungszeichen und Kästchen fallen weg, Abgehaktes und Leerzeilen
// auch. Fristen und Tage erkennt derselbe Parser wie beim Eintragen
// („bis Freitag“, „28.10.“, „morgen“, „nächste Woche“). Überschriften
// („Haus:“ oder „KINDER“) werden zum Listennamen der folgenden Zeilen.
// Importiert wird alles, angezeigt nur, was jetzt dran ist. Rein.

import { createEntry, type Room } from "@/lib/core/entries";
import { genannterTag, parseCalendar } from "@/lib/kalender/parse";
import type { Aufgabe, AufgabeData, CalendarEntry } from "@/lib/kalender/model";

export type ListZeile = {
  title: string;
  /** Liste aus der Überschrift darüber (ohne = keine) */
  liste?: string;
  raum: Room;
  /** Tag, Frist, Woche, Uhrzeit, dringend – wie beim Eintragen erkannt */
  data: Partial<AufgabeData>;
};

export type ListLesung = {
  zeilen: ListZeile[];
  /** Weggelassen, weil schon abgehakt */
  abgehakt: number;
};

// Kästchen, Haken, Aufzählungen, Nummern: „☐ “, „- [ ] “, „* “, „• “, „1. “, „2) “
const DONE_MARK = /^\s*(?:[-*+•·–]\s*)?(?:\[[xX✓✔]\]|☑|☒|✅|✓|✔)\s*/;
const BULLET = /^\s*(?:[-*+•·–—▪◦○●]\s+|\[\s?\]\s*|☐\s*|□\s*|◻\s*|\d{1,3}[.)]\s+|[a-z][.)]\s+(?=\S))/;
const STRIKE = /^~~.+~~$|̶/;

const hasLetters = (s: string) => /[a-zäöüß]/i.test(s);
const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** „HAUS“ → „Haus“, „Für die Kinder:“ → „Für die Kinder“ */
function headingName(line: string): string {
  const name = line
    .replace(/:\s*$/, "")
    .replace(/^#+\s*/, "")
    .trim();
  return name === name.toUpperCase() ? capitalize(name.toLowerCase()) : name;
}

/** Eine Zeile bereinigen: null = leer, sonst Text und ob schon abgehakt */
export function cleanLine(raw: string): { text: string; done: boolean } | null {
  let s = raw.replace(/\t/g, " ").trim();
  if (!s) return null;
  let done = STRIKE.test(s);
  if (DONE_MARK.test(s)) {
    done = true;
    s = s.replace(DONE_MARK, "");
  }
  // Mehrfach: „- [ ] “ = Strich + Kästchen
  for (let i = 0; i < 3 && BULLET.test(s); i++) s = s.replace(BULLET, "");
  s = s
    .replace(/^~~|~~$/g, "")
    .replace(/̶/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return hasLetters(s) ? { text: s, done } : null;
}

/** Überschrift: Zeile mit „:“ am Ende, „# Titel“ oder ganz in Großbuchstaben (ohne Aufzählungszeichen davor) */
export function isHeading(raw: string): boolean {
  const s = raw.trim();
  if (!hasLetters(s) || BULLET.test(s) || DONE_MARK.test(s) || s.length > 40) return false;
  if (/^#{1,3}\s+\S/.test(s)) return true;
  if (/:\s*$/.test(s)) return true;
  const letters = s.replace(/[^a-zäöüß]/gi, "");
  return letters.length >= 3 && s === s.toUpperCase();
}

const WORK_LIST = /(?<![a-zäöüß])(arbeit|büro|job|firma|projekt)/i;

/** Eine Aufgabe aus einer Zeile – mit Tag/Frist, wenn erkannt */
function readZeile(text: string, liste: string | undefined, today: string): ListZeile {
  const cmd = parseCalendar(text, today);
  const raum: Room = liste && WORK_LIST.test(liste) ? "arbeit" : "familie";
  if (cmd?.kind === "create") {
    const d = cmd.draft;
    const data: Partial<AufgabeData> =
      d.typ === "aufgabe"
        ? {
            // Nur ein genannter Tag zählt – sonst bleibt die Zeile in ihrer Liste geparkt
            date: d.data.repeat ? d.data.date : (genannterTag(d.data.date, text, today) ?? undefined),
            due: d.data.due,
            time: d.data.time,
            dringend: d.data.dringend,
            repeat: d.data.repeat ?? null,
          }
        : {
            date: d.data.date,
            time: d.data.start,
            repeat: d.data.repeat ?? null,
          };
    const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined && v !== null)) as Partial<AufgabeData>;
    return {
      title: d.data.title,
      ...(liste ? { liste } : {}),
      raum: raum === "arbeit" ? raum : d.raum,
      data: clean,
    };
  }
  return {
    title: capitalize(text),
    ...(liste ? { liste } : {}),
    raum,
    data: {},
  };
}

/** Den eingefügten Text lesen */
export function readPastedList(text: string, today: string): ListLesung {
  const zeilen: ListZeile[] = [];
  let abgehakt = 0;
  let liste: string | undefined;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n").slice(0, 500)) {
    if (isHeading(raw)) {
      liste = headingName(raw);
      continue;
    }
    const line = cleanLine(raw);
    if (!line) continue;
    if (line.done) {
      abgehakt++;
      continue;
    }
    zeilen.push(readZeile(line.text.slice(0, 200), liste, today));
  }
  return { zeilen, abgehakt };
}

/** Sieht der Text nach einer Liste aus? (mindestens 3 Zeilen mit Inhalt) */
export function looksLikeList(text: string): boolean {
  return text.split(/\r?\n/).filter((l) => cleanLine(l)).length >= 3;
}

const INTRO = /to-?do|aufgaben|liste|erledigen/i;

/**
 * Im Gespräch: „Ich hab hier meine To-do-Liste:“ + eingefügte Zeilen → der
 * Text für „Liste einfügen“ (ohne die Einleitung); nur der Satz → "" (leeres
 * Fenster); sonst null (normales Gespräch).
 */
export function listeAusChat(text: string): string | null {
  const lines = text.trim().split(/\r?\n/);
  const intro = lines[0] && INTRO.test(lines[0]) && (/:\s*$/.test(lines[0]) || /(?<![a-zäöüß])(hier|meine|unsere|das ist|das sind)(?![a-zäöüß])/i.test(lines[0]));
  const rest = (intro ? lines.slice(1) : lines).join("\n").trim();
  if (looksLikeList(rest)) return rest;
  if (lines.length === 1 && /^(ich hab|hier ist|hier sind|ich möchte|ich will|kann ich).*(to-?do|aufgaben)-?liste/i.test(lines[0].trim())) return "";
  return null;
}

export const hatDatum = (z: ListZeile) => Boolean(z.data.date || z.data.due || z.data.repeat);

const norm = (s: string) =>
  s
    .toLocaleLowerCase("de")
    .replace(/[^a-z0-9äöüß]+/g, " ")
    .trim();
const key = (title: string, liste: string | undefined) => `${norm(liste ?? "")}|${norm(title)}`;

/** Gleicher Text, gleiche Liste, noch nicht erledigt = schon vorhanden (auch doppelt im Eingefügten) */
export function splitDuplicates(zeilen: ListZeile[], entries: CalendarEntry[]): { neu: ListZeile[]; vorhanden: number } {
  const seen = new Set(entries.filter((e): e is Aufgabe => e.typ === "aufgabe" && !e.data.doneOn).map((e) => key(e.data.title, e.data.liste)));
  const neu: ListZeile[] = [];
  let vorhanden = 0;
  for (const z of zeilen) {
    const k = key(z.title, z.liste);
    if (seen.has(k)) {
      vorhanden++;
      continue;
    }
    seen.add(k);
    neu.push(z);
  }
  return { neu, vorhanden };
}

/** „37 Aufgaben gefunden · 12 mit Datum · 3 Listen (Haus, Arbeit, Kinder)“ */
export function listSummary(zeilen: ListZeile[]): string {
  const n = zeilen.length;
  const dated = zeilen.filter(hatDatum).length;
  const listen = [...new Set(zeilen.map((z) => z.liste).filter((l): l is string => Boolean(l)))];
  const parts = [`${n} ${n === 1 ? "Aufgabe" : "Aufgaben"} gefunden`];
  if (dated) parts.push(`${dated} mit Datum`);
  if (listen.length) parts.push(`${listen.length} ${listen.length === 1 ? "Liste" : "Listen"} (${listen.join(", ")})`);
  return parts.join(" · ");
}

/** Die gewählten Zeilen als Aufgaben (gehören der Person, die einfügt) */
export function toAufgaben(zeilen: ListZeile[], besitzer?: string): Aufgabe[] {
  return zeilen.map(
    (z) =>
      createEntry<AufgabeData>(
        "aufgabe",
        {
          title: z.title,
          reminder: "aus",
          repeat: null,
          ...z.data,
          ...(z.liste ? { liste: z.liste } : {}),
        },
        { raum: z.raum, ...(besitzer ? { besitzer } : {}) },
      ) as Aufgabe,
  );
}

// --- Öffnen von überall (＋ in Aufgaben, eingefügter Text, Mia) -------------

const EVENT = "mia:liste-einfuegen";

/** Fenster „Liste einfügen“ öffnen, optional mit schon eingefügtem Text */
export function openListe(text = "") {
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: text }));
}

export function onOpenListe(listener: (text: string) => void): () => void {
  const handler = (e: Event) => listener((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
