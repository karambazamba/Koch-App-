// Räume raten (A-034): Mia wählt den Raum vor, der passende Chip ist schon
// aktiv. EINE Stelle für Schnelleingabe, Fenster, Sofort-Weg, Regeln ohne KI
// und den Testmodus. Reihenfolge:
// 1. ausdrücklich gesagt („geschäftlich“, „nur für mich“/„privat“, „für alle“/„Familie“)
// 2. gelernt: Stichworte, die man selbst korrigiert hat („Peter“ → Arbeit)
// 3. Inhalt: Meeting/Kunde/Lieferant/Büro … → Arbeit; Schule/Kinder/Oma/
//    Geburtstag … → Familie; Arzt/Friseur … → Ich. Arbeit und Familie
//    zugleich ist unklar (`raumUnklar`, Mia fragt mit Knöpfen).
// 4. Arbeits-Stichworte aus früheren Arbeits-Einträgen (Laden, Café …)
// 5. Standard: Termine Familie, Aufgaben Ich.
// Personen aus dem Haushalt machen nichts zu Familie („Geschenk für Lisa“
// soll Lisa gerade nicht sehen). Rein.

import type { Room } from "@/lib/core/entries";

export type RaumArt = "termin" | "aufgabe";
export type RaumGrund = "gesagt" | "gelernt" | "inhalt" | "standard";
/** Ein gelerntes Stichwort (neueste zuerst) */
export type RaumWort = { wort: string; raum: Room };
export type RaumHilfen = { gelernt?: readonly RaumWort[]; arbeitWorte?: readonly string[] };

const W = (body: string) => new RegExp(`(?<![a-zäöüß])(${body})(?![a-zäöüß])`, "i");

/** Ausdrücklich gesagt */
const SAGT_ARBEIT = W("geschäftlich\\w*|für die arbeit|beruflich");
const SAGT_ICH = W("nur für mich|für mich allein|nur ich|nur mich|privat|persönlich");
const SAGT_FAMILIE = W("für alle|für uns alle|alle zusammen|für die familie|familie|gemeinsam");

/**
 * Arbeit aus dem Inhalt: Job-Wörter und Felix’ Betriebe (Tohuus, KARAMBA
 * Eis, Eisladen), Lieferanten, Personal, Großhandel. „karamba“ ist hier nur
 * Stichwort, in Texten heißt es immer „KARAMBA Eis“.
 */
const ARBEIT = W(
  "meeting\\w*|büro|kunden?|kundin\\w*|kundentermin\\w*|präsentation|call|projekt\\w*|chef\\w*|kolleg\\w*|arbeit|dienstreise|abgabe|teams|zoom|besprechung\\w*|bewerbung|team\\w*|tohuus|karamba|lieferant\\w*|personal|personalgespräch\\w*|personalplan\\w*|schulung\\w*|mitarbeiter\\w*|großhandel\\w*|grosshandel\\w*|eisladen|eisdiele|firma|betrieb|schichtplan|vorstellungsgespräch\\w*|buchhaltung",
);
/** Familie aus dem Inhalt: Kinder, Schule, Großeltern, Geburtstage */
const FAMILIE = W(
  "kind|kinder\\w*|kita\\w*|krippe|schul\\w*|elternabend|elterngespräch|elternsprechtag|hort|kinderarzt\\w*|kinderärzt\\w*|oma\\w*|opa\\w*|großeltern|schwiegereltern|tante|onkel|geburtstag\\w*|einschulung|laterne\\w*|familienfest|ferienbetreuung|turnbeutel|spielplatz",
);
/** Ich aus dem Inhalt: Arzt, Friseur und was sonst nur einen selbst angeht */
const ICH = W(
  "(?:zahn|haus|augen|frauen|haut|hals-nasen-ohren-)?arzt\\w*|(?:zahn|haus|augen|frauen|haut)?ärztin\\w*|zahnreinigung|friseur\\w*|frisör\\w*|physio\\w*|therapie\\w*|therapeut\\w*|massage|kosmetik\\w*|fußpflege|maniküre|orthopäd\\w*|psycholog\\w*|heilpraktiker\\w*|impfung|blutabnahme|röntgen",
);

/** Wörter, die je nach Mensch Arbeit sind – zählen erst, wenn sie schon an Arbeits-Einträgen stehen */
const VIELLEICHT_ARBEIT = ["laden", "café", "cafe", "werkstatt", "praxis", "schicht", "dienst", "baustelle", "küche", "lager", "kasse", "inventur"];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const enthaelt = (text: string, wort: string) => W(esc(wort.toLowerCase())).test(text);

/** Standard ohne Hinweis: Termine Familie, Aufgaben Ich */
export const standardRaum = (art: RaumArt): Room => (art === "termin" ? "familie" : "ich");

/** Was der Satz ausdrücklich sagt (sonst null) */
function gesagt(text: string): Room | null {
  if (SAGT_ARBEIT.test(text)) return "arbeit";
  if (SAGT_ICH.test(text)) return "ich";
  if (SAGT_FAMILIE.test(text)) return "familie";
  return null;
}

/** Was der Inhalt nahelegt (sonst null): Arbeit vor Ich, Familie vor Ich („mit Mathis zum Zahnarzt“) */
function ausInhalt(text: string): Room | null {
  if (ARBEIT.test(text)) return "arbeit";
  if (FAMILIE.test(text)) return "familie";
  if (ICH.test(text)) return "ich";
  return null;
}

