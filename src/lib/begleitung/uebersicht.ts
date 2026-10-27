// Mehreres auf einmal = kurze Übersicht: Erledigt Mia mit einer Antwort zwei
// oder mehr Dinge sofort, sagt sie nur „Erledigt.“ (Vorlesen auch) und die App
// zeigt darunter eine kompakte Karte (`MiaDoneCard`): Gruppen in fester
// Reihenfolge (Termine, Aufgaben, Einkaufsliste, dann der Rest), je Gruppe die
// Einträge in einer Zeile mit „·“. Keine Zahlen (Ohne Druck). Rein, damit testbar.

import { doneLine } from "@/lib/begleitung/miaDone";
import type { ChangeOp } from "@/lib/begleitung/ops";

export type DoneGroupId = "termine" | "aufgaben" | "einkauf" | "pinnwand" | "notizen" | "essen" | "familie" | "haus";
export type DoneGroup = { id: DoneGroupId; label: string; items: string[]; href: string | null };

const GROUPS: { id: DoneGroupId; label: string }[] = [
  { id: "termine", label: "Termine" },
  { id: "aufgaben", label: "Aufgaben" },
  { id: "einkauf", label: "Einkaufsliste" },
  { id: "pinnwand", label: "Pinnwand" },
  { id: "notizen", label: "Notizen" },
  { id: "essen", label: "Essen" },
  { id: "haus", label: "Im Haus" },
  { id: "familie", label: "Familie" },
];

const WD = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
/** „Mo 10:00 Zahnarzt“ – Tag aus dem Datum (nicht „jetzt“), ganztägig ohne Uhrzeit */
const terminText = (date: string, start: string | undefined, title: string) => [WD[new Date(`${date}T12:00:00Z`).getUTCDay()], start, title].filter(Boolean).join(" ");

function place(op: ChangeOp): { id: DoneGroupId; text: string } | null {
  switch (op.type) {
    case "upsert_entry": {
      const d = op.entry.data as { title: string; date?: string; start?: string };
      return op.entry.typ === "termin" && d.date ? { id: "termine", text: terminText(d.date, d.start, d.title) } : { id: "aufgaben", text: d.title };
    }
    case "done_entry":
      return { id: "aufgaben", text: `${op.title} abgehakt` };
    case "add_shopping":
      return { id: "einkauf", text: op.name };
    case "set_shop_rule":
      return { id: "einkauf", text: op.shop ? `${op.name} → ${op.shop}` : `${op.name} egal wo` };
    case "add_pin":
      return { id: "pinnwand", text: "Nachricht" };
    case "upsert_note":
      return { id: "notizen", text: op.note.data.title };
    case "add_wish":
      return { id: "essen", text: `Wunsch: ${op.dish}` };
    case "add_pantry":
    case "use_pantry":
      return { id: "haus", text: op.name };
    case "set_dislike":
      return { id: "familie", text: op.mag ? `${op.who} mag wieder ${op.term}` : `${op.who} mag kein ${op.term}` };
    default:
      return null;
  }
}

/** Gruppen in fester Reihenfolge; Antippen öffnet die Seite des ersten Eintrags */
export function doneGroups(ops: ChangeOp[]): DoneGroup[] {
  const out = new Map<DoneGroupId, DoneGroup>();
  for (const op of ops) {
    const p = place(op);
    if (!p) continue;
    const g = out.get(p.id) ?? { id: p.id, label: GROUPS.find((x) => x.id === p.id)!.label, items: [], href: doneLine(op)?.href ?? null };
    if (!g.items.includes(p.text)) g.items.push(p.text);
    out.set(p.id, g);
  }
  return GROUPS.map((g) => out.get(g.id)).filter((g): g is DoneGroup => Boolean(g));
}

/** Wie viele Dinge die Übersicht zeigt (ab 2 gibt es sie) */
export const doneCount = (groups: DoneGroup[]) => groups.reduce((n, g) => n + g.items.length, 0);

const SENTENCE = /[^.!?]+[.!?]+/g;
/** Anschlussfragen/Angebote fallen weg („Soll ich noch Erinnerungen setzen?“) */
const OFFER = /^(soll ich|möchtest du|willst du|magst du|brauchst du|darf ich|wollen wir|sollen wir)/i;
/** Was nicht ging, bleibt als ein Satz */
const PROBLEM = /kann ich noch nicht|kommt bald|ging nicht|hat nicht geklappt|gibt es (hier )?nicht/i;

/**
 * Mias Text bei 2+ erledigten Dingen: nur „Erledigt.“ (eigene kurze Fassung
 * bis 2 Wörter bleibt), plus höchstens EIN kurzer Satz, wenn etwas unklar war
 * („Turnen: welche Uhrzeit?“) oder nicht ging.
 */
export function shortDoneReply(reply: string, count: number): string {
  if (count < 2) return reply;
  const text = reply.trim();
  const sentences = (text.match(SENTENCE) ?? [text]).map((s) => s.trim()).filter(Boolean);
  const head = sentences[0] && sentences[0].split(/\s+/).length <= 2 && !sentences[0].endsWith("?") ? sentences[0] : "Erledigt.";
  const extra = sentences.find((s) => (s.endsWith("?") && !OFFER.test(s)) || PROBLEM.test(s));
  return extra && extra !== head ? `${head} ${extra}` : head;
}

/** Für den Verlauf an die KI: was erledigt wurde (der sichtbare Text ist nur „Erledigt.“) */
export const doneSummary = (groups: DoneGroup[]) => groups.map((g) => `${g.label}: ${g.items.join(", ")}`).join("; ");
