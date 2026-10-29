// Sofort-Weg (Auftrag „Mia schneller und flüssiger“, rein): eindeutige
// Kurzbefehle versteht die App selbst – ohne auf die KI zu warten – und
// erledigt sie sofort (Rückgängig, „Mia hat schon …“). Die KI bekommt die
// Nachricht trotzdem und korrigiert nur, wenn sie etwas anderes versteht.
// Nie raten: Ist etwas unklar (Frage, Änderung, mehrere Dinge, Serie, schon
// eingetragen, kein Katalog-Artikel …), gibt es `null` und die KI macht es wie
// bisher. Der Prüfstand `pruefstand/sofort.ts` verlangt ≥ 98 % richtig.
// Erkannt: Einkauf (nur Katalog), Termin mit Uhrzeit, Aufgabe (Ding +
// Tätigkeit, „Erinner mich …“), Notiz, Pinnwand, Timer. Termine und Aufgaben
// bekommen den Raum wie überall (`raum/raten.ts`: gesagt › gelernt › Inhalt ›
// Standard Termine Familie, Aufgaben Ich); ist er unklar, macht es die KI.
// A-056: nur GENAU EINE Sache – mit „und“, Komma, „außerdem“, „dann“, mehreren
// Doppelpunkten oder Frage geht alles an die KI (`mehrteilig`); Füllwörter
// sind vorher schon weg (`ohneFuellwoerter`).

import { createEntry } from "@/lib/core/entries";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { CalendarEntry } from "@/lib/kalender/model";
import { parseCalendar } from "@/lib/kalender/parse";
import { arbeitsWorte, guessRoom, raumUnklar, type RaumHilfen, type RaumWort } from "@/lib/kalender/raum/raten";
import { quickTaskData, readQuickText } from "@/lib/kalender/quick";
import { readSentence, splitTermine } from "@/lib/kalender/sentence";
import { createNote } from "@/lib/notizen/model";
import { PIN_MAX, pinForAllCommand } from "@/lib/pinnwand/model";
import { kurzeBestaetigung } from "@/lib/begleitung/bestaetigung";
import { einkaufErkennen } from "@/lib/begleitung/sofort/einkauf";
import { mehrteilig } from "@/lib/begleitung/aufteilen";
import { ohneFuellwoerter } from "@/lib/begleitung/fuellwoerter";

export type SofortArt = "einkauf" | "termin" | "aufgabe" | "notiz" | "pinnwand" | "timer";

export type SofortKontext = {
  today: string;
  /** Minuten seit Mitternacht (Termin heute schon vorbei → nicht sofort) */
  nowMinutes: number;
  persons: { id: string; name: string }[];
  /** Laden-Namen („Meine Läden“ und Vorschläge kennt der Leser selbst) */
  laeden: string[];
  /** Woche der Einkaufsliste */
  weekStart: string;
  /** Was schon auf der Einkaufsliste steht (dann nicht sofort: „steht schon drauf“ sagt die KI) */
  aufDerListe: string[];
  entries: CalendarEntry[];
  /** Gelernte Räume (A-034) */
  gelernt?: readonly RaumWort[];
};

const hilfen = (ctx: SofortKontext): RaumHilfen => ({ gelernt: ctx.gelernt ?? [], arbeitWorte: arbeitsWorte(ctx.entries) });

export type Sofort = { art: SofortArt; ops: ChangeOp[]; reply: string; /** Für die Prüfung der KI: was die App gemacht hat */ was: string };

const V = "(?<![a-zäöüß])";
const W = "(?![a-zäöüß])";
const re = (body: string, flags = "i") => new RegExp(`${V}(?:${body})${W}`, flags);

/** Fragen, Änderungen, Verneinungen, Regeln, Planen: immer die KI */
const NIE = re(
  "wie|was|warum|wieso|weshalb|wann|wo|wer|welche\\w*|kannst|könntest|hast|gibt|soll ich|sollen wir|verschieb\\w*|verleg\\w*|lösch\\w*|streich\\w*|entfern\\w*|absag\\w*|fällt|ändern|änder|statt|stattdessen|lieber|doch|nicht|kein\\w*|nie|erledigt|gemacht|fertig|zurück|rückgängig|immer|ab jetzt|egal|plan\\w*|rezept\\w*|idee\\w*|koch\\w*|vorschlag|vorschläge|wochencheck|und dann|danach|außerdem|mail\\w*|vorher|vorabend|jeden|jede|täglich|wöchentlich|monatlich|serie|nur|dienstags|montags|mittwochs|donnerstags|freitags|samstags|sonntags|mag|mögen|allergi\\w*|verträgt",
);

