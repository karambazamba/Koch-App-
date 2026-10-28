// Mehreres auf einmal = kurzer Satz: Erledigt Mia mit einer Antwort zwei oder
// mehr Dinge sofort, sagt sie nur „Erledigt.“ (Vorlesen auch); was sie getan
// hat, zeigen darunter die Ergebnis-Karten (`ergebnis.ts`, A-037). Rein.

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
