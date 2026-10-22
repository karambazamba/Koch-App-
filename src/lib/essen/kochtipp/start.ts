// Kochtipp: Mias Anfang im Chat und die Schnellantworten – klein gehalten,
// weil die Begleitung (Layout) es beim Öffnen braucht.

import type { CookSource } from "@/lib/essen/kochtipp/pick";

const SOURCE_CHIPS: { source: CookSource; label: string }[] = [
  { source: "vorrat", label: "Schau in den Vorrat" },
  { source: "reste", label: "Reste verwerten" },
  { source: "einkauf", label: "Neu einkaufen" },
];

/** Mias Anfang – mit der letzten Wahl als Vorschlag */
export function kochtippStart(last: { source: CookSource } | null): string[] {
  const again: Record<CookSource, string> = { vorrat: "Wie letztes Mal aus dem Vorrat?", reste: "Wie letztes Mal Reste verwerten?", einkauf: "Wie letztes Mal neu einkaufen?" };
  return ["Lust auf was ganz anderes? 😋", last ? `Sag mir, was noch da ist – oder kaufen wir neu ein? ${again[last.source]}` : "Sag mir, was noch da ist – oder kaufen wir neu ein?"];
}

/** Die drei Schnellantworten, die letzte Wahl zuerst */
export const sourceChips = (last: { source: CookSource } | null) => [...SOURCE_CHIPS].sort((a, b) => Number(b.source === last?.source) - Number(a.source === last?.source)).map((c) => c.label);

/** „Kochtipp“, „Was soll ich kochen?“ – startet den Kochtipp („Ich hab noch …“ nur im Kochtipp selbst, sonst ist es Vorrat) */
export const isKochtippRequest = (t: string) => /koch-?tipp|^was\s+soll\s+ich\s+(?:heute\s+|jetzt\s+)?kochen\??$/i.test(t.trim());