const ZAHLWORT: Record<string, number> = { eine: 1, einen: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, fünfzehn: 15, zwanzig: 20, dreißig: 30, vierzig: 40, halbe: 0.5 };

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const clean = (s: string) => s.replace(/\s+/g, " ").replace(/^[\s,:.–-]+|[\s,.!–-]+$/g, "").trim();

/** „Timer 10 Minuten Nudeln“, „Stell einen Timer auf 5 Minuten“ */
function timer(t: string): ChangeOp[] | null {
  if (!re("timer|wecker").test(t) || re("stopp\\w*|stop|aus|beend\\w*|noch|läuft|pause|weiter").test(t)) return null;
  const d = t.match(new RegExp(`${V}(\\d{1,3}(?:[.,]5)?|${Object.keys(ZAHLWORT).join("|")})\\s*(minuten?|min|stunden?|std)${W}`, "i"));
  if (!d) return null;
  const n = /^\d/.test(d[1]) ? Number(d[1].replace(",", ".")) : ZAHLWORT[d[1].toLowerCase()];
  const minutes = /^(stunde|std)/i.test(d[2]) ? n * 60 : n;
  if (!minutes || minutes <= 0 || minutes > 600) return null;
  const fuell = re("stell\\w*|mach\\w*|setz\\w*|bitte|mal|einen|nen|'nen|ein|timer|wecker|auf|für|die|den|das|von|mit|starten?", "gi");
  const name = clean(t.replace(d[0], " ").replace(fuell, " ").replace(/\s+/g, " "));
  // Übrig bleibt höchstens ein kurzer Name („Nudeln“, „Eier“)
  const words = name.split(" ").filter(Boolean);
  if (words.length > 2 || /\d/.test(name)) return null;
  return [{ id: "sofort-1", type: "add_timer", name: cap(name).slice(0, 30), minutes }];
}

/** „Merk dir …“, „Notier (dir): …“, „Schreib (dir) auf: …“ */
function notiz(t: string): ChangeOp[] | null {
  const m = t.match(/^(?:bitte\s+)?(?:merk\s+dir|notier\w*(?:\s+(?:dir|mir|bitte))?|schreib\w*\s+(?:dir\s+|mir\s+)?auf|notiz)\s*[:,]?\s+(.+)$/i);
  if (!m) return null;
  const inhalt = clean(m[1]);
  if (inhalt.length < 2 || re("schnellnotiz|kladde|liste|geschenkideen|packliste").test(inhalt)) return null;
  const doppel = inhalt.match(/^(.{2,40}?)\s*:\s*(.+)$/);
  const title = doppel ? cap(clean(doppel[1].replace(/^(das|den|die|der)\s+/i, ""))) : cap(inhalt).slice(0, 60);
  const text = doppel ? doppel[2].trim() : inhalt.length > 60 ? inhalt : "";
  return [{ id: "sofort-1", type: "upsert_note", isNew: true, note: createNote({ title, text }) }];
}

/** „Pinnwand: …“, „An alle: …“, „Sag Lisa, ich komm später“ (nicht „… sie soll …“ – das ist Abgeben) */
function pinnwand(t: string, ctx: SofortKontext): ChangeOp[] | null {
  let text: string | null = null;
  // „Pinnwand“ nur mit Doppelpunkt/Komma oder nach „Schreib …“ – „Pinnwand wieder in Standardfarbe“ ist kein Zettel
  const pin = t.match(/^schreib\w*\s+(?:(?:an|auf|in)\s+die\s+)?pinnwand\s*[:,]?\s+(.+)$/i) ?? t.match(/^(?:(?:an|auf|in)\s+die\s+)?pinnwand\s*[:,]\s*(.+)$/i) ?? t.match(/^(?:schreib\w*\s+)?an\s+alle\s*[:,]\s*(.+)$/i);
  if (pin) text = clean(pin[1]);
  const sag = t.match(/^sag\s+(\p{L}+)\s*[,:]?\s+(?:dass\s+)?(.+)$/iu);
  if (!text && sag) {
    const person = ctx.persons.find((p, i) => i > 0 && p.name.toLowerCase() === sag[1].toLowerCase());
    if (!person || re("soll\\w*|muss\\w*|kann\\w*|bitte").test(sag[2])) return null;
    text = `${person.name}, ${clean(sag[2])}`;
  }
  if (!text || text.length < 2) return null;
  return [{ id: "sofort-1", type: "add_pin", text: cap(text).slice(0, PIN_MAX) }];
}

/** Ausdrückliche Uhrzeit („16 Uhr“, „8:15“, „halb drei“, „um 9“) – „abends“ allein reicht nicht */
const UHRZEIT = re("\\d{1,2}\\s*uhr|\\d{1,2}[:.]\\d{2}|halb\\s+\\w+|viertel\\s+(?:nach|vor)\\s+\\w+|um\\s+\\d{1,2}");

