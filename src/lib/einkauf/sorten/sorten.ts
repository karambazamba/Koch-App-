// Einkauf: die festen Sorten (A-067, Tafel 151), rein. Jede Sache bekommt
// genau eine Sorte – zuerst über die feste Wortliste (Drogerie, Putzen, Baby,
// Tier hier, Lebensmittel über die Abteilungen aus `sections.ts`), sonst
// über die KI (Haiku, einmal je Sache, gespeichert in `sortenKi`). Die Sorte
// entscheidet, in welchen Laden eine Sache ohne Ausnahme kommt (`plan.ts`).
// Reihenfolge `LAUFWEG` = wie man durch den Laden geht (Obst & Gemüse zuerst,
// Tiefkühl und Getränke zuletzt).

import { sectionFor, type Section } from "@/lib/einkauf/sections";

export type SorteId = "obst" | "brot" | "milch" | "fleisch" | "vorrat" | "tiefkuehl" | "getraenke" | "drogerie" | "putzen" | "baby" | "tier";

export const SORTEN: { id: SorteId; label: string; kurz: string }[] = [
  { id: "obst", label: "Obst & Gemüse", kurz: "Obst" },
  { id: "brot", label: "Brot & Brötchen", kurz: "Brot" },
  { id: "milch", label: "Milch, Käse, Eier", kurz: "Milch" },
  { id: "fleisch", label: "Fleisch & Wurst", kurz: "Fleisch" },
  { id: "vorrat", label: "Vorrat (Nudeln, Dosen)", kurz: "Vorrat" },
  { id: "tiefkuehl", label: "Tiefkühl", kurz: "Tiefkühl" },
  { id: "getraenke", label: "Getränke", kurz: "Getränke" },
  { id: "drogerie", label: "Drogerie & Pflege", kurz: "Drogerie" },
  { id: "putzen", label: "Putzen & Haushalt", kurz: "Putzen" },
  { id: "baby", label: "Baby & Kind", kurz: "Baby" },
  { id: "tier", label: "Tier", kurz: "Tier" },
];

const SORTE_IDS = SORTEN.map((s) => s.id);
export const isSorte = (v: unknown): v is SorteId => typeof v === "string" && (SORTE_IDS as string[]).includes(v);
export const sorteLabel = (id: SorteId) => SORTEN.find((s) => s.id === id)!.label;

/** Laufweg im Laden: Frisches zuerst, Tiefkühl und Getränke zuletzt */
export const LAUFWEG: SorteId[] = ["obst", "brot", "milch", "fleisch", "vorrat", "drogerie", "putzen", "baby", "tier", "tiefkuehl", "getraenke"];

/** Abteilung → Sorte („sonstiges“ weiß die Abteilung nicht) */
const AUS_ABTEILUNG: Partial<Record<Section, SorteId>> = {
  "obst-gemuese": "obst",
  brot: "brot",
  kuehlregal: "milch",
  "fleisch-fisch": "fleisch",
  vorrat: "vorrat",
  tiefkuehl: "tiefkuehl",
  getraenke: "getraenke",
};

/** Nicht-Lebensmittel (Wortteil → Sorte); Sonderfälle zuerst */
const WOERTER: [string, SorteId][] = [
  ["babybrei", "baby"], ["babynahrung", "baby"], ["windel", "baby"], ["feuchttücher", "baby"], ["schnuller", "baby"], ["babyöl", "baby"], ["babycreme", "baby"], ["pre-milch", "baby"], ["folgemilch", "baby"], ["gläschen", "baby"], ["quetschie", "baby"],
  ["katzenfutter", "tier"], ["hundefutter", "tier"], ["katzenstreu", "tier"], ["leckerli", "tier"], ["tierfutter", "tier"], ["vogelfutter", "tier"],
  ["zahnpasta", "drogerie"], ["zahncreme", "drogerie"], ["zahnbürste", "drogerie"], ["zahnseide", "drogerie"], ["mundspülung", "drogerie"], ["shampoo", "drogerie"], ["duschgel", "drogerie"], ["spülung", "drogerie"],
  ["deo", "drogerie"], ["seife", "drogerie"], ["handcreme", "drogerie"], ["gesichtscreme", "drogerie"], ["lotion", "drogerie"], ["sonnenmilch", "drogerie"], ["sonnencreme", "drogerie"], ["rasier", "drogerie"], ["tampon", "drogerie"], ["binden", "drogerie"],
  ["wattepads", "drogerie"], ["wattestäbchen", "drogerie"], ["pflaster", "drogerie"], ["haargummi", "drogerie"], ["haarspray", "drogerie"], ["make-up", "drogerie"], ["lippenpflege", "drogerie"], ["taschentücher", "drogerie"], ["kosmetik", "drogerie"], ["nagellack", "drogerie"],
  ["klopapier", "putzen"], ["toilettenpapier", "putzen"], ["küchenrolle", "putzen"], ["spülmittel", "putzen"], ["spültabs", "putzen"], ["geschirrspül", "putzen"], ["waschmittel", "putzen"], ["weichspüler", "putzen"], ["putzmittel", "putzen"], ["reiniger", "putzen"],
  ["müllbeutel", "putzen"], ["mülltüten", "putzen"], ["schwamm", "putzen"], ["schwämme", "putzen"], ["alufolie", "putzen"], ["frischhaltefolie", "putzen"], ["backpapier", "putzen"], ["gefrierbeutel", "putzen"], ["batterien", "putzen"], ["glühbirne", "putzen"],
  ["grillkohle", "putzen"], ["holzkohle", "putzen"], ["grillanzünder", "putzen"], ["kerzen", "putzen"], ["servietten", "putzen"], ["entkalker", "putzen"], ["wc-", "putzen"], ["lappen", "putzen"], ["essigreiniger", "putzen"], ["spülmaschinensalz", "putzen"], ["klarspüler", "putzen"],
];

