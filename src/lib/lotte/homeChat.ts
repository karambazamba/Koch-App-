// Startseite, Wochenplan, Einkaufsliste und "Rückgängig" im Chat – ohne KI,
// sofort und mit Rückgängig: "Mach die Einkaufsliste wieder klein", "Nimm
// die Einkaufsliste von der Startseite", "Zeig mir den Wochenplan", "Lösch
// den Wochenplan wieder", "Mach das rückgängig". Rein (nur Erkennung).

import type { HomeAction, HomeChange, HomeTileId } from "../core/homeLayout";

export type HomeCommand =
  | { kind: "home"; change: HomeChange }
  | { kind: "undo" }
  | { kind: "show"; target: "wochenplan" | "einkaufsliste" | "startseite" }
  | { kind: "clear_week" }
  | { kind: "clear_shopping" }
  | { kind: "remove_shopping"; names: string[] };

function tileIn(t: string): HomeTileId | null {
  if (/\b(einkauf\w*|liste)\b/.test(t)) return "einkauf";
  if (/\b(termine?|aufgaben?|kalender)\b/.test(t)) return "termine";
  if (/\b(vorschau|morgen-?karte)\b/.test(t)) return "morgen";
  if (/\b(essen|gericht|essens-?kachel)\b/.test(t)) return "essen";
  return null;
}

function actionIn(t: string): HomeAction | null {
  if (/\b(von der startseite|ausblenden|verstecken|blend\w* \w+ aus|weg von der startseite)\b/.test(t)) return "ausblenden";
  if (/\b(klein\w*|kompakt\w*|kürzer)\b/.test(t)) return "kompakt";
  if (/\b(gro(ß|ss)|ausführlich|länger)/.test(t)) return "ausfuehrlich";
  if (/\b(ganz nach oben|nach oben|ganz oben|zuerst)\b/.test(t)) return "nach_oben";
  if (/\b(ganz nach unten|nach unten|ganz unten|zuletzt)\b/.test(t)) return "nach_unten";
  if (/\b(auf die startseite|wieder auf der startseite|einblenden|wieder (an)?zeigen|zurück auf die startseite)\b/.test(t)) return "zeigen";
  return null;
}

export function parseHomeCommand(text: string): HomeCommand | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (!t) return null;
  if (/^(bitte\s+)?((mach|nimm)\s+(das|es|die letzte änderung|alles)\s+(bitte\s+)?(wieder\s+)?(rückgängig|zurück)|rückgängig( machen)?|undo)(\s+bitte)?$/.test(t)) return { kind: "undo" };
  if (/\bstartseite anpassen\b/.test(t)) return { kind: "show", target: "startseite" };
  if (/\b(lösch|leer|entfern|streich)\w*\s+(\w+\s+){0,2}wochenplan\b|\bwochenplan\s+(wieder\s+)?(löschen|leeren|weg)\b/.test(t)) return { kind: "clear_week" };
  if (/\b(lösch|leer)\w*\s+(\w+\s+){0,2}einkaufsliste\b|\beinkaufsliste\s+(wieder\s+)?(löschen|leeren)\b/.test(t)) return { kind: "clear_shopping" };
  // Startseite: Kachel + Aktion ("Mach die Einkaufsliste wieder klein")
  if (/\bstartseite\b/.test(t) || /\b(mach|stell|zeig|nimm|blend|schieb|setz)\w*\b/.test(t)) {
    const tile = tileIn(t);
    const action = actionIn(t);
    if (tile && action && (action !== "zeigen" || /\bstartseite\b|einblenden/.test(t))) return { kind: "home", change: { tile, action } };
  }
  if (/\b(zeig\w*|öffne\w*|wo ist|wo finde ich)\b.*\bwochenplan\b/.test(t)) return { kind: "show", target: "wochenplan" };
  if (/\b(zeig\w*|öffne\w*|wo ist|wo finde ich)\b.*\beinkaufsliste\b/.test(t)) return { kind: "show", target: "einkaufsliste" };
  const remove = t.match(/^(?:bitte\s+)?(?:nimm|streich|lösch)\w*\s+(?:bitte\s+)?(.+?)\s+(?:wieder\s+)?(?:von|aus)\s+der\s+(?:einkaufs)?liste(?:\s+runter)?$/);
  if (remove) {
    const names = remove[1].split(/,|\bund\b/).map((n) => n.replace(/^(die|den|das|der)\s+/, "").trim()).filter(Boolean);
    if (names.length) return { kind: "remove_shopping", names };
  }
  return null;
}