const gleich = (a: string, b: string) => {
  const k = (s: string) => s.toLowerCase().replace(/[^a-zäöüß]/g, "");
  return k(a).startsWith(k(b).slice(0, 5)) || k(b).startsWith(k(a).slice(0, 5));
};

/** Steht schon so drin? (gleicher Tag, ähnlicher Titel) */
function schonDa(ctx: SofortKontext, date: string, title: string): boolean {
  return ctx.entries.some((e) => e.typ === "termin" && e.data.date === date && gleich(e.data.title, title));
}

/** „Zahnarzt Donnerstag 16 Uhr“, „13 Uhr Zahnarzt“, „morgen halb drei Friseur“ */
function termin(t: string, ctx: SofortKontext): ChangeOp[] | null {
  // Mehrere Dinge („Brot alle und Mathis hat Freitag 15 Uhr Fußball“) oder Spannen: die KI
  if (!UHRZEIT.test(t) || re("erinner\\w*|bis|vom|ab|und|alle|leer|sowie|plus").test(t) || splitTermine(t, ctx.today).length > 1) return null;
  const cmd = parseCalendar(t, ctx.today, ctx.persons);
  if (cmd?.kind !== "create" || cmd.draft.typ !== "termin" || raumUnklar(t, hilfen(ctx))) return null;
  const d = cmd.draft.data;
  const satz = readSentence(t, ctx.today);
  // Ohne Tag = heute, aber nicht, wenn die Uhrzeit schon vorbei ist (morgen gemeint?)
  if (!satz.date && Number(d.start.slice(0, 2)) * 60 + Number(d.start.slice(3, 5)) <= ctx.nowMinutes) return null;
  // Tageszeit-Wörter gehören nicht in den Titel („heute abend 20 uhr kino“ → „Kino“)
  const title = cap(clean(d.title.replace(re("abends?|morgens|früh|vormittags?|nachmittags?|mittags?", "gi"), " ").replace(/^(?:zum|zur|zu|beim|bei|den|die|das)\s+/i, "")));
  if (title.length < 2 || title.split(" ").length > 5 || schonDa(ctx, d.date, title)) return null;
  return [{ id: "sofort-1", type: "upsert_entry", isNew: true, entry: createEntry("termin", { ...d, title }, { raum: guessRoom(t, "termin", hilfen(ctx)) }) as CalendarEntry }];
}

/** Tätigkeiten am Ende („Tim antworten“, „Rechnung bezahlen“, „Kita-Formular abgeben“) */
const TAETIGKEIT = re(
  "anrufen|zurückrufen|antworten|beantworten|bezahlen|überweisen|abholen|wegbringen|zurückbringen|hinbringen|schicken|abschicken|verschicken|senden|erledigen|machen|kündigen|beantragen|abgeben|ausfüllen|unterschreiben|buchen|reservieren|vereinbaren|abmelden|anmelden|ummelden|verlängern|zurückgeben|reparieren|putzen|aufräumen|ausmisten|waschen|einreichen|drucken|ausdrucken|fragen|anschreiben|melden|klären|prüfen|checken|wechseln|tauschen|einpacken|vorbereiten|organisieren|suchen|abschließen|entkalken|gießen|staubsaugen|bügeln",
);

/** „Erinner mich morgen an den Müll“, „Steuerberater anrufen“, „Freitag KFZ-Steuer überweisen“ */
function aufgabe(t: string, ctx: SofortKontext): ChangeOp[] | null {
  const erinnern = /^(?:bitte\s+)?erinner\w*\s+(?:mich|uns)\s+/i.test(t);
  if (!erinnern) {
    const kern = t.replace(/^(?:dringend|wichtig)\s*[:!]\s*/i, "").replace(/^(?:ich\s+muss|wir\s+müssen|muss)\s+(?:noch\s+)?/i, "").replace(/^noch\s+/i, "");
    const m = kern.match(new RegExp(`^(.{2,50}?)\\s+(${TAETIGKEIT.source})[.!]?$`, "i"));
    if (!m || UHRZEIT.test(t)) return null;
    // Erstes Wort ist selbst ein Befehl („Schreib …“, „Setz …“, „Pack …“) oder eine Person soll etwas: die KI
    if (/^(schreib|setz|pack|kauf|bestell|hol|bring|trag|mach|sag|gib|leg|stell|lass)\w*\s/i.test(kern) || ctx.persons.some((p) => new RegExp(`^${p.name}\\s+(soll|muss)`, "i").test(kern))) return null;
  } else if (re("an\\s+(?:den|die|das|meine?n?|unsere?n?)|daran|dass|zu").test(t) === false) return null;
  const read = readQuickText(t, ctx.today);
  const title = cap(
    clean(
      read.title
        .replace(/^(?:erinner\w*\s+(?:mich|uns)\s+(?:bitte\s+)?(?:daran,?\s+)?(?:an\s+)?|ich\s+muss\s+(?:noch\s+)?|noch\s+)/i, "")
        .replace(/^(?:(?:irgendwann|mal|noch|bald|diese\s+woche)\s+)+/i, "")
        .replace(/^(den|die|das)\s+/i, ""),
    ),
  );
  if (title.length < 2 || title.split(" ").length > 6 || raumUnklar(t, hilfen(ctx))) return null;
  const time = read.time;
  // Uhrzeit nur beim „Erinner mich …“ (sonst ist es ein Termin)
  if (time && !erinnern) return null;
  const data = quickTaskData(title, read.when ?? "heute", ctx.today, { ...(time ? { time, reminder: "15" as const } : {}), ...(read.label ? { label: read.label } : {}), ...(read.urgent ? { dringend: true } : {}) });
  return [{ id: "sofort-1", type: "upsert_entry", isNew: true, entry: createEntry("aufgabe", data, { raum: guessRoom(t, "aufgabe", hilfen(ctx)) }) as CalendarEntry }];
}

