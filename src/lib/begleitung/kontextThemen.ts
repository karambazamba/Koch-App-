// Kontext schlanker (Auftrag „Mia schneller und flüssiger“, rein): nur die
// Daten in den Prompt, die die Nachricht braucht – Einkauf nur bei
// Einkaufsthemen, Termine nur bei Kalenderthemen usw. Gelesen werden die
// letzten drei eigenen Nachrichten (Rückfragen gehören zum Thema davor).
// Erkennt die App kein Thema, bekommt die KI wie bisher alles („alle“) – lieber
// zu viel als halbgar. Plaudern („Danke“, „Moin“) braucht keine Daten.
// Der feste Teil (Ton, Arbeitsweise, Werkzeuge) bleibt gecacht.

import type { AssistantRequest } from "@/lib/begleitung/protocol";
import { looksLikeMail } from "@/lib/begleitung/mail";
import { plauderArt } from "@/lib/mia/plaudern";

export type Thema = "kalender" | "notizen" | "einkauf" | "essen" | "vorrat" | "pinnwand" | "wetter" | "tag" | "mail" | "app";

/** `null` = alles (kein Thema erkannt, offener Vorschlag oder Wochencheck) */
export type Themen = Set<Thema> | null;

const W = "(?![a-zäöüß])";
const V = "(?<![a-zäöüß])";
const re = (body: string) => new RegExp(`${V}(${body})${W}`, "i");

const THEMEN: Record<Thema, RegExp> = {
  kalender: re(
    "termin\\w*|aufgabe\\w*|kalender|erinner\\w*|uhr|\\d{1,2}[:.]\\d{2}|morgen|übermorgen|heute|gestern|woche\\w*|wochenende|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|mo|di|mi|do|fr|sa|so|zeit|frei|steht an|was steht|verschieb\\w*|absag\\w*|fällt aus|lösch\\w*|erledigt|abhak\\w*|geburtstag|arzt|zahnarzt|kita|schule|meeting|wann|frist|bis|muss|müssen|sollte|nicht vergessen|abgeben|an \\w+ geben|serie|jeden|jede|nächste\\w*",
  ),
  einkauf: re("liste|einkauf\\w*|einkaufen|kauf\\w*|zettel|laden|läden|rewe|aldi|lidl|edeka|netto|penny|kaufland|rossmann|dm|bäcker|markt|brauch\\w*|alle|leer|besorg\\w*|mitbring\\w*|drauf|runter"),
  essen: re(
    "essen|isst|koch\\w*|gericht\\w*|rezept\\w*|gibt.?s|mittag\\w*|abendbrot|abendessen|frühstück|hunger|wochenplan|plan|planen|back\\w*|snack|vegetar\\w*|vegan|fleisch|fisch|idee\\w*|zutat\\w*|lecker|portion\\w*|allergi\\w*|mag|mögen|nie wieder|lieblings\\w*|pause|wunsch\\w*|wünscht",
  ),
  vorrat: re("im haus|vorrat|kühlschrank|tiefkühl\\w*|haben wir|ist alle|sind alle|aufgebraucht|übrig|reste|da"),
  notizen: re("notiz\\w*|notier\\w*|merk dir|schreib (das )?auf|liste|packliste|passwort|kladde|schnellnotiz"),
  pinnwand: re("pinnwand|nachricht|bescheid|sprachnachricht|memo"),
  wetter: re("wetter|schirm|regn\\w*|regen|sonnig|sonne|warm|kalt|grad|temperatur|frost|glatt|schnee|wind\\w*|sturm|gewitter|draußen"),
  tag: re("timer|wecker|stoppuhr|minuten?|schritt|sport|training\\w*|laufen|joggen|jetzt-karte|jetzt karte|feierabend|morgens|kochmodus"),
  mail: re("mail\\w*|e-mail|antworte|schreib (eine|dem|der|den|an)"),
  app: re("startseite|kachel\\w*|baustein\\w*|funktion\\w*|einschalt\\w*|ausschalt\\w*|anmachen|ausmachen|mach \\w+ (an|aus)|schalt\\w* .*(an|aus)|zeig\\w*|dunkel|hell|einstellung\\w*|vorlesen|stimme|mehr|kannst du|gibt es"),
};

/** Welche Daten braucht diese Anfrage? */
export function kontextThemen(req: Pick<AssistantRequest, "messages" | "pending">): Themen {
  if (req.pending.length > 0) return null;
  const users = req.messages.filter((m) => m.role === "user");
  const last = users[users.length - 1]?.text ?? "";
  if (last.startsWith("[")) return null; // Wochencheck, Im Haus, Kochidee …: alles
  const before = [...req.messages].reverse().find((m, i) => i > 0 && m.role === "assistant")?.text ?? "";
  const themen = new Set<Thema>();
  // Plaudern braucht keine Daten (nur die eine Nachricht, nicht das Gespräch davor)
  if (plauderArt(last, before) !== null) return themen;
  const text = users.slice(-3).map((m) => m.text).join(" \n ");
  for (const [thema, muster] of Object.entries(THEMEN) as [Thema, RegExp][]) if (muster.test(text)) themen.add(thema);
  if (looksLikeMail(last)) themen.add("mail");
  if (themen.size === 0) return null;
  // Essen braucht den Vorrat („zuerst aus dem Vorrat“), Einkauf die Liste und den Plan
  if (themen.has("essen")) themen.add("vorrat");
  return themen;
}
