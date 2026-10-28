// Eine Bühne für jedes Gespräch mit Mia: Mia im unteren Drittel, das Gespräch
// läuft oben mit, die Seite dahinter schimmert verschwommen durch. Hier die
// reinen Regeln: Zustand, Hinweis unter Mia, was ein Tipp auf Mia tut,
// Tippen-Modus und der kleine Bereichs-Kopf über Mias erster Blase.


/** zuhören · überlegen · sprechen · warten – setzt die App automatisch */
export type StageState = "zuhoeren" | "ueberlegen" | "sprechen" | "warten";

export function stageState({ listening, thinking, speaking }: { listening: boolean; thinking: boolean; speaking: boolean }): StageState {
  if (listening) return "zuhoeren";
  if (thinking) return "ueberlegen";
  if (speaking) return "sprechen";
  return "warten";
}

/**
 * Ring um die große Mia – höchstens einer, nie im Warten: Wellen nur beim
 * Zuhören, in der Stille nach dem letzten Wort („Gleich schick ich’s ab“)
 * nur der ablaufende Ring.
 */
export function stageRing(state: StageState, pause = false): "wellen" | "pause" | null {
  if (pause) return "pause";
  return state === "zuhoeren" ? "wellen" : null;
}

/** Kleiner Satz unter Mia (beim Überlegen und Sprechen keiner); `fresh` = noch nichts erzählt */
export function stageHint(state: StageState, name: string, fresh = false): string {
  if (state === "zuhoeren") return `Fertig? Einfach ${name} antippen`;
  if (state === "warten") return fresh ? "Tipp mich an und erzähl einfach" : "Tipp mich an, wenn du noch was hast";
  return "";
}

/** VoiceOver-Name der großen Mia */
export function stageLabel(state: StageState, mic: { blocked: boolean; supported: boolean | null }): string {
  const tap = stageTap(state, mic);
  return tap === "fertig" ? "Zuhören beenden" : tap === "tippen" ? "Schreiben statt sprechen" : "Frage einsprechen";
}

/**
 * Mia antippen wie bei der Sprachnachricht: einmal = los, nochmal = fertig.
 * Mikro aus oder nicht vorhanden: kein Hilfefenster davor, sondern das Tippfeld.
 */
export function stageTap(state: StageState, mic: { blocked: boolean; supported: boolean | null }): "start" | "fertig" | "tippen" {
  if (state === "zuhoeren") return "fertig";
  if (mic.blocked || mic.supported === false) return "tippen";
  return "start";
}

/** Tippen-Modus: Feld unten, Mia klein direkt darüber; sonst Mia groß im unteren Drittel */
export function stageLayout({ typing, blocked, supported }: { typing: boolean; blocked: boolean; supported: boolean | null }): { field: boolean; size: number } {
  const field = typing || blocked || supported === false;
  return { field, size: field ? STAGE_SIZE.small : STAGE_SIZE.big };
}

export const STAGE_SIZE = { big: 120, small: 64 } as const;

/** Mias Mittelpunkt liegt bei ~64 % der Bildschirmhöhe */
export const STAGE_CENTER = 0.64;

/** Bereichs-Kopf über Mias erster Blase – nur mit Anlass */
export function stageTopic(mode: string | undefined): string | undefined {
  if (mode === "wochencheck") return "WOCHENCHECK";
  if (mode === "kochtipp") return "KOCHIDEE";
  if (mode === "imhaus") return "IM HAUS";
  if (mode === "einkauf") return "EINKAUF";
  return undefined;
}

/** Kleine Mia neben einer Blase nur bei der ersten Blase einer Folge */
export function firstOfRun(roles: readonly ("user" | "assistant")[], i: number): boolean {
  return roles[i] === "assistant" && (i === 0 || roles[i - 1] !== "assistant");
}
