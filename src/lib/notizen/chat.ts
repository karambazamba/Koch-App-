// Notizen im Gespräch – ohne KI (lokaler Chat, Testmodus) und als Hilfe für
// Lottes Werkzeuge: "Merk dir …" erkennen, die passende Liste finden
// ("Mathis wünscht sich …" → Geschenkideen), Antworten formulieren.

import type { Note } from "./model";
import { findNote } from "./model";

export type NoteCommand =
  | { kind: "create"; title: string; text?: string; items?: string[] }
  | { kind: "add"; list: string; items: string[] }
  | { kind: "show"; query: string }
  | { kind: "show_all" }
  | { kind: "pin"; query: string; on: boolean }
  | { kind: "tasks"; open: boolean };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s: string) => s.trim().replace(/^[„"']|[“"'.!]+$/g, "").trim();
const splitItems = (s: string) =>
  s
    .split(/,|;|\bund\b|\n/)
    .map(clean)
    .filter(Boolean);

/** Zu welcher Liste gehört ein Gedanke? ("… wünscht sich …" → Geschenkideen) */
export function listFor(content: string): { list: string; item: string } | null {
  const wish = content.match(/^([A-ZÄÖÜ][\wäöüß]+)\s+wünscht\s+sich\s+(?:zum\s+\w+\s+)?(.+)$/);
  if (wish && !/\b(essen|kochen|pfannkuchen|pizza|nudeln|spaghetti|lasagne|pommes)\b/i.test(wish[2])) return { list: "Geschenkideen", item: `${cap(clean(wish[2]))} (für ${wish[1]})` };
  const gift = content.match(/^(?:geschenk(?:idee)?\s+für\s+([A-ZÄÖÜ][\wäöüß]+)\s*:?\s*)(.+)$/i);
  if (gift) return { list: "Geschenkideen", item: `${cap(clean(gift[2]))} (für ${gift[1]})` };
  const onList = content.match(/^(.+?)\s+(?:auf|in)\s+(?:die|meine|unsere)\s+([\wäöüß-]*liste)$/i);
  if (onList) return { list: cap(onList[2]), item: clean(onList[1]) };
  const named = content.match(/^([\wäöüß-]*liste)\s*:\s*(.+)$/i);
  if (named) return { list: cap(named[1]), item: named[2] };
  return null;
}

/** Satz zu Notizen/Aufgaben-Übersicht – oder null */
export function parseNoteCommand(text: string): NoteCommand | null {
  const t = text.trim().replace(/\s+/g, " ");
  // "Was muss ich heute noch erledigen?" / "Zeig mir meine Aufgaben"
  if (/\b(was muss ich|was müssen wir|meine aufgaben|unsere aufgaben|was (ist|steht) (heute |diese woche )?(noch )?zu (tun|erledigen))\b/i.test(t)) return { kind: "tasks", open: /\bzeig\w*\b/i.test(t) };
  if (/^(zeig|öffne)\w*( mir)? (meine|unsere|die) notizen\b/i.test(t)) return { kind: "show_all" };
  // "Häng das WLAN oben an" / "Lös die Packliste ab"
  let m = t.match(/^(?:bitte\s+)?(?:häng|heft|pinn)\w*\s+(?:mir\s+)?(.+?)\s+(?:oben\s+)?(?:an|fest)[.!]?$/i);
  if (m) return { kind: "pin", query: m[1], on: true };
  m = t.match(/^(?:bitte\s+)?(?:lös|nimm)\w*\s+(.+?)\s+(?:oben\s+)?(?:ab|weg von oben)[.!]?$/i);
  if (m && !/\bliste\b.*\bvon\b/i.test(t)) return { kind: "pin", query: m[1], on: false };
  // "Was steht auf der Packliste?" / "Was ist das WLAN-Passwort?"
  m = t.match(/^was\s+steht\s+(?:auf|in)\s+(?:der|die|meiner|unserer|den)\s+(.+?)\??$/i);
  if (m) return { kind: "show", query: m[1] };
  m = t.match(/^(?:was|wie)\s+(?:ist|war|lautet)\s+(?:noch\s+mal\s+|nochmal\s+)?(?:das|der|die|unser|unsere|mein|meine)\s+(.+?)\??$/i);
  if (m && /passwort|wlan|pin|code|nummer|adresse|liste|ideen/i.test(m[1])) return { kind: "show", query: m[1] };
  m = t.match(/^zeig\w*(?:\s+mir)?\s+(?:die|meine|unsere|den)\s+(.+?liste|.+?ideen)\??$/i);
  if (m) return { kind: "show", query: m[1] };
  // "Idee fürs Café: Mango-Sorbet" → Liste "Ideen Café"
  m = t.match(/^idee\s+(?:für\s+(?:das|den|die)\s+|fürs\s+|für\s+)?(.+?)\s*:\s*(.+)$/i);
  if (m) return { kind: "add", list: `Ideen ${cap(m[1].replace(/^(das|den|die)\s+/i, ""))}`, items: splitItems(m[2]) };
  m = t.match(/^idee\s*:\s*(.+)$/i);
  if (m) return { kind: "add", list: "Ideen", items: splitItems(m[1]) };
  // "Merk dir …" / "Notier …" / "Schreib dir auf …"
  m = t.match(/^(?:bitte\s+)?(?:merk\w*\s+(?:dir|euch)|notier\w*(?:\s+dir)?|schreib\w*\s+(?:dir|mir)\s+auf|halt\w*\s+fest)\s*[:,]?\s*(?:dass\s+)?(.+)$/i);
  if (!m) return null;
  const content = m[1].trim();
  const target = listFor(content);
  if (target) return { kind: "add", list: target.list, items: splitItems(target.item).length > 1 && !target.item.includes("(für") ? splitItems(target.item) : [target.item] };
  // "das WLAN-Passwort: abc123" / "der Code vom Fahrradschloss ist 4711"
  const kv = content.match(/^(?:das|der|die|unser|unsere|mein|meine)?\s*(.{2,40}?)\s*(?::|\bist\b|\blautet\b)\s*(.+)$/i);
  // Den Inhalt nicht kürzen (Passwörter dürfen auf "!" enden), nur Anführungszeichen weg
  if (kv && !/\s(dass|weil|wenn)\s/i.test(kv[1])) return { kind: "create", title: cap(clean(kv[1])), text: kv[2].trim().replace(/^[„"']|[“"']$/g, "") };
  const words = content.split(" ");
  return { kind: "create", title: cap(clean(words.slice(0, 5).join(" "))) + (words.length > 5 ? " …" : ""), text: cap(content) };
}

const joinList = (parts: string[]) => (parts.length <= 1 ? parts.join("") : `${parts.slice(0, -1).join(", ")} und ${parts[parts.length - 1]}`);

/** "Auf der Packliste: …" bzw. "WLAN-Passwort: …" */
export function noteAnswer(note: Note): string {
  const d = note.data;
  if (d.kind === "liste") {
    const open = (d.items ?? []).filter((i) => !i.done).map((i) => i.text);
    const done = (d.items ?? []).filter((i) => i.done).length;
    if (!open.length) return done ? `${d.title}: alles abgehakt ✓` : `${d.title} ist noch leer.`;
    return `${d.title}: ${joinList(open.slice(0, 12))}${open.length > 12 ? " und noch ein paar mehr" : ""}.${done ? ` (${done} schon abgehakt)` : ""}`;
  }
  return `${d.title}: ${(d.text ?? "").trim() || "(leer)"}`;
}

/** Notiz zu einer Frage finden ("der Packliste", "das WLAN-Passwort") */
export const noteFor = (notes: Note[], query: string) => findNote(notes, query.replace(/[-]/g, " "));
