// Kurzes Plaudern im Chat (Ton-Feinschliff): Danke, Lob, Gruß, „Bin platt“,
// „Wie geht’s?“, „Passt“. Rein, damit testbar. Die Engine schickt solche
// Sätze an das kleine Modell (kurze Alltagsantwort), der Testmodus antwortet
// mit festen, lockeren Sätzen.

export type PlauderArt = "danke" | "lob" | "gruss" | "tschuess" | "muede" | "wiegehts" | "ok";

const W = (re: string) => new RegExp(`^(?:${re})(?![a-zäöüß])`, "i");

const ARTEN: [PlauderArt, RegExp][] = [
  ["danke", W("(?:ja,? )?(?:danke|dankeschön|vielen dank|merci|thx)")],
  ["lob", W("(?:super|toll|klasse|spitze|top|perfekt|stark|genial|großartig|grossartig|gut gemacht|du bist (?:die )?beste|wie cool)")],
  ["gruss", W("(?:moin(?: moin)?|hallo|hi|hey|huhu|servus|guten (?:morgen|tag|abend))")],
  ["tschuess", W("(?:tschüss|tschüs|ciao|bis (?:später|dann|morgen|nachher)|gute nacht|schlaf gut)")],
  ["muede", W("(?:ich bin|bin) (?:total |so |echt |voll |völlig |gerade |grad |heute |heut )*(?:müde|platt|kaputt|fertig|erledigt|k\\.?o\\.?|durch)|(?:war|is|ist|heute war) (?:echt |so |)?(?:ein |'n |n )?(?:langer|anstrengender|harter|voller|stressiger) tag")],
  ["wiegehts", W("(?:wie geht(?:’|')?s(?: dir)?|wie geht es dir|alles gut bei dir|na,? alles klar|was machst du(?: so)?)")],
  ["ok", W("(?:ok(?:ay)?|alles klar|passt|jo|prima|cool)")],
];

/**
 * Plauderei erkennen – nur kurze Sätze ohne Auftrag („Danke, und noch Milch
 * auf die Liste“ zählt nicht). `vorher` = Mias letzte Antwort: Hat sie etwas
 * gefragt, ist „Passt“/„Okay“ eine Antwort darauf und keine Plauderei.
 */
export function plauderArt(text: string, vorher = ""): PlauderArt | null {
  const t = text.trim();
  if (/\?\s*(\(Testmodus\))?\s*$/.test(vorher) && /^(ok|okay|alles klar|passt|jo|prima|cool)(?![a-zäöüß])/i.test(t)) return null;
  if (!t || t.length > 40 || /(?<![a-zäöüß])(und|auf die|liste|termin|aufgabe|timer|erinner|notier|merk dir|schreib|trag)(?![a-zäöüß])/i.test(t)) return null;
  for (const [art, re] of ARTEN) {
    const m = t.match(re);
    if (!m) continue;
    // Danach nur noch Anrede, Füllwörter, Satzzeichen oder Emoji („Danke dir!“, „Moin Mia 😊“); „Hey, wann ist Zahnarzt?“ ist keine Plauderei
    const rest = t.slice(m[0].length).replace(/[\s,.!?…:;)(-]+|\p{Extended_Pictographic}|\uFE0F/gu, " ").trim();
    const words = rest ? rest.split(/\s+/) : [];
    const fill = words.filter((w) => !REST_OK.test(w));
    if (fill.length === 0 || (art === "muede" && fill.length <= 3 && !t.includes("?"))) return art;
    return null;
  }
  return null;
}

/** Wörter, die eine Plauderei nicht zum Auftrag machen */
const REST_OK = /^(dir|euch|mia|lotte|schön|sehr|auch|wieder|nochmal|zusammen|leute|ihr|du|vielmals|echt|so|mal|heute|heut|gerade|grad|erstmal|soweit|danke|jo|na|ja|oh|ach|hach|wow|alle|allerseits|zurück|morgen|abend|tag|nacht|gemacht|gelaufen|klappt|super|toll|klasse|top|perfekt)$/i;

/** Feste lockere Antworten (Testmodus und Muster für den Prompt) */
export const PLAUDER_ANTWORT: Record<PlauderArt, string> = {
  danke: "Gern.",
  lob: "Och. Danke dir!",
  gruss: "Moin. Was liegt an?",
  tschuess: "Bis denn.",
  muede: "Dann heut was Schnelles. Nudeln mit Pesto?",
  wiegehts: "Läuft. Und bei dir?",
  ok: "Passt.",
};