/** Was hat die App gemacht? (für die Prüfung durch die KI, kurz) */
function was(art: SofortArt, ops: ChangeOp[]): string {
  const op = ops[0];
  if (op.type === "add_shopping") return `Einkaufsliste: ${ops.map((o) => (o.type === "add_shopping" ? `${o.name}${o.shop ? ` (${o.shop})` : ""}` : "")).join(", ")}`;
  if (op.type === "add_timer") return `Timer ${op.minutes} Minuten${op.name ? ` „${op.name}“` : ""}`;
  if (op.type === "add_pin") return `Pinnwand: ${op.text}`;
  if (op.type === "upsert_note") return `Notiz „${op.note.data.title}“`;
  if (op.type === "upsert_entry") {
    const e = op.entry;
    return e.typ === "termin" ? `Termin „${e.data.title}“ am ${e.data.date} um ${e.data.start}` : `Aufgabe „${e.data.title}“ ab ${e.data.date}${e.data.time ? ` ${e.data.time}, mit Erinnerung` : ""}`;
  }
  return art;
}

/** Eindeutiger Kurzbefehl → sofort erledigen; sonst null (die KI macht es) */
export function sofortErkennen(text: string, ctx: SofortKontext): Sofort | null {
  const t = ohneFuellwoerter(text).replace(/^(?:moin|hey|hallo|okay|ok)[,!]?\s+/i, "");
  if (!t || t.length > 90 || /[?\n]/.test(t) || t.startsWith("[")) return null;
  // Genau EINE Sache (das Komma nach „Notier dir,“ / „Sag Lisa,“ trennt nichts)
  if (mehrteilig(t.replace(/^((?:bitte\s+)?(?:notier\w*(?:\s+(?:dir|mir))?|merk\s+dir|sag\s+\p{L}+|schreib\w*\s+(?:dir\s+)?auf))\s*,/iu, "$1"))) return null;
  if (NIE.test(t)) return null;
  // „Zettel für alle sichtbar machen“ ist Bedienung der Pinnwand (Tafel 123), keine Aufgabe
  if (pinForAllCommand(t) !== null) return null;
  const treffer = (
    [
      ["timer", timer(t)],
      ["notiz", notiz(t)],
      ["pinnwand", pinnwand(t, ctx)],
      ["einkauf", einkaufErkennen(t, ctx)],
      ["termin", termin(t, ctx)],
      ["aufgabe", aufgabe(t, ctx)],
    ] as [SofortArt, ChangeOp[] | null][]
  ).filter((x): x is [SofortArt, ChangeOp[]] => x[1] !== null && x[1].length > 0);
  // Ausdrücklich angesagt („Timer …“, „Notier …“, „Pinnwand: …“) geht vor („Pinnwand: Bin um 20 Uhr da“ ist kein Termin)
  const angesagt = treffer.filter(([art]) => art === "timer" || art === "notiz" || art === "pinnwand");
  if (angesagt.length === 1) return antwort(angesagt[0][0], angesagt[0][1], ctx);
  // Nie raten: genau eine Lesart
  if (treffer.length !== 1) return null;
  return antwort(treffer[0][0], treffer[0][1], ctx);
}

const antwort = (art: SofortArt, ops: ChangeOp[], ctx: SofortKontext): Sofort => ({ art, ops, reply: kurzeBestaetigung(ops, ctx.today), was: was(art, ops) });
