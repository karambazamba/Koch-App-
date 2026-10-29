// Fokus-Übungen (A-051, Tafel 138/4) – rein:
// - „Eine Sache“: aus der Antwort wird EINE Aufgabe für heute, ganz oben
//   (dringend → steht in der Aufgaben-Liste vor allem anderen), Raum geraten
//   wie überall (`kalender/raum/raten.ts`).
// - „Kopf leeren“ ohne KI (Notlösung): Sätze trennen, jeden Teil über den
//   Sofort-Weg erkennen (Termin, Aufgabe, Einkauf, Notiz …); was übrig bleibt,
//   landet zusammen in EINER Notiz. Mit KI sortiert Mia selbst (`[Kopf leeren]`).

import { createEntry } from "@/lib/core/entries";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { CalendarEntry } from "@/lib/kalender/model";
import { quickTaskData, readQuickText } from "@/lib/kalender/quick";
import { arbeitsWorte, guessRoom, type RaumWort } from "@/lib/kalender/raum/raten";
import { sofortErkennen, type SofortKontext } from "@/lib/begleitung/sofort/erkennen";
import { createNote } from "@/lib/notizen/model";

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Titel aus der Antwort: ohne Füllwörter am Anfang, ohne Satzzeichen am Ende */
export function eineSacheTitel(text: string, today: string): string {
  let t = (readQuickText(text.trim(), today).title || text.trim()).trim();
  const fuell = /^(?:also|äh+m?|hm+|na ja|naja|okay|ok|ich\s+muss\s+(?:noch\s+)?|ich\s+will\s+|erst\s*mal|erst|zuerst|das\s+wichtigste\s+(?:ist\s+)?)(?:[\s,]+|$)/i;
  // Füllwörter am Anfang nacheinander weg („äh also erst mal …“)
  for (let i = 0; i < 6 && fuell.test(t); i++) t = t.replace(fuell, "");
  return cap(t.replace(/^(?:das|den|die|der)\s+/i, "").replace(/[\s.!,]+$/, "").trim()).slice(0, 120);
}

/** „Eine Sache“ → Aufgabe heute, dringend (= ganz oben), Raum geraten; null bei leerer Antwort */
export function eineSacheEintrag(text: string, ctx: { today: string; entries: readonly CalendarEntry[]; gelernt?: readonly RaumWort[] }): CalendarEntry | null {
  const title = eineSacheTitel(text, ctx.today);
  if (title.length < 2) return null;
  const raum = guessRoom(text, "aufgabe", { gelernt: ctx.gelernt ?? [], arbeitWorte: arbeitsWorte(ctx.entries as CalendarEntry[]) });
  return createEntry("aufgabe", quickTaskData(title, "heute", ctx.today, { dringend: true }), { raum }) as CalendarEntry;
}

/** Text in einzelne Gedanken teilen (Zeilen, Sätze) */
export function gedanken(text: string): string[] {
  return text
    .split(/\n+|(?<=[.!;])\s+|\s*;\s*/)
    .map((t) => t.replace(/^[\s,–-]+|[\s.!,;–-]+$/g, "").trim())
    .filter((t) => t.length >= 2);
}

/** „Kopf leeren“ ohne KI: jeder Gedanke über den Sofort-Weg, der Rest als eine Notiz */
export function kopfLeerenOhneKi(text: string, ctx: SofortKontext): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const rest: string[] = [];
  const lies = (teil: string): ChangeOp[] | null => {
    const r = sofortErkennen(teil, ctx);
    return r && r.art !== "durchatmen" ? r.ops : null;
  };
  for (const g of gedanken(text)) {
    const ganz = lies(g);
    if (ganz) {
      ops.push(...ganz);
      continue;
    }
    // „Zahnarzt Freitag 10 Uhr und Steuer machen“ → beide Teile einzeln (nur wenn jeder Teil passt)
    const teile = g.split(/\s*,\s*|\s+und\s+(?:dann\s+)?/i).filter((t) => t.trim().length >= 2);
    const gelesen = teile.length > 1 ? teile.map(lies) : [];
    if (gelesen.length && gelesen.every((x) => x !== null)) ops.push(...gelesen.flatMap((x) => x!));
    else rest.push(cap(g));
  }
  if (rest.length) ops.push({ id: "sofort-1", type: "upsert_note", isNew: true, note: createNote({ title: "Aus dem Kopf", text: rest.join("\n") }) });
  return ops.map((op, i) => ({ ...op, id: `kopf-${i + 1}` }));
}
