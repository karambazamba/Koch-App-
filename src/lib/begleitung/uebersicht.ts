// Kurzer Satz zu den Ergebnis-Karten (A-037, Tafel 126): Erledigt Mia mit
// einer Antwort etwas sofort, sagt sie nur „Steht drin.“ (Vorlesen auch); was
// sie getan hat, zeigen darunter die Karten (`ergebnis.ts`). Rein.

const SENTENCE = /[^.!?]+[.!?]+/g;
/** Anschlussfragen/Angebote fallen weg („Soll ich noch Erinnerungen setzen?“) */
const OFFER = /^(soll ich|möchtest du|willst du|magst du|brauchst du|darf ich|wollen wir|sollen wir)/i;
/** Was nicht ging, bleibt als ein Satz */
const PROBLEM = /kann ich noch nicht|kommt bald|ging nicht|hat nicht geklappt|gibt es (hier )?nicht/i;

/** Mias Satz unter den Ergebnis-Karten (wie im Clip) */
const KARTEN_SATZ = "Steht drin.";

/**
 * Mias Text, wenn Karten darunter stehen (1 oder mehr): nur „Steht drin.“
 * (eigene kurze Fassung bis 2 Wörter wie „Is drauf.“ bleibt), plus höchstens
 * EIN kurzer Satz, wenn etwas unklar war („Turnen: welche Uhrzeit?“) oder
 * nicht ging. Ohne Karten bleibt der Text.
 */
export function shortDoneReply(reply: string, count: number): string {
  if (count < 1) return reply;
  const text = reply.trim();
  const sentences = (text.match(SENTENCE) ?? [text]).map((s) => s.trim()).filter(Boolean);
  const head = sentences[0] && sentences[0].split(/\s+/).length <= 2 && !sentences[0].endsWith("?") ? sentences[0] : KARTEN_SATZ;
  const extra = sentences.find((s) => (s.endsWith("?") && !OFFER.test(s)) || PROBLEM.test(s));
  return extra && extra !== head ? `${head} ${extra}` : head;
}
