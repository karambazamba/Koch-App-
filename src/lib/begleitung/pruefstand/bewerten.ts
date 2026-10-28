// Prüfstand bewerten (rein): richtige Aktion, richtige Daten (Datum/Uhrzeit/
// Person, Raum), Länge (Aktion 2 Sätze, Ratgeber/Zusammenfassung 3), höchstens
// eine Rückfrage, keine Floskeln, Striche, Bedienungs-Erklärungen oder
// vorgegebenen Gefühle, Antwortzeit (Warnung ab 6 s, Fehler ab 10 s). Ziel:
// ≥ 95 % richtig, bevor eine neue Mia-Version rausgeht.

import type { AssistantReply } from "@/lib/begleitung/protocol";
import { MENSCHLICH, UI_ERKLAERUNG } from "@/lib/begleitung/tidy";
import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";

export type PruefErgebnis = { text: string; ok: boolean; gruende: string[]; ms: number; antwort: string; ops: string[]; warnung?: string };

const FLOSKELN = /gern geschehen|wenn du noch (etwas|was) brauchst|natürlich!|gute frage|ich hoffe,? das hilft|lass es mich wissen/i;
const STRICH = /(?<=[\wäöüß.?!])\s[–—]\s(?=\S)|(^|\n)\s*[-•]\s/;

/** Abkürzungen, deren Punkt kein Satzende ist */
const ABK = /(?<![a-zäöüß])(ca|bzw|ggf|usw|evtl|inkl|mind|nr|std|etc|vs)\./gi;
/** Wochentage/Monate nur vor Zahl, Komma oder kleinem Wort („Mi. 25.10.“, „Okt., also“) – „Machen wir so. Morgen …“ bleibt ein Satzende */
const ABK_TAG = new RegExp(
  `(?<![a-zäöüßA-ZÄÖÜ])(${["mo", "di", "mi", "do", "fr", "sa", "so", "jan", "feb", "mär", "apr", "jun", "jul", "aug", "sep", "sept", "okt", "nov", "dez"].map((w) => `[${w[0]}${w[0].toUpperCase()}]${w.slice(1)}`).join("|")})\\.(?=\\s*[\\d,]|\\s+[a-zäöüß])`,
  "g",
);

/** Sätze zählen: Abkürzungen („z. B.“, „ca.“, „Mi.“), Daten („30.“, „25.10.“, „1.11.“) und Uhrzeiten zählen nicht als Satzende */
export function sentenceCount(text: string): number {
  const t = text
    .replace(/\(Testmodus\)/g, "")
    .replace(/(?<![a-zäöüß])(z|u|d|o)\. ?[a-zäöü]\./gi, "x")
    .replace(ABK, "$1")
    .replace(ABK_TAG, "$1")
    .replace(/(?<!\d)\d{1,2}\.\d{1,2}\.(\d{2,4})?/g, "0")
    .replace(/(?<!\d)\d{1,2}\.(?=\s*[a-zäöüß\d])/gi, "0")
    .replace(/\d+[.:]\d+/g, "0");
  return t.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 1).length;
}

