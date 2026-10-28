// Startseite, Wochenplan, Einkaufsliste und "Rückgängig" im Chat – ohne KI,
// sofort und mit Rückgängig: "Mach die Einkaufsliste wieder klein", "Nimm
// die Einkaufsliste von der Startseite", "Zeig mir den Wochenplan", "Lösch
// den Wochenplan wieder", "Mach das rückgängig". Rein (nur Erkennung).

import type { HomeAction, HomeChange, HomeTileId } from "@/lib/core/homeLayout";
import { farbWaehlbar, farbeAusWort, type KachelFarbe } from "@/lib/heute/kachelFarben";

type HomeCommand =
  | { kind: "home"; change: HomeChange }
  | { kind: "undo" }
  | { kind: "show"; target: "wochenplan" | "einkaufsliste" | "startseite" }
  | { kind: "clear_week" }
  | { kind: "clear_shopping" }
  | { kind: "remove_shopping"; names: string[] };

function tileIn(t: string): HomeTileId | null {
  if (/\bpinnwand\b/.test(t)) return "pinnwand";
  if (/\bwetter\b/.test(t)) return "wetter";
  if (/\b(kladde|schnellnotiz|notizen?)\b/.test(t)) return "notizen";
  if (/\bvorrat\b/.test(t)) return "vorrat";
  if (/\baufgaben?\b/.test(t)) return "aufgaben";
  if (/\b(einkauf\w*|liste)\b/.test(t)) return "einkauf";
  if (/\b(termine?|kalender)\b/.test(t)) return "termine";
  if (/\b(essen|gericht|essens-?kachel)\b/.test(t)) return "essen";
  return null;
}

/**
 * Kachel-Farbe im Satz („Mach die Notizen blau“, „Pinnwand wieder in
 * Standardfarbe“) – nie „Meine Farbe im Kalender“ (Einstellungen).
 */
function farbeIn(t: string): KachelFarbe | "auto" | null {
  const words = t.split(/[\s,]+/).filter((w) => w !== "bitte");
  if (words.length > 7 || /\d|farbe im kalender|kalenderfarbe/.test(t)) return null;
  if (/(standard|automatisch\w*|eigene\w*|normale\w*|alte\w*) ?farbe|farbe\w* (wieder )?(automatisch|zurück)|wieder automatisch$/.test(t)) return "auto";
  // Die Farbe steht am Ende: „Mach die Notizen blau“, „Notizen in Grün“
  const f = farbeAusWort(words[words.length - 1] ?? "");
  return f && f !== "auto" ? f : null;
}

function actionIn(t: string): HomeAction | null {
  if (/\b(von der startseite|ausblenden|verstecken|blend\w* \w+ aus|weg von der startseite)\b/.test(t) || (/\b(nimm|mach|tu)\w*\b.*\bweg\b/.test(t) && !/\b(von|aus) der (einkaufs)?liste\b/.test(t))) return "ausblenden";
  if (/\b(ganz klein\w*|winzig\w*|mini)\b/.test(t)) return "mini";
  if (/\b(klein\w*|kompakt\w*|kürzer)\b/.test(t)) return "klein";
  if (/\b(mittel\w*|normal\w*)\b/.test(t)) return "mittel";
  if (/\b(gro(ß|ss)\w*|ausführlich|länger)/.test(t)) return "gross";
  if (/\b(ganz nach oben|nach oben|ganz oben|zuerst)\b/.test(t)) return "nach_oben";
  if (/\b(ganz nach unten|nach unten|ganz unten|zuletzt)\b/.test(t)) return "nach_unten";
  if (/\b(auf die startseite|wieder auf der startseite|einblenden|wieder (an)?zeigen|zurück auf die startseite)\b/.test(t)) return "zeigen";
  return null;
}

export function parseHomeCommand(text: string): HomeCommand | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (!t) return null;
  if (/^(bitte\s+)?((mach|nimm)\s+(das|es|die letzte änderung|alles)\s+(bitte\s+)?(wieder\s+)?(rückgängig|zurück)|rückgängig( machen)?|undo)(\s+bitte)?$/.test(t)) return { kind: "undo" };
  if (/\bstartseite (anpassen|bearbeiten|sortieren|umstellen)\b|\b(bearbeit|sortier)\w* (die |meine )?startseite\b/.test(t)) return { kind: "show", target: "startseite" };
  if (/\bstartseite\b.*\b(wie am anfang|wie vorher|standard|zurücksetzen)\b|\b(standard-?anordnung)\b/.test(t)) return { kind: "home", change: { tile: "termine", action: "standard" } };
  if (/\b(lösch|leer|entfern|streich)\w*\s+(\w+\s+){0,2}wochenplan\b|\bwochenplan\s+(wieder\s+)?(löschen|leeren|weg)\b/.test(t)) return { kind: "clear_week" };
  if (/\b(lösch|leer)\w*\s+(\w+\s+){0,2}einkaufsliste\b|\beinkaufsliste\s+(wieder\s+)?(löschen|leeren)\b/.test(t)) return { kind: "clear_shopping" };
  // Startseite: Kachel + Aktion ("Mach die Einkaufsliste wieder klein")
  if (/\bstartseite\b/.test(t) || /\b(mach|stell|zeig|nimm|blend|schieb|setz)\w*\b/.test(t)) {
    const tile = tileIn(t);
    const action = actionIn(t);
    if (tile && action && (action !== "zeigen" || /\bstartseite\b|einblenden/.test(t))) return { kind: "home", change: { tile, action } };
  }
  // Farbe: „Mach die Notizen blau“ (nächster Ton der Palette)
  const farbTile = tileIn(t);
  const farbe = farbTile && farbWaehlbar(farbTile) && !actionIn(t) ? farbeIn(t) : null;
  if (farbTile && farbe) return { kind: "home", change: { tile: farbTile, action: "farbe", farbe } };
  // Kurz: "Aufgaben ganz nach oben", "Aufgaben groß", "Wetter klein"
  const tile = tileIn(t);
  const action = actionIn(t);
  if (tile && action && ["nach_oben", "nach_unten", "mini", "klein", "mittel", "gross"].includes(action) && t.split(/\s+/).length <= 6) return { kind: "home", change: { tile, action } };
  if (/(?<![a-zäöüß])(zeig\w*|öffne\w*|wo ist|wo finde ich)\b.*\bwochenplan\b/.test(t)) return { kind: "show", target: "wochenplan" };
  if (/(?<![a-zäöüß])(zeig\w*|öffne\w*|wo ist|wo finde ich)\b.*\beinkaufsliste\b/.test(t)) return { kind: "show", target: "einkaufsliste" };
  const remove = t.match(/^(?:bitte\s+)?(?:nimm|streich|lösch)\w*\s+(?:bitte\s+)?(.+?)\s+(?:wieder\s+)?(?:von|aus)\s+der\s+(?:einkaufs)?liste(?:\s+runter)?$/);
  if (remove) {
    const names = remove[1].split(/,|\bund\b/).map((n) => n.replace(/^(die|den|das|der)\s+/, "").trim()).filter(Boolean);
    if (names.length) return { kind: "remove_shopping", names };
  }
  return null;
}
