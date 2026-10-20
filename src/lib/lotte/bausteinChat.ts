// Bausteine im Gespräch – Erkennung ohne KI (rein): "Zeig mir den Vorrat",
// "Ich brauche die Tipps nicht", "Was kannst du noch?".

import type { Feature } from "../core/features";

type BausteinCommand = { kind: "set"; feature: Feature; on: boolean } | { kind: "list" };

const WORDS: [RegExp, Feature][] = [
  [/\bwochenplan\w*/, "wochenplan"],
  [/\b(vorrat|tiefkühl\w*|kühlschrank)/, "vorrat"],
  [/\bback\w*/, "backen"],
  [/\b(rezepte?|kochbuch)\b/, "rezepte"],
  [/\b(spontan\w*|ideen)\b/, "spontan"],
  [/\bwochenend[- ]?ideen\b/, "wochenendIdeen"],
  [/\btipps?\b/, "tipps"],
  [/\b(kochstil|vorlieben)\b/, "kochstil"],
];

export function parseBausteinCommand(text: string): BausteinCommand | null {
  const t = text.trim().toLowerCase().replace(/[.!?]+$/, "");
  if (/\b(was kannst du (sonst )?noch|welche bausteine|was gibt(['’]| e)?s (noch )?für bausteine|was kann (die app|[a-zäöüß-]+) noch)\b/.test(t)) return { kind: "list" };
  // Wochenend-Ideen vor Tipps/Ideen prüfen
  const feature = (/\bwochenend[- ]?ideen\b/.test(t) ? "wochenendIdeen" : WORDS.find(([re]) => re.test(t))?.[1]) as Feature | undefined;
  if (!feature) return null;
  if (/\b(brauch\w*|will|möchte|mag)\b.*\b(nicht|kein\w*)\b|\b(aus|ab)schalten\b|\bausblenden\b|\bschalt\w* .*\baus\b|\bweg damit\b|\bnicht mehr (zeigen|anzeigen)\b/.test(t)) return { kind: "set", feature, on: false };
  if (/\b(zeig\w*|einschalten|anschalten|aktivier\w*|einblenden|schalt\w* .*\b(an|ein)\b|brauch\w*|hätte gern|möchte|will)\b/.test(t)) return { kind: "set", feature, on: true };
  return null;
}
