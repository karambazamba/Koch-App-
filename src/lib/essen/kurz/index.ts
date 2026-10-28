// Schnellanleitung (Tafel 122 Nachtrag, rein): je Schritt eine kurze Zeile.
// Woher: eigene Kurzfassung des Rezepts (Mia liefert sie beim Schreiben mit,
// `shortSteps`) → fest hinterlegt für die eingebauten Gerichte und
// Beispielgerichte (daten*.ts, kein KI-Aufruf beim Öffnen) → sonst kürzt die
// App auf den ersten Satz je Schritt. Dazu: Zeitangaben im Text finden, damit
// „10 Min“ als Timer-Chip antippbar wird – in beiden Ansichten gleich.

import type { Recipe } from "@/lib/essen/cookbook";
import { stepMinutes } from "@/lib/essen/kochSession";
import { KURZ_1 } from "@/lib/essen/kurz/daten1";
import { KURZ_2 } from "@/lib/essen/kurz/daten2";
import { KURZ_3 } from "@/lib/essen/kurz/daten3";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { DEMO_RECIPES } from "@/lib/essen/demoDish";

/** Beispielgerichte des Beispiel-Tags („d:…“) */
const KURZ_DEMO: Record<string, string[]> = {
  "d:pasta-burrata": ["Nudelwasser aufsetzen, salzen", "Tomaten halbieren, Knoblauch schneiden", "Spaghetti kochen, Tomaten 5 Min schmoren", "Nudeln zu den Tomaten geben", "Burrata und Basilikum drauf"],
  "d:ofengemuese": ["Ofen auf 220 °C vorheizen", "Gemüse schneiden, würzen", "30 Min backen, Feta drauf, 5 Min weiter"],
  "d:lasagne": ["Hacksoße mit Tomaten, 20 Min köcheln", "Béchamel rühren, aufkochen", "Abwechselnd schichten, Käse drauf", "Bei 180 °C 40 Min backen"],
  "d:ofen-haehnchen": ["Ofen auf 200 °C vorheizen", "Hähnchen würzen, Zitrone hinein", "Kartoffeln und Möhren drumherum", "70 Min backen, ab und zu begießen"],
  "d:lachs-reis": ["Reis kochen", "Brokkoli die letzten 5 Min mit", "Lachs je Seite 4 Min braten", "Reis mit Zitrone und Dill mischen"],
  "d:wraps": ["Gemüse schneiden", "Fladen mit Frischkäse bestreichen", "Belegen, einrollen, halbieren"],
};

/** Alle fest hinterlegten Kurzfassungen je Rezept-ID @public (Tests: alle Gerichte haben eine) */
export const KURZ: Record<string, string[]> = { ...KURZ_1, ...KURZ_2, ...KURZ_3, ...KURZ_DEMO };

/** Höchstens so viele Wörter je Zeile der Schnellanleitung */
export const KURZ_WOERTER = 8;

const stepsKey = (steps: string[]) => steps.map((s) => s.trim()).join("\n");
let bySteps: Map<string, string[]> | null = null;

/** Fest hinterlegte Kurzfassung auch für übernommene Rezepte („In unsere Rezepte“: gleiche Schritte, neue ID) */
function festNachSchritten(steps: string[]): string[] | undefined {
  bySteps ??= new Map([...BUILTIN_COOK, ...DEMO_RECIPES].filter((r) => KURZ[r.id]).map((r) => [stepsKey(r.steps), KURZ[r.id]]));
  return bySteps.get(stepsKey(steps));
}

// Abkürzungen mit Punkt sind kein Satzende („ca. 20 Min. backen“)
const ABK = /(?<![a-zäöüß])(?:ca|bzw|evtl|z\.\s?b|min|std|pck|pkg|el|tl|max|mind|usw|etc|gestr|geh)\.$/i;

/** Erster Satz eines Schritts, ohne Schlusspunkt: „Reis kochen. Dann …“ → „Reis kochen“ */
export function ersterSatz(step: string): string {
  const t = step.trim();
  // Satzende = Punkt/!/? mit Leerzeichen danach (nicht „1.5“, nicht nach Abkürzungen)
  for (const m of t.matchAll(/[.!?](?=\s+\S)/g)) {
    const head = t.slice(0, m.index + 1);
    if (m[0] === "." && (ABK.test(head) || /\d\.$/.test(head))) continue;
    return head.replace(/[.!]$/, "").trim();
  }
  return t.replace(/[.!]$/, "").trim();
}

/** Schnellanleitung eines Rezepts – immer genauso viele Zeilen wie Schritte */
export function kurzSchritte(recipe: Pick<Recipe, "id" | "steps"> & { shortSteps?: string[] }): string[] {
  const n = recipe.steps.length;
  const ok = (list: string[] | undefined): list is string[] => Array.isArray(list) && list.length === n && list.every((s) => typeof s === "string" && s.trim());
  if (ok(recipe.shortSteps)) return recipe.shortSteps.map((s) => s.trim());
  const fest = KURZ[recipe.id] ?? festNachSchritten(recipe.steps);
  if (ok(fest)) return fest;
  return recipe.steps.map(ersterSatz);
}

export type SchrittTeil = { text: string } | { min: number; text: string };

// „10 Min“, „10 Minuten“, „12–15 Minuten“, „1 Stunde“ – nicht direkt an Buchstaben (kein \b an Umlauten)
const ZEIT = /(?<![a-zäöüß\d])(\d+(?:\s*(?:[-–]|bis)\s*\d+)?\s*(?:Min(?:uten?)?\.?|Std\.?|Stunden?))(?![a-zäöüß])/gi;

/**
 * Text eines Schritts in Teile zerlegen: Zeitangaben werden Timer-Chips.
 * „Tomaten dazu, 10 Min köcheln“ → [„Tomaten dazu, “, ⏱10, „ köcheln“].
 */
export function schrittTeile(step: string): SchrittTeil[] {
  const parts: SchrittTeil[] = [];
  let last = 0;
  for (const m of step.matchAll(ZEIT)) {
    const min = stepMinutes(m[1].replace(/Min\.?$/i, "Min"));
    if (min === null) continue;
    if (m.index > last) parts.push({ text: step.slice(last, m.index) });
    parts.push({ min, text: m[1].replace(/\.$/, "") });
    last = m.index + m[1].length;
  }
  if (last < step.length) parts.push({ text: step.slice(last) });
  return parts.length ? parts : [{ text: step }];
}

/** Wörter einer Zeile (für die Regel „höchstens 8“) */
export const woerter = (line: string) => line.trim().split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;

/**
 * Schritt ohne Zeitangaben (die stehen daneben als Timer-Chip):
 * „Kartoffeln 20 Min kochen“ → „Kartoffeln kochen“, „10 Min backen“ → „Backen“.
 */
export function ohneZeit(step: string): string {
  const text = schrittTeile(step)
    .map((p) => ("min" in p ? " " : p.text))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/,(\s*[,.;:!?])/g, "$1")
    .replace(/^[\s,;:]+|[\s,;:]+$/g, "")
    .replace(/,\s*\.$/, ".");
  return text ? text[0].toUpperCase() + text.slice(1) : step.trim();
}

/** Timer-Zeiten eines Schritts (für die Chips) */
export const schrittZeiten = (step: string) => schrittTeile(step).flatMap((p) => ("min" in p ? [{ min: p.min, text: p.text }] : []));
