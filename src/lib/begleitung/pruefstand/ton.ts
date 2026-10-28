// Prüfstand „Ton“ (Ton-Feinschliff): 30 Alltagssätze – Einkauf, Termine,
// Essen, Danke, Lob, Müdigkeit, Smalltalk, Wetter, ein paar Wissensfragen.
// Geprüft wird nur, wie Mia klingt (rein, testbar): Länge im Limit
// (Alltag ≤ 120 Zeichen, Rat/Wissen ≤ 240, „erklär mal genau“ ohne Grenze),
// keine Floskel aus STEIF, höchstens eine Frage, kein „Ich habe …“-Einstieg.
// Ziel: ≥ 90 %. Läuft über dieselbe geschützte Route und Seite wie der
// Prüfstand (`/api/pruefstand` mit `art: "ton"`, „Für Entwickler“).

import type { AssistantReply } from "@/lib/begleitung/protocol";
import type { PruefErgebnis } from "@/lib/begleitung/pruefstand/bewerten";
import type { Lage } from "@/lib/begleitung/pruefstand/haushalt";
import { ICH_HABE_START, STEIF, TON_LAENGE, willDetails } from "@/lib/mia/persona";

/** alltag = kurze Alltagsantwort, rat = Rat/Wissen, details = ausdrücklich ausführlich */
type TonArt = "alltag" | "rat" | "details";

export type TonSatz = { text: string; art: TonArt; lage?: Lage[] };

export const TON_ZIEL = 90;

const A = (text: string, lage?: Lage[]): TonSatz => ({ text, art: "alltag", ...(lage ? { lage } : {}) });
const R = (text: string): TonSatz => ({ text, art: "rat" });

export const TON_SAETZE: TonSatz[] = [
  // Einkauf
  A("Milch auf die Liste"),
  A("Eier sind alle"),
  A("Brot und Butter noch"),
  A("Was steht auf der Einkaufsliste?"),
  // Termine und Aufgaben
  A("Zahnarzt Donnerstag 16 Uhr", ["ohne-zahnarzt"]),
  A("Morgen um 9 Friseur"),
  A("Was steht heute an?"),
  A("Hab ich morgen Nachmittag Zeit?"),
  A("Kita-Formular bis Freitag"),
  A("Ich muss noch die Reifen machen"),
  // Essen
  A("Was gibt’s heute?", ["plan"]),
  A("Morgen gibt’s Pizza"),
  R("Was koch ich mit Hack?"),
  A("Hab keinen Bock zu kochen"),
  A("Timer 10 Minuten Nudeln"),
  // Danke und Lob
  A("Danke dir"),
  A("Danke, super"),
  A("Du bist die Beste"),
  A("Super gemacht!"),
  // Müdigkeit
  A("Bin total platt"),
  A("War ein langer Tag"),
  // Smalltalk
  A("Moin"),
  A("Wie geht’s dir?"),
  A("Was machst du so?"),
  A("Gute Nacht"),
  // Wetter
  A("Wie wird das Wetter morgen?"),
  A("Brauch ich heute einen Schirm?"),
  // Rat und Wissen
  R("Kann man Reis aufwärmen?"),
  R("Wie lange kocht ein weiches Ei?"),
  { text: "Erklär mal genau, wie man Hefeteig macht", art: "details" },
];

/** Längengrenze in Zeichen – null = ohne Grenze (jemand will ausdrücklich Details) */
export function tonLimit(satz: Pick<TonSatz, "text" | "art">): number | null {
  if (satz.art === "details" || willDetails(satz.text)) return null;
  return satz.art === "rat" ? TON_LAENGE.rat : TON_LAENGE.alltag;
}

/** Was am Ton nicht passt (leer = gut) */
export function tonGruende(satz: Pick<TonSatz, "text" | "art">, antwort: string): string[] {
  const text = antwort.replace(/\(Testmodus\)/g, "").replace(/\s+/g, " ").trim();
  if (!text) return ["keine Antwort"];
  const gruende: string[] = [];
  const limit = tonLimit(satz);
  if (limit !== null && text.length > limit) gruende.push(`zu lang (${text.length} statt höchstens ${limit} Zeichen)`);
  const steif = STEIF.map((re) => text.match(re)?.[0]).filter((m): m is string => Boolean(m));
  if (steif.length) gruende.push(`steif: ${steif.map((m) => `„${m.trim()}“`).join(", ")}`);
  if ((text.match(/\?/g) ?? []).length > 1) gruende.push("mehr als eine Frage");
  if (ICH_HABE_START.test(text)) gruende.push("„Ich habe …“-Einstieg");
  return gruende;
}

export function bewerteTon(satz: TonSatz, reply: AssistantReply, ms: number): PruefErgebnis {
  const gruende = tonGruende(satz, reply.reply);
  return { text: satz.text, ok: gruende.length === 0, gruende, ms, antwort: reply.reply, ops: [...new Set(reply.ops.map((op) => op.type as string))] };
}