/**
 * Sorte aus der festen Wortliste; null = weiß sie nicht (dann fragt die App
 * die KI). „Milch“ ist Milch, „Sonnenmilch“ Drogerie: Nicht-Lebensmittel zuerst.
 */
export function sorteAusWortliste(name: string): SorteId | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  const wort = WOERTER.find(([w]) => n.includes(w));
  if (wort) return wort[1];
  return AUS_ABTEILUNG[sectionFor(n)] ?? null;
}

const lower = (s: string) => s.trim().toLowerCase();

/** Sorte einer Sache: Wortliste, sonst was die KI einmal gesagt hat; null = unbekannt */
export function sorteFuer(name: string, sortenKi: Record<string, SorteId> = {}): SorteId | null {
  return sorteAusWortliste(name) ?? sortenKi[lower(name)] ?? null;
}

/** Namen, die die KI noch einordnen soll (Wortliste weiß sie nicht, noch nicht gefragt) – je Name einmal */
export function unbekannteSorten(namen: readonly string[], sortenKi: Record<string, SorteId> = {}): string[] {
  const out = new Set<string>();
  for (const n of namen) if (lower(n) && sorteFuer(n, sortenKi) === null) out.add(lower(n));
  return [...out].slice(0, 30);
}

/** Wörter, mit denen man im Satz eine ganze Sorte meint („Getränke kaufe ich bei Edeka“) */
const SORTE_WOERTER: [RegExp, SorteId][] = [
  // Nur Sammelwörter: „Milch immer bei Rewe“ bleibt eine Ausnahme für Milch
  [/^(?:obst|gemüse|obst (?:und|&) gemüse)$/, "obst"],
  [/^(?:brot (?:und|&) brötchen|backwaren|backsachen)$/, "brot"],
  [/^(?:milchprodukte|milchsachen|milch, käse(?:,| und) eier|kühlregal)$/, "milch"],
  [/^(?:fleisch|fleisch (?:und|&) wurst|wurstwaren)$/, "fleisch"],
  [/^(?:vorrat|vorräte|nudeln und dosen|konserven)$/, "vorrat"],
  [/^(?:tiefkühl(?:sachen|kost|zeug|ware)?|tk-sachen)$/, "tiefkuehl"],
  [/^(?:getränke|getränkekisten)$/, "getraenke"],
  [/^(?:drogerie(?:sachen|zeug|artikel)?|drogerie (?:und|&) pflege|pflegesachen|kosmetik)$/, "drogerie"],
  [/^(?:putz(?:sachen|zeug|mittel)|haushalt(?:ssachen|swaren)?|putzen (?:und|&) haushalt)$/, "putzen"],
  [/^(?:baby(?:sachen|zeug)|kindersachen|baby (?:und|&) kind)$/, "baby"],
  [/^(?:tierfutter|tiersachen|tierbedarf)$/, "tier"],
];

/** „Getränke“ → getraenke; null = keine Sorte, sondern eine einzelne Sache */
export function sorteAusWort(text: string): SorteId | null {
  const t = lower(text).replace(/^(?:die|das|der|unsere?|meine?)\s+/, "");
  return SORTE_WOERTER.find(([re]) => re.test(t))?.[1] ?? null;
}
