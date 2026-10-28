// Kachel-Farben (Tafel 108): 8 Pastelltöne, jeder ist die Standardfarbe einer
// Kachel (Termine Lavendel, Aufgaben Mint …). Wer mag, gibt einer Kachel im
// Bearbeiten-Modus einen anderen Ton – nur aus dieser Palette, keine freie
// Farbwahl; „A“ = automatisch (ihre Standardfarbe). Die Schriftfarbe (-ac)
// kommt mit dem Ton. Wetter (Himmel) und Essen (Bild) haben keine Auswahl.
// Gespeichert pro Person in der Startseiten-Anordnung (`core/homeLayout`).
// Oberfläche: `data-farbe="<ton>"` (CSS in globals.css nutzt die Tokens der
// Kachel, deren Standard der Ton ist).

export type KachelFarbe = "lavendel" | "mint" | "salbei" | "rose" | "vanille" | "aqua" | "flieder" | "sand";

/** Die Palette in Anzeige-Reihenfolge; `kachel` = wessen Tokens (`--app-tile-<kachel>`) der Ton trägt */
export const KACHEL_FARBEN: { id: KachelFarbe; label: string; kachel: string }[] = [
  { id: "lavendel", label: "Lavendel", kachel: "termine" },
  { id: "mint", label: "Mint", kachel: "aufgaben" },
  { id: "salbei", label: "Salbei", kachel: "einkauf" },
  { id: "rose", label: "Rosé", kachel: "pinnwand" },
  { id: "vanille", label: "Vanille", kachel: "notizen" },
  { id: "aqua", label: "Aqua", kachel: "vorrat" },
  { id: "flieder", label: "Flieder", kachel: "sport" },
  { id: "sand", label: "Sand", kachel: "timer" },
];

const IDS = KACHEL_FARBEN.map((f) => f.id);

/** Wetter und Essen behalten Himmel bzw. Bild */
const OHNE_FARBWAHL: readonly string[] = ["wetter", "essen"];

/** Darf diese Kachel eine eigene Farbe haben? */
export const farbWaehlbar = (kachel: string) => !OHNE_FARBWAHL.includes(kachel);

/** Gespeicherten Wert prüfen: nur Töne der Palette, sonst automatisch (undefined) */
export function gueltigeFarbe(kachel: string, farbe: unknown): KachelFarbe | undefined {
  return farbWaehlbar(kachel) && IDS.includes(farbe as KachelFarbe) ? (farbe as KachelFarbe) : undefined;
}

/** Standardton einer Kachel (für den Ring bei „A“ und die Ansage) */
export const standardFarbe = (kachel: string): KachelFarbe | undefined => KACHEL_FARBEN.find((f) => f.kachel === kachel)?.id;

export const farbLabel = (farbe: KachelFarbe) => KACHEL_FARBEN.find((f) => f.id === farbe)!.label;

/**
 * Gesprochene Farbe → nächster Ton der Palette. „automatisch“/„Standard“ →
 * "auto" (zurück auf A). Unbekannt → null.
 */
const WOERTER: [string, KachelFarbe | "auto"][] = [
  ["auto|automatisch|standard|normal|a", "auto"],
  ["hellblau|babyblau|himmelblau|türkis|tuerkis|aqua|petrol|cyan", "aqua"],
  ["blau|dunkelblau|lavendel|indigo", "lavendel"],
  ["oliv|olivgrün|hellgrün|gelbgrün|lindgrün|salbei|limette", "salbei"],
  ["grün|gruen|mint|dunkelgrün", "mint"],
  ["gelb|vanille|creme|gold|golden|senf|orange", "vanille"],
  ["rosa|rose|rosé|pink|rot|altrosa|magenta", "rose"],
  ["lila|violett|flieder|purpur|mauve", "flieder"],
  ["beige|braun|hellbraun|sand|grau|taupe|weiß|weiss", "sand"],
];
/** Ganzes Wort mit Endung („blaue“, „grünen“), nie ein Teil („Rotwein“) */
const ALS_REGEX = WOERTER.map(([stamm, farbe]) => [new RegExp(`^(${stamm})(e|en|er|es|em)?$`), farbe] as const);

export function farbeAusWort(wort: string): KachelFarbe | "auto" | null {
  const w = wort.trim().toLowerCase().replace(/[„“"'.!?]/g, "");
  for (const [re, farbe] of ALS_REGEX) if (re.test(w)) return farbe;
  return null;
}
