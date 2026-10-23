// Prüfstand bewerten (rein): richtige Aktion, richtige Daten (Datum/Uhrzeit/
// Person), höchstens 2 Sätze, keine Floskeln oder Striche, Antwortzeit. Ziel:
// ≥ 95 % richtig, bevor eine neue Mia-Version rausgeht.

import type { AssistantReply } from "@/lib/begleitung/protocol";
import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";

export type PruefErgebnis = { text: string; ok: boolean; gruende: string[]; ms: number; antwort: string; ops: string[] };

const FLOSKELN = /gern geschehen|wenn du noch (etwas|was) brauchst|natürlich!|gute frage|ich hoffe,? das hilft|lass es mich wissen/i;
const STRICH = /(?<=[\wäöüß.?!])\s[–—]\s(?=\S)|(^|\n)\s*[-•]\s/;

/** Sätze zählen (Abkürzungen wie „z. B.“ und Uhrzeiten zählen nicht) */
export function sentenceCount(text: string): number {
  const t = text.replace(/\b(z|u|d|o)\. ?[a-zäöü]\./gi, "x").replace(/\d+\.\d+/g, "0").replace(/\(Testmodus\)/g, "");
  return t.split(/[.!?]+(?:\s|$)/).filter((s) => s.trim().length > 1).length;
}

/** Datum/Uhrzeit/Person aus den Termin- bzw. Aufgaben-Vorschlägen */
function entryFacts(reply: AssistantReply): { dates: string[]; times: string[]; text: string } {
  const entries = reply.ops.flatMap((op) => (op.type === "upsert_entry" ? [op.entry] : []));
  const dates = entries.flatMap((e) => {
    const d = e.data as { date?: string; frist?: string; wunschtag?: string };
    return [d.date, d.frist, d.wunschtag].filter((x): x is string => typeof x === "string");
  });
  const times = entries.flatMap((e) => {
    const d = e.data as { start?: string; time?: string };
    return [d.start, d.time].filter((x): x is string => typeof x === "string");
  });
  return { dates, times, text: JSON.stringify(entries) };
}

export function bewerte(satz: PruefSatz, reply: AssistantReply, ms: number): PruefErgebnis {
  const gruende: string[] = [];
  const types = [...new Set(reply.ops.map((op) => op.type as string))];
  const has = (want: string) => (want === "mail_draft" ? Boolean(reply.mail) : want === "kann_nicht" ? Boolean(reply.wishes?.length) || /kann ich noch nicht/i.test(reply.reply) : types.includes(want));
  if (satz.ops.length === 0) {
    if (types.length) gruende.push(`unerwartete Aktion: ${types.join(", ")}`);
    if (!reply.reply.trim()) gruende.push("keine Antwort");
  } else if (!satz.ops.some(has)) gruende.push(`Aktion nicht getroffen (erwartet ${satz.ops.join(" oder ")}, bekommen ${types.join(", ") || "keine"})`);
  if (satz.datum || satz.zeit || satz.person) {
    const facts = entryFacts(reply);
    if (satz.datum && !facts.dates.includes(satz.datum)) gruende.push(`Datum ${satz.datum} nicht getroffen (${facts.dates.join(", ") || "keins"})`);
    if (satz.zeit && !facts.times.includes(satz.zeit)) gruende.push(`Uhrzeit ${satz.zeit} nicht getroffen (${facts.times.join(", ") || "keine"})`);
    if (satz.person && !facts.text.includes(satz.person) && !reply.reply.includes(satz.person)) gruende.push(`Person ${satz.person} nicht erkannt`);
  }
  if (sentenceCount(reply.reply) > 2) gruende.push("mehr als 2 Sätze");
  if (FLOSKELN.test(reply.reply)) gruende.push("Floskel");
  if (STRICH.test(reply.reply)) gruende.push("Gedanken- oder Spiegelstrich");
  if (ms > 8000) gruende.push(`langsam (${Math.round(ms / 100) / 10} s)`);
  return { text: satz.text, ok: gruende.length === 0, gruende, ms, antwort: reply.reply, ops: types };
}

/** Anteil richtig in Prozent (gerundet) */
export const quote = (results: PruefErgebnis[]) => (results.length ? Math.round((results.filter((r) => r.ok).length / results.length) * 100) : 0);
