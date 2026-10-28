// Mails an Mia: aus einer Mail werden VORSCHLÄGE (nie automatisch
// eingetragen) – Termine (mit Ort), Aufgaben (mit Frist), Einkauf,
// Pinnwand-Notiz. Ohne KI mit denselben Regeln wie beim Eintragen
// (`parseCalendar`) Satz für Satz; die KI kann das später verfeinern.
// Rein.

import { genannterTag, parseCalendar } from "@/lib/kalender/parse";
import type { Room } from "@/lib/core/entries";

export type MailVorschlag =
  | { kind: "termin"; title: string; date: string; start: string; place?: string }
  | { kind: "aufgabe"; title: string; date?: string; due?: string }
  | { kind: "einkauf"; name: string };

export type MailEintrag = {
  id: string;
  room: Room;
  /** „kita-eutin.de“ – nie die ganze Adresse */
  senderDomain: string;
  /** zum Lernen (Domain, bei Freemailern die Adresse) */
  senderKey: string;
  subject: string;
  /** ≤ 300 Zeichen */
  excerpt: string;
  vorschlaege: MailVorschlag[];
  attachments: string[];
  /** Gmail/Outlook bestätigen die Weiterleitung */
  confirmation?: { anbieter: string; code: string } | null;
  at: string;
};

const SENTENCE = /(?<=[.!?])\s+|\n+/;
const PLACE = /(?<![a-zäöüß])(?:im|in der|in|auf dem|beim)\s+([A-ZÄÖÜ][\wäöüß-]+(?:\s+[A-ZÄÖÜ][\wäöüß-]+)?)/;
/** „der Laternenumzug ist“ → „Laternenumzug“ */
const tidy = (t: string) =>
  t
    .replace(/^(der|die|das|unser|unsere|ein|eine)\s+/i, "")
    .replace(/\s+(ist|sind|findet statt|beginnt|startet)$/i, "")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
const BUY = /(?<![a-zäöüß])(mitbringen|kuchen für|spende[nt]?\s+(?:bitte\s+)?(?:einen|eine|ein)?|bitte (?:einen|eine|ein) .+ mitgeben|bringt bitte)(?![a-zäöüß])/i;

/** Sätze einer Mail → Vorschläge (höchstens 5, ohne Doppelte) */
export function vorschlaegeAus(text: string, today: string): MailVorschlag[] {
  const out: MailVorschlag[] = [];
  const seen = new Set<string>();
  const add = (v: MailVorschlag) => {
    const key = `${v.kind}|${"title" in v ? v.title : v.name}`.toLowerCase();
    if (seen.has(key) || out.length >= 5) return;
    seen.add(key);
    out.push(v);
  };
  for (const raw of text.split(SENTENCE)) {
    const s = raw.replace(/\s+/g, " ").trim();
    if (s.length < 6 || s.length > 220) continue;
    // Einkauf: „Bitte bringt einen Kuchen für den Basar mit“
    const buy = s.match(/(?:bringt|bring|backt|spendet)\s+(?:bitte\s+)?(?:einen|eine|ein|etwas)?\s*([A-ZÄÖÜ][\wäöüß-]+(?:\s+für\s+[\wäöüß -]+?)?)\s+(?:mit|vorbei)\b/i);
    if (buy || BUY.test(s)) {
      const name = (buy?.[1] ?? s.replace(BUY, "").split(/[,.]/)[0]).trim();
      if (name.length >= 3 && name.length <= 60) add({ kind: "einkauf", name: name.charAt(0).toUpperCase() + name.slice(1) });
    }
    // Ort vorher herausnehmen, damit er nicht im Titel landet
    const place = s.match(PLACE);
    const cmd = parseCalendar(place ? s.replace(place[0], " ") : s, today);
    if (cmd?.kind !== "create") continue;
    const d = cmd.draft;
    const title = tidy(d.data.title).slice(0, 80);
    if (title.length < 3) continue;
    if (d.typ === "termin") {
      add({ kind: "termin", title, date: d.data.date, start: d.data.start, ...(place ? { place: place[1] } : {}) });
    } else {
      // Nur mit Frist oder genanntem Tag ein Vorschlag; übernommen gehört sie ab heute bzw. ab dem Tag in die Liste
      const tag = genannterTag(d.data.date, s, today);
      if (d.data.due || tag) add({ kind: "aufgabe", title, ...(d.data.due ? { due: d.data.due } : {}), ...(tag && !d.data.due ? { date: tag } : {}) });
    }
  }
  return out;
}

/** „Kurz gesagt“ für die Jetzt-Karte: „Mia hat 2 Vorschläge aus Mails“ */
export function mailThema(eintraege: Pick<MailEintrag, "vorschlaege" | "confirmation">[]): string | null {
  const code = eintraege.find((e) => e.confirmation);
  if (code?.confirmation) return `${code.confirmation.anbieter}-Code: ${code.confirmation.code}`;
  const n = eintraege.reduce((sum, e) => sum + e.vorschlaege.length, 0);
  if (!n) return null;
  return n === 1 ? "Ein Vorschlag aus einer Mail" : `${n} Vorschläge aus Mails`;
}
