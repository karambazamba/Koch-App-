// Füllwörter weg, bevor irgendetwas ausgewertet wird (A-056, rein – getestet
// in tests/begleitung/mehrereSachen.test.ts). Gilt für den Regel-Weg UND
// bevor eine Nachricht an die KI geht: Zögern („äh“, „ähm“, „hm“) überall,
// Einleitungen („also“, „bitte“, „mal“, „noch“, „dazu“) am Anfang, direkt vor
// einem Doppelpunkt („Aufgabe heute dazu:“ → „Aufgabe heute:“) und „mal“
// hinter Befehlen („pack mal“), dazu Wiederholungen („Aufgabe Aufgabe“).
// Was den Sinn trägt, bleibt („noch nicht“, „noch mal“, „Was ist noch da?“).
// Regex nie mit `\b` an Umlauten, sondern mit Buchstaben-Grenzen (CLAUDE.md).

const V = "(?<![a-zäöüß])";
const W = "(?![a-zäöüß])";

/** Zögern, überall: „äh“, „ähm“, „öhm“, „ehm“, „hm“, „hmm“ (nie „mhm“ – das ist ein Ja) */
const ZOEGERN = new RegExp(`${V}(?:ä+h+m*|ö+h+m*|e+h+m+|h+m+|u+h+m+)${W}[,.…]*`, "gi");
/** Einleitungen am Anfang (auch mehrere: „Also bitte noch …“) */
const ANFANG = new RegExp(`^(?<![a-zäöüß])(?:also|bitte|mal|noch(?!\\s+(?:nicht|kein|mal|da|im|was|etwas|einmal))|dazu|na\\s*ja|naja|nun)${W}[\\s,.:!…]*`, "i");
/** „So, …“ nur mit Komma (sonst „So machen wir’s“) */
const SO = /^so[,.!]\s*/i;
/** Füllwort direkt vor dem Doppelpunkt: „Aufgabe heute dazu:“ */
const VOR_DOPPELPUNKT = new RegExp(`(?:\\s+(?:dazu|noch|mal|bitte|also))+\\s*:`, "gi");
/** „noch dazu“ hat nie Inhalt */
const NOCH_DAZU = new RegExp(`${V}noch\\s+dazu${W}`, "gi");
/** „mal“ hinter einem Befehl: „pack mal“, „schreib mal auf“ (nicht „noch mal“, „das erste Mal“) */
const BEFEHL_MAL = new RegExp(`${V}((?:pack|setz|schreib|trag|mach|leg|stell|tu|guck|schau|sag|gib|erinner|notier|merk|nimm|bring|hol)[a-zäöüß]*)\\s+mal${W}`, "gi");
/** „bitte“ ganz am Ende („…, bitte.“) */
const BITTE_ENDE = new RegExp(`[\\s,]+bitte[.!]*$`, "i");
/** Dasselbe Wort direkt nochmal („Aufgabe Aufgabe“, „die die“) */
const DOPPELT = /(?<![\p{L}])(\p{L}{2,})(?:[\s,]+\1)+(?![\p{L}])/giu;

/** Text ohne Füllwörter; bleibt nichts übrig, das Original (dann antwortet eben die KI) */
export function ohneFuellwoerter(text: string): string {
  let t = text.replace(/\s+/g, " ").trim();
  if (!t) return t;
  t = t.replace(ZOEGERN, " ").replace(NOCH_DAZU, " ").replace(BEFEHL_MAL, "$1").replace(VOR_DOPPELPUNKT, ":").replace(DOPPELT, "$1");
  t = t.replace(/\s+/g, " ").replace(/\s+([,.:;!?])/g, "$1").replace(/^[\s,.:;!…–-]+/, "").trim();
  for (let alt = ""; alt !== t; ) {
    alt = t;
    t = t.replace(ANFANG, "").replace(SO, "").replace(/^[\s,.:;!…–-]+/, "").trim();
  }
  t = t.replace(BITTE_ENDE, "").replace(/,+/g, ",").replace(/,\s*$/, "").trim();
  return t || text.trim();
}

/** Steuerwörter vorn im Titel („Aufgabe:“, „To-do“, „Termin:“) – nie Teil des Titels */
const STEUER_VORN = /^(?:(?:aufgaben?|to-?dos?|erinnerung)(?:\s+(?:heute|morgen|übermorgen))?\s*[:,-]?\s+|termin\s*:\s*)/i;
/** Verbinder vorn, die beim Aufteilen übrig bleiben („und danach Bank“) */
const VERBINDER_VORN = new RegExp(`^(?:und|dann|danach|außerdem|sowie|auch|plus)${W}\\s*`, "i");

/** Titel aufräumen: ohne Füllwörter und Steuerwörter, ohne Punkt am Ende, erster Buchstabe groß */
export function titelSauber(title: string): string {
  let t = ohneFuellwoerter(title);
  for (let alt = ""; alt !== t; ) {
    alt = t;
    t = t.replace(VERBINDER_VORN, "").replace(STEUER_VORN, "").replace(ANFANG, "").trim();
  }
  t = t.replace(/[\s.!,;:]+$/, "").trim();
  if (!t) return title.trim();
  // „iPhone“, „eBay“ bleiben so
  if (/^\p{Ll}\p{Lu}/u.test(t)) return t;
  return t[0].toLocaleUpperCase("de-DE") + t.slice(1);
}