const DOPPELT = /schon (drin|eingetragen|im kalender)|steht schon|hast du schon|ist schon da|gibt('?s| es) schon/i;

/** Datum/Uhrzeit/Person aus den Termin- bzw. Aufgaben-Vorschlägen */
function entryFacts(reply: AssistantReply): { dates: string[]; ends: string[]; times: string[]; rooms: string[]; text: string } {
  const entries = reply.ops.flatMap((op) => (op.type === "upsert_entry" ? [op.entry] : []));
  const dates = entries.flatMap((e) => {
    // Aufgaben speichern die Frist als `due` (Fehler: „bis Freitag“ zählte nie)
    const d = e.data as { date?: string; due?: string; frist?: string; wunschtag?: string };
    return [d.date, d.due, d.frist, d.wunschtag].filter((x): x is string => typeof x === "string");
  });
  const ends = entries.flatMap((e) => {
    const d = e.data as { endDate?: string };
    return typeof d.endDate === "string" ? [d.endDate] : [];
  });
  const times = entries.flatMap((e) => {
    const d = e.data as { start?: string; time?: string };
    return [d.start, d.time].filter((x): x is string => typeof x === "string");
  });
  return { dates, ends, times, rooms: entries.map((e) => e.raum), text: JSON.stringify(entries) };
}

export function bewerte(satz: PruefSatz, reply: AssistantReply, ms: number): PruefErgebnis {
  const gruende: string[] = [];
  const types = [...new Set(reply.ops.map((op) => op.type as string))];
  const has = (want: string) =>
    want === "mail_draft"
      ? Boolean(reply.mail)
      : want === "kann_nicht"
        ? Boolean(reply.wishes?.length) || /kann ich noch nicht/i.test(reply.reply)
        : want === "antwort"
          ? types.length === 0 && Boolean(reply.reply.trim())
          : want === "hinweis_doppelt"
            ? types.length === 0 && DOPPELT.test(reply.reply)
            : want === "kommt_bald"
              ? types.length === 0 && /kommt bald/i.test(reply.reply)
              : want === "rueckfrage"
                ? types.length === 0 && reply.reply.includes("?")
                : types.includes(want);
  if (satz.ops.length === 0) {
    if (types.length) gruende.push(`unerwartete Aktion: ${types.join(", ")}`);
    if (!reply.reply.trim()) gruende.push("keine Antwort");
  } else if (satz.alle ? !satz.ops.every(has) : !satz.ops.some(has)) gruende.push(`Aktion nicht getroffen (erwartet ${satz.ops.join(satz.alle ? " und " : " oder ")}, bekommen ${types.join(", ") || "keine"})`);
  if (satz.woerter && reply.reply.trim().split(/\s+/).filter(Boolean).length > satz.woerter) gruende.push(`mehr als ${satz.woerter} Wörter`);
  if (satz.datum || satz.zeit || satz.person || satz.bis || satz.raum) {
    const facts = entryFacts(reply);
    if (satz.datum && !facts.dates.includes(satz.datum)) gruende.push(`Datum ${satz.datum} nicht getroffen (${facts.dates.join(", ") || "keins"})`);
    if (satz.bis && !facts.ends.includes(satz.bis)) gruende.push(`bis ${satz.bis} nicht getroffen (${facts.ends.join(", ") || "eintägig"})`);
    if (satz.zeit && !facts.times.includes(satz.zeit)) gruende.push(`Uhrzeit ${satz.zeit} nicht getroffen (${facts.times.join(", ") || "keine"})`);
    if (satz.raum && !facts.rooms.includes(satz.raum)) gruende.push(`Raum ${satz.raum} nicht getroffen (${facts.rooms.join(", ") || "keiner"})`);
    if (satz.person && !facts.text.includes(satz.person) && !reply.reply.includes(satz.person)) gruende.push(`Person ${satz.person} nicht erkannt`);
  }
  if (satz.laden) {
    const shops = reply.ops.filter((op) => op.type === "add_shopping" || op.type === "set_shop_rule").map((op) => ("shop" in op ? String(op.shop ?? "") : ""));
    if (!shops.length || shops.some((x) => x.trim().toLowerCase() !== satz.laden!.toLowerCase())) gruende.push(`Laden ${satz.laden} nicht getroffen (${shops.join(", ") || "keiner"})`);
  }
  if (satz.nieName) {
    const re = new RegExp(satz.nieName, "i");
    const bad = reply.ops.map((op) => ("name" in op && typeof op.name === "string" ? op.name : "")).filter((n) => n && re.test(n));
    if (bad.length) gruende.push(`Satzteil als Sache: ${bad.join(", ")}`);
  }
  if (satz.privat !== undefined) {
    const pins = reply.ops.flatMap((op) => (op.type === "add_pin" ? [op] : []));
    if (pins.some((op) => (op.privat === true) !== satz.privat)) gruende.push(satz.privat ? "nicht „Nur für mich“" : "ungefragt „Nur für mich“");
  }
  const einkauf = reply.ops.flatMap((op) => (op.type === "add_shopping" ? [op] : []));
  if (satz.anzahl !== undefined && einkauf.length !== satz.anzahl) gruende.push(`${einkauf.length} statt ${satz.anzahl} Sachen (${einkauf.map((op) => op.name).join(", ") || "keine"})`);
  if (satz.menge && !einkauf.some((op) => op.amount.trim().startsWith(satz.menge!))) gruende.push(`Menge ${satz.menge} nicht übernommen`);
  if (satz.nennt && !reply.reply.toLowerCase().includes(satz.nennt.toLowerCase())) gruende.push(`nennt ${satz.nennt} nicht`);
  if (satz.nenntNie && reply.reply.toLowerCase().includes(satz.nenntNie.toLowerCase())) gruende.push(`nennt ${satz.nenntNie} (zu alt)`);
  const max = satz.max ?? 2;
  if (sentenceCount(reply.reply) > max) gruende.push(`mehr als ${max} Sätze`);
  if ((reply.reply.match(/\?/g) ?? []).length > 1) gruende.push("mehr als eine Rückfrage");
  if (FLOSKELN.test(reply.reply)) gruende.push("Floskel");
  if (STRICH.test(reply.reply)) gruende.push("Gedanken- oder Spiegelstrich");
  if (UI_ERKLAERUNG.test(reply.reply)) gruende.push("erklärt die Oberfläche");
  if (MENSCHLICH.test(reply.reply)) gruende.push("tut so, als wäre sie ein Mensch");
  const sek = Math.round(ms / 100) / 10;
  if (ms >= 10_000) gruende.push(`langsam (${sek} s)`);
  return { text: satz.text, ok: gruende.length === 0, gruende, ms, antwort: reply.reply, ops: types, ...(ms >= 6000 && ms < 10_000 ? { warnung: `etwas langsam (${sek} s)` } : {}) };
}

/** Anteil richtig in Prozent (gerundet) */
export const quote = (results: PruefErgebnis[]) => (results.length ? Math.round((results.filter((r) => r.ok).length / results.length) * 100) : 0);
