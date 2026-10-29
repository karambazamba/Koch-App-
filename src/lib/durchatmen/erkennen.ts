// Mia versteht Durchatmen (A-051): „Ich brauch kurz Ruhe“, „Atemübung“,
// „Handy-Pause“, „Kopf leeren“, „Was ist jetzt wichtig?“ → Übung starten.
// Rein. `durchatmenAusSatz` liefert die Übung (oder „vorschlag“ = nach
// Tageszeit) – sonst null. Der Sofort-Weg nimmt nur die eindeutigen Sätze
// (`durchatmenBefehl`, keine Frage), die KI schickt `app_befehl` mit dem Satz.

import { uebungVon } from "@/lib/durchatmen/uebungen";

const V = "(?<![a-zäöüß])";
const W = "(?![a-zäöüß])";
const re = (body: string) => new RegExp(`${V}(?:${body})${W}`, "i");

/** „Lass mich in Ruhe“, „Ruhe da hinten“, „Pause bis …“ (Urlaub) – kein Durchatmen */
const NICHT = re("lass\\w*\\s+(?:mich|uns)\\s+in\\s+ruhe|ruhe\\s+da|ruhetag|ruhezeit|urlaub|ferien|pause\\s+(?:bis|vom|ab|machen\\s+wir)|stopp\\w*|beend\\w*|aus\\s*machen");

const MUSTER: [RegExp, string][] = [
  [re("handy[- ]?pause|bildschirm[- ]?pause|augen[- ]?pause|in\\s+die\\s+ferne\\s+schauen"), "handy-pause"],
  [re("kopf\\s+(?:leer|frei)(?:en|\\s+machen|\\s+kriegen|\\s+bekommen)?|kopf\\s+leeren|gedanken\\s+(?:sortieren|ordnen)|alles\\s+raus\\s+aus\\s+dem\\s+kopf"), "kopf-leeren"],
  [re("was\\s+ist\\s+(?:jetzt|gerade|grad)\\s+(?:am\\s+)?wichtig(?:ste|sten)?|was\\s+(?:ist|wäre)\\s+(?:jetzt\\s+)?das\\s+wichtigste|worauf\\s+(?:soll|sollte)\\s+ich\\s+mich\\s+(?:jetzt\\s+)?konzentrieren|eine\\s+sache\\s+(?:nach\\s+der\\s+anderen|zuerst)|fokus\\s+(?:bitte|übung)"), "eine-sache"],
  [re("kästchen[- ]?atm\\w*|box[- ]?atm\\w*"), "kaestchen"],
  [re("seufzer"), "seufzer"],
  [re("schultern\\s+lockern|nacken\\s+lockern"), "schultern"],
  [re("atemübung\\w*|atem[- ]übung\\w*|atmen\\s+üben|lass\\s+uns\\s+atmen|(?:brauch|bräucht)\\w*\\s+(?:mal\\s+|kurz\\s+|eben\\s+|grad\\s+)*(?:etwas\\s+|ein\\s+bisschen\\s+|n\\s+bisschen\\s+)?ruhe|(?:kurz\\s+|mal\\s+)?ruhe\\s+(?:bitte|brauch\\w*)|bin\\s+(?:total\\s+|so\\s+|grad\\s+|gerade\\s+)?(?:gestresst|gehetzt|durch\\s+den\\s+wind)"), "lang-aus"],
  [re("durchatmen|durch\\s+atmen|kurz\\s+raus|entspannungsübung\\w*"), "vorschlag"],
];

/** Übung aus dem Satz („vorschlag“ = nach Tageszeit) – sonst null */
export function durchatmenAusSatz(text: string): string | null {
  // Feste Form der App („Durchatmen: handy-pause“)
  const fest = text.trim().match(/^durchatmen\s*:\s*([a-z-]+)$/i)?.[1]?.toLowerCase();
  if (fest && (fest === "vorschlag" || uebungVon(fest))) return fest;
  const t = text.trim().replace(/^durchatmen\s*:\s*/i, "durchatmen ");
  if (!t || t.length > 120 || NICHT.test(t)) return null;
  // „Durchatmen: Handy-Pause“ (so schickt es die KI per app_befehl) – die genannte Übung zuerst
  for (const [muster, id] of MUSTER) if (id !== "vorschlag" && muster.test(t)) return id;
  return MUSTER.find(([, id]) => id === "vorschlag")![0].test(t) ? "vorschlag" : null;
}

/** Eindeutig genug für den Sofort-Weg: kurzer Befehl, keine Frage */
export function durchatmenBefehl(text: string): string | null {
  const t = text.trim();
  if (t.length > 60 || t.includes("?")) return null;
  return durchatmenAusSatz(t);
}

/** Feste Text-Form für `app_befehl` bzw. die Sofort-Op */
export const durchatmenBefehlText = (id: string) => `Durchatmen: ${id}`;