/** Raum nur, wenn der Satz ihn sagt, gelernt ist oder der Inhalt ihn klar macht – sonst null. @public für Tests */
export function raumAusText(text: string, o: RaumHilfen = {}): { raum: Room; grund: Exclude<RaumGrund, "standard"> } | null {
  const g = gesagt(text);
  if (g) return { raum: g, grund: "gesagt" };
  const t = text.toLowerCase();
  const wort = (o.gelernt ?? []).find((w) => enthaelt(t, w.wort));
  if (wort) return { raum: wort.raum, grund: "gelernt" };
  const inhalt = ausInhalt(text);
  if (inhalt) return { raum: inhalt, grund: "inhalt" };
  if ((o.arbeitWorte ?? []).some((w) => enthaelt(t, w))) return { raum: "arbeit", grund: "inhalt" };
  return null;
}

/** Der vorgewählte Raum mit Grund (nie null) */
export function raumRaten(text: string, art: RaumArt, o: RaumHilfen = {}): { raum: Room; grund: RaumGrund } {
  return raumAusText(text, o) ?? { raum: standardRaum(art), grund: "standard" };
}

/** Kurz: nur der Raum */
export const guessRoom = (text: string, art: RaumArt, o: RaumHilfen = {}): Room => raumRaten(text, art, o).raum;

/**
 * Wirklich unklar: Arbeit und Familie zugleich, ohne dass der Satz es sagt
 * und ohne gelerntes Stichwort („Kinder zum Tohuus bringen“). Dann fragt Mia.
 */
export function raumUnklar(text: string, o: RaumHilfen = {}): boolean {
  if (gesagt(text)) return false;
  const t = text.toLowerCase();
  if ((o.gelernt ?? []).some((w) => enthaelt(t, w.wort))) return false;
  return ARBEIT.test(text) && FAMILIE.test(text);
}

/** Gelernt aus früheren Arbeits-Einträgen: Laden, Café … */
export function arbeitsWorte(entries: readonly { raum: Room; data: { title: string; label?: string } }[]): string[] {
  const text = entries
    .filter((e) => e.raum === "arbeit")
    .map((e) => `${e.data.title} ${e.data.label ?? ""}`.toLowerCase())
    .join(" ");
  return VIELLEICHT_ARBEIT.filter((w) => enthaelt(text, w));
}

/** Raum-Wörter aus dem Titel nehmen („Tim antworten nur für mich“ → „Tim antworten“, „Privat: Geschenk“ → „Geschenk“) */
export const ohneRaumWorte = (title: string) =>
  title
    .replace(/[,\s]*(?<![a-zäöüß])(?:nur für mich|für mich allein|nur ich|privat|geschäftlich|beruflich|für alle|für uns alle|alle zusammen|für die familie)(?![a-zäöüß])[,.:]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Wörter, die nie ein Stichwort sind */
const KEIN_STICHWORT = new Set(
  "montag dienstag mittwoch donnerstag freitag samstag sonntag heute morgen übermorgen abend abends früh mittag uhr termin aufgabe januar februar märz april mai juni juli august september oktober november dezember woche wochenende nächste nächsten für mit bei beim zum zur den die das der dem des ein eine einen einem noch bitte nur mich mir ich wir uns und oder auch mal dann neu neue neuer erinnern erinner familie privat arbeit geschäftlich alle anrufen machen kaufen besorgen bringen abholen schreiben schicken bezahlen erledigen".split(" "),
);

/**
 * Stichwort zum Lernen aus einem Titel: das letzte großgeschriebene Wort
 * (Namen und Dinge: „Rechnung an Peter“ → „Peter“, „Zahnarzt Freitag“ →
 * „Zahnarzt“), sonst das erste längere Wort. Klein gespeichert.
 */
export function stichwort(title: string): string | null {
  const woerter = title.split(/[^A-Za-zÄÖÜäöüß-]+/).filter((w) => w.length >= 3 && !KEIN_STICHWORT.has(w.toLowerCase()));
  const gross = woerter.filter((w) => /^[A-ZÄÖÜ]/.test(w));
  const wort = gross.length ? gross[gross.length - 1] : woerter[0];
  return wort ? wort.toLowerCase().replace(/^-+|-+$/g, "") || null : null;
}

const RAUM_WORT = "(nur für mich|für mich|nur ich|privat|persönlich|arbeit|geschäftlich|beruflich|familie|für die familie|für alle|für uns alle)";
const MACH = new RegExp(`^(?:bitte\\s+)?(?:mach|stell|setz|pack|leg|änder)\\w*\\s+(?:bitte\\s+)?(.+?)\\s+(?:(?:auf|zu|in|für|unter)\\s+)?(?:die\\s+|der\\s+)?${RAUM_WORT}[.!]?$`, "i");
const IST = new RegExp(`^(?:der|die|das)(?:\\s+(.+?))?\\s+(?:ist|gehört|war)\\s+(?:(?:zu[mr]?|für)\\s+)?(?:die\\s+|der\\s+)?${RAUM_WORT}[.!]?$`, "i");
const raumVonWort = (w: string): Room => (/arbeit|geschäftlich|beruflich/i.test(w) ? "arbeit" : /familie|alle/i.test(w) ? "familie" : "ich");

/**
 * Raum ändern per Satz (ohne KI): „Mach den Zahnarzt nur für mich“, „Der
 * Peter-Termin ist Arbeit“, „Das gehört zur Familie“ (= das zuletzt
 * Eingetragene, `query` „das“).
 */
export function raumBefehl(text: string): { query: string; raum: Room } | null {
  const t = text.trim();
  const m = t.match(MACH);
  if (m) return { query: m[1].replace(/^(?:den|die|das|dem|der)\s+/i, "").trim() || "das", raum: raumVonWort(m[2]) };
  const i = t.match(IST);
  if (i) return { query: i[1]?.trim() || "das", raum: raumVonWort(i[2]) };
  return null;
}
