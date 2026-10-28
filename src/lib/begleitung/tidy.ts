// Mia spricht knapp: jede KI-Antwort läuft vor Anzeige, Vorlesen und Push
// durch tidyMiaText(). Gedankenstriche als Satzverbindung werden zu Punkt
// bzw. Komma, Spiegelstriche am Zeilenanfang fallen weg, Doppel-Ausrufezeichen
// werden einfach, höchstens ein „!“ pro Nachricht. Sätze, die die Oberfläche
// erklären oder menschliche Gefühle vorspielen, fallen weg, und von mehreren
// Fragen bleibt nur die erste (EINE Frage oder EIN Angebot). Steife Anhängsel
// am Ende („Wenn du noch etwas brauchst, sag Bescheid.“, „Brauchst du sonst
// noch was?“) und ein steifer Einstieg („Selbstverständlich!“) fallen weg –
// Inhalt wird nie abgeschnitten, auch nicht bei zu langen Antworten (die
// Länge regelt der Prompt). Rein, damit testbar.

/** Erklärt die Oberfläche („Mit ‚Übernehmen‘ kommt es …“, „Unter Essen findest du es“) */
export const UI_ERKLAERUNG = /mit [„"'‚]?übernehmen|tipp(e)? (auf|unten)|unter (essen|einstellungen|aufgaben|kalender)(?![a-zäöüß]).*(findest|steht)|findest du (unter|rechts|oben|unten)|rechts unter/i;
/** Tut so, als wäre Mia ein Mensch („Das kenn ich“, „ich bin auch müde“) */
export const MENSCHLICH = /(das )?kenn(e)? ich( gut)?[.!,]|geht mir (auch|genauso) so|ich bin auch (müde|kaputt|erschöpft)|ich fühle mich|ich hatte auch/i;

/** Ein ganzer Satz, der nur ein steifes Anhängsel ist (fällt am Ende weg) */
const FLOSKEL_ENDE =
  /^(?:wenn du (?:noch |sonst noch |weitere )?(?:etwas|was|fragen|hilfe) (?:brauchst|hast|willst|möchtest)[^.!?]*|brauchst du (?:sonst |noch )*(?:etwas|was)(?: anderes)?|kann ich (?:sonst |noch )*(?:etwas|was) (?:für dich )?tun|lass (?:es )?mich (?:es )?wissen[^.!?]*|ich hoffe,? das hilft(?: dir)?(?: weiter)?|(?:sag|gib) (?:einfach |gern |gerne )?bescheid(?:,? wenn [^.!?]*)?|melde dich (?:einfach|gern|gerne)[^.!?]*|ich bin (?:jederzeit |immer |gern )*für dich da)[.!?…]*\s*(?:😊|🙂)?\s*$/i;
/** Steifer Einstieg vor dem eigentlichen Satz („Selbstverständlich! …“, „Gerne helfe ich dir dabei. …“) */
const FLOSKEL_START = /^(?:selbstverständlich[!.,]|natürlich[!.]|gerne? helfe ich(?: dir)?(?: dabei| gern)?[!.]|gute frage[!.])\s+(?=\S)/i;

const DASH = /\s+[–—]\s+/g;

/** „Regen ab 14 Uhr – Regenjacke für Mathis?“ → „Regen ab 14 Uhr. Regenjacke für Mathis?“ */
function joinParts(text: string): string {
  return text.replace(/([^\s])\s+[–—]\s+(\S)/g, (_all, before: string, after: string) => {
    // Zahlen-Spannen („9 – 11 Uhr“, „19.10. – 25.10.“) bleiben, nur als Bindestrich ohne Leerzeichen
    if (/\d/.test(before) && /\d/.test(after)) return `${before}–${after}`;
    // Nach Satzzeichen genügt ein Leerzeichen
    if (/[.!?:,;]/.test(before)) return `${before} ${after}`;
    // Großbuchstabe danach (Nomen oder neuer Satz) → neuer Satz; klein → Komma
    return /[A-ZÄÖÜ„"]/.test(after) ? `${before}. ${after}` : `${before}, ${after}`;
  });
}

/** Sätze samt Leerraum dahinter; Datumspunkte („30. Oktober“) trennen nicht */
const SENTENCES = /[^.!?]*(?:(?<=\d)\.(?=\s*\d|\s+[A-ZÄÖÜa-zäöüß])[^.!?]*)*[.!?…]*["“”]?\s*/g;

/** Unpassende Sätze weg, nur die erste Frage bleibt – nie alles */
function keepSentences(text: string): string {
  const parts = text.match(SENTENCES)?.filter(Boolean) ?? [text];
  let questions = 0;
  const kept = parts.filter((part) => {
    if (UI_ERKLAERUNG.test(part) || MENSCHLICH.test(part)) return false;
    if (/\?["“”]?\s*$/.test(part) && ++questions > 1) return false;
    return true;
  });
  if (!kept.length) return text;
  // Steife Anhängsel am Ende weg; besteht alles nur daraus, bleibt der erste Satz
  const first = kept[0];
  while (kept.length && FLOSKEL_ENDE.test(kept[kept.length - 1].trim())) kept.pop();
  return kept.length ? kept.join("") : first;
}

/** „Selbstverständlich! Steht drin.“ → „Steht drin.“ (nur wenn danach noch etwas kommt) */
function dropStiffStart(text: string): string {
  const rest = text.replace(FLOSKEL_START, "");
  return rest === text || !rest.trim() ? text : rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function tidyMiaText(text: string): string {
  let out = text
    .split("\n")
    // Spiegelstriche/Aufzählungszeichen am Zeilenanfang weg
    .map((line) => line.replace(/^\s*(?:[-•–—*]|\d+[.)])\s+/, ""))
    .join("\n");
  out = joinParts(out).replace(DASH, ", ");
  out = out.replace(/!{2,}/g, "!").replace(/\?{2,}/g, "?");
  // Höchstens ein „!“: alle bis auf das letzte werden zu Punkten
  const bangs = out.split("!").length - 1;
  if (bangs > 1) {
    let seen = 0;
    out = out.replace(/!/g, () => (++seen < bangs ? "." : "!"));
  }
  out = dropStiffStart(keepSentences(out.trim()));
  return out.replace(/[ \t]{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
