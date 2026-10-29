// Modellwahl VOR dem Aufruf (Auftrag „Mia schneller und flüssiger“, rein, ohne
// KI): Haiku ist der Standard für den Alltag (Kurzbefehle, Plaudern, einfache
// Fragen zu Terminen, Liste, Wetter, Essen heute). Sonnet nur, wenn die
// Nachricht oder das Gespräch danach klingt: Planen, Rezepte, Mails, Ideen,
// Ratschläge, ein offener Vorschlag, lange Texte, mehrere Dinge auf einmal,
// der Wochencheck. Hochgeschaltet wird nur noch bei einem echten Fehler
// (Ablehnung, abgeschnitten, KI-Fehler) – nie „erst Haiku, dann Sonnet“.

import type { AssistantRequest } from "@/lib/begleitung/protocol";
import { looksLikeMail } from "@/lib/begleitung/mail";
import { plauderArt } from "@/lib/mia/plaudern";

/**
 * Modell für den Alltag (Haiku) – dieselbe ID für das Gespräch (`/api/lotte`,
 * Prüfstand) und kleine Server-Aufgaben wie den Notfall der Wundertüte;
 * per `LOTTE_SMALL_MODEL` änderbar. Nur auf dem Server aufrufen.
 */
export const alltagsModell = () => process.env.LOTTE_SMALL_MODEL || "claude-haiku-5-5";

/** Klein (Haiku) für den Alltag, groß (Sonnet) für Planen, Rezepte, Mails – oder ein fest eingestelltes Modell */
export type ModelChoice = string | { small: string; large: string };

/**
 * Planen, Rezepte, Mails, Ideen, Ratschläge → gleich das große Modell.
 * „Woche“ allein nicht (Fehler: „Mittwoch nächste Woche um 14 Uhr …“ ging
 * immer zum großen Modell) – nur Wochenplan/Wochencheck/planen.
 */
const LARGE_TOPICS =
  /(?<![a-zäöüß])(wochenplan\w*|wochencheck|planen?|plan(?![a-zäöüß])|rezept\w*|mail\w*|e-mail|antworte|schreib (eine|dem|der|den|an)|vorschl\w*|ideen?|kochen wir|was koch\w*|was mach ich (mit|aus)|essensplan|trainings?\s*plan|trainings planen|räum\w* .*auf|aufräumen|empfiehl\w*|empfehl\w*|rat(?![a-zäöüß])|ratschlag|warum|wieso|weshalb|erklär\w*|vergleich\w*|unterschied)(?![a-zäöüß])/i;

/** Mehrere Dinge auf einmal („… und dann …“, Aufzählung mit Komma und „und“ über mehrere Bereiche) */
const MEHRERES = /(?<![a-zäöüß])und dann(?![a-zäöüß])|,.*(?<![a-zäöüß])und(?![a-zäöüß]).*,/i;

/** Wochencheck (App schickt „[Wochencheck] …“): großes Modell, mehr Ausgabe */
export const isWeekCheck = (req: Pick<AssistantRequest, "messages">) => (req.messages[req.messages.length - 1]?.text ?? "").startsWith("[Wochencheck]");

/** Braucht diese Nachricht selbst das große Modell? (ohne Gesprächsverlauf) */
function largeText(text: string): boolean {
  return text.length > 280 || looksLikeMail(text) || LARGE_TOPICS.test(text) || (text.length > 60 && MEHRERES.test(text));
}

/**
 * Braucht diese Anfrage das große Modell? Die neue Nachricht, ein offener
 * Vorschlag – und der Kontext: Gehörte eine der beiden Nachrichten davor zu
 * einem großen Thema (Planen, Rezept, Mail), ist eine Antwort darauf
 * („Passt“, „Lieber Freitag“) Teil davon.
 */
export function needsLargeModel(req: Pick<AssistantRequest, "messages" | "pending">): boolean {
  if (req.pending.length > 0) return true; // ein offener Vorschlag wird verfeinert
  if (isWeekCheck(req)) return true;
  const users = req.messages.filter((m) => m.role === "user");
  const last = users[users.length - 1]?.text ?? "";
  if (largeText(last)) return true;
  // Kurze Antwort im laufenden großen Thema
  return last.length <= 60 && !isSmallTalk(req) && users.slice(-3, -1).some((m) => LARGE_TOPICS.test(m.text) || looksLikeMail(m.text));
}

/**
 * Klarer Kurzbefehl mit eindeutiger Aktion („Milch auf die Liste“, „Timer 10
 * Minuten“, „Zahnarzt Do 16 Uhr“) – bekommt wenig Aufwand (effort „low“).
 */
export function isShortCommand(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t || t.length > 90 || t.includes("?")) return false;
  if (/(^|\s)(wie|was|warum|wieso|weshalb|welche[rsmn]?|wer|wo|wann|kannst du|könntest|soll ich|sollen wir|hast du|gibt es|meinst du|empfiehl|idee)(\s|$)/.test(t)) return false;
  if (MEHRERES.test(t)) return false;
  return /auf die (einkaufs)?liste|auf den zettel|\bkaufen\b|einkauf|\btimer\b|\bwecker\b|\bstoppuhr\b|\bminuten?\b|erinner|\bpinnwand\b|\bnotier|merk dir|abhaken|erledigt|\bum \d{1,2}([:.]\d{2})?\b|\b\d{1,2}([:.]\d{2})? ?uhr\b|\b(mo|di|mi|do|fr|sa|so)\b|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|morgen|übermorgen|im haus|vorrat/.test(t);
}

/**
 * Kurze Alltagsantwort (Ton-Feinschliff): Danke, Lob, Gruß, „Bin platt“,
 * „Wie geht’s?“. Nach einer Rückfrage von Mia zählt „Passt“ als Antwort darauf.
 */
function isSmallTalk(req: Pick<AssistantRequest, "messages">): boolean {
  const last = req.messages[req.messages.length - 1]?.text ?? "";
  const before = [...req.messages].reverse().find((m, i) => i > 0 && m.role === "assistant")?.text ?? "";
  return plauderArt(last, before) !== null;
}

/** Frage oder Ratschlag (dann denkt das große Modell etwas gründlicher: effort „medium“) */
export const isQuestion = (text: string) => /\?|^(wie|was|warum|wieso|welche|wer|wo|wann|kannst du|soll ich|hast du|gibt es)\b/i.test(text.trim());

/** Das Modell für diese Anfrage – einmal, vor dem Aufruf */
export function chooseModel(req: Pick<AssistantRequest, "messages" | "pending">, choice: ModelChoice): string {
  if (typeof choice === "string") return choice;
  return needsLargeModel(req) ? choice.large : choice.small;
}

/**
 * Aufwand je Modell: Haiku denkt beim Alltag kurz (low) statt im Standard
 * (medium) – das spart die meiste Wartezeit. Sonnet: Fragen/Ratschläge
 * medium, Aktionen low.
 */
export function effortFor(model: string, text: string): "low" | "medium" {
  if (/haiku/.test(model)) return "low";
  return isQuestion(text) && !isShortCommand(text) ? "medium" : "low";
}
