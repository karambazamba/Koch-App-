// Einkauf: „Was holst du wo?“ (A-067, Tafel 151), rein. Der Plan des
// Haushalts: Hauptladen („Das meiste bei“) und je Sorte eine Liste von Läden
// (Reihenfolge = Vorrang, höchstens 3; Nachtrag). Eine Sache ohne Ausnahme
// steht in ALLEN Läden ihrer Sorte (darunter klein „auch Markt“), ohne
// Regel im Hauptladen. Dazu die Vorschläge für Schritt 2 und das Lesen von
// Sätzen („Rewe, Lidl und dm“, „auf dem Markt und bei Rewe“).

import { SORTEN, isSorte, type SorteId } from "@/lib/einkauf/sorten/sorten";

export type LadenPlan = {
  /** „Das meiste bei“ */
  haupt: string;
  /** Sorte → Läden (Vorrang in Reihenfolge); fehlt = Hauptladen */
  regeln: Partial<Record<SorteId, string[]>>;
};

/** Höchstens so viele Läden je Sorte */
export const MAX_JE_SORTE = 3;

/** Läden in Schritt 1, in dieser Reihenfolge */
export const EINRICHTEN_LAEDEN = ["Rewe", "Edeka", "Lidl", "Aldi", "Netto", "Penny", "Kaufland", "dm", "Rossmann", "Getränkemarkt", "Wochenmarkt", "Bäcker"];

const lower = (s: string) => s.trim().toLowerCase();
const clean = (s: string) => s.replace(/\s+/g, " ").trim().slice(0, 30);
const has = (list: readonly string[], name: string) => list.some((x) => lower(x) === lower(name));
const pick = (list: readonly string[], name: string) => list.find((x) => lower(x) === lower(name));

const DISCOUNTER = ["Lidl", "Aldi", "Netto", "Penny"];
const VOLL = ["Rewe", "Edeka", "Kaufland"];
const DROGERIE = ["dm", "Rossmann"];

/** Gespeicherten Plan prüfen (fremde Geräte, alte Stände); null = keiner */
export function migratePlan(raw: unknown): LadenPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { haupt?: unknown; regeln?: unknown };
  if (typeof r.haupt !== "string" || !clean(r.haupt)) return null;
  const regeln: LadenPlan["regeln"] = {};
  if (r.regeln && typeof r.regeln === "object") {
    for (const [k, v] of Object.entries(r.regeln as Record<string, unknown>)) {
      if (!isSorte(k) || !Array.isArray(v)) continue;
      const shops = v.filter((x): x is string => typeof x === "string" && Boolean(clean(x))).map(clean);
      const einmal = shops.filter((s, i) => shops.findIndex((x) => lower(x) === lower(s)) === i).slice(0, MAX_JE_SORTE);
      if (einmal.length) regeln[k] = einmal;
    }
  }
  return { haupt: clean(r.haupt), regeln };
}

/** Hauptladen-Vorschlag: ein Vollsortimenter, sonst ein Discounter, sonst der erste */
export function hauptVorschlag(laeden: readonly string[]): string {
  return laeden.find((l) => has(VOLL, l)) ?? laeden.find((l) => has(DISCOUNTER, l)) ?? laeden.find((l) => !has([...DROGERIE, "Bäcker", "Wochenmarkt", "Getränkemarkt"], l)) ?? laeden[0] ?? "";
}

/**
 * Vorschlag für Schritt 2 (nur aus den gewählten Läden): Drogerie/Putzen/Baby
 * → dm bzw. Rossmann, Getränke → Getränkemarkt, Obst & Gemüse → Wochenmarkt,
 * Brot → Bäcker, Vorrat/Tiefkühl → Discounter, falls gewählt; der Rest bleibt
 * beim Hauptladen.
 */
export function vorschlagPlan(laeden: readonly string[], haupt = hauptVorschlag(laeden)): LadenPlan {
  const regeln: LadenPlan["regeln"] = {};
  const set = (sorten: SorteId[], shop: string | undefined) => {
    if (shop && lower(shop) !== lower(haupt)) for (const s of sorten) regeln[s] = [shop];
  };
  set(["drogerie", "putzen", "baby"], laeden.find((l) => has(DROGERIE, l)));
  set(["getraenke"], pick(laeden, "Getränkemarkt"));
  set(["obst"], pick(laeden, "Wochenmarkt"));
  set(["brot"], pick(laeden, "Bäcker"));
  set(["vorrat", "tiefkuehl"], laeden.find((l) => has(DISCOUNTER, l)));
  return { haupt, regeln };
}

/** Läden einer Sorte (Vorrang zuerst); ohne Regel der Hauptladen */
export function laedenFuerSorte(plan: LadenPlan, sorte: SorteId | null): string[] {
  const eigene = sorte ? plan.regeln[sorte] : undefined;
  return eigene?.length ? eigene : [plan.haupt];
}

/** „Wochenmarkt + Rewe“ */
export const planText = (shops: readonly string[]) => shops.join(" + ");

/** „auch Markt“ unter einer Sache, die in mehreren Läden steht */
export const auchText = (shop: string) => `auch ${lower(shop) === "wochenmarkt" ? "Markt" : shop}`;

/** Schritt 2: einen Laden für eine Sorte an- bzw. abwählen (höchstens 3, Reihenfolge = Antippen) */
export function sorteUmschalten(plan: LadenPlan, sorte: SorteId, shop: string): LadenPlan {
  const jetzt = laedenFuerSorte(plan, sorte);
  const drin = has(jetzt, shop);
  const neu = drin ? jetzt.filter((x) => lower(x) !== lower(shop)) : [...jetzt, shop].slice(-MAX_JE_SORTE);
  return mitSorte(plan, sorte, neu);
}

/** Sorte auf genau diese Läden setzen (leer = wieder Hauptladen) */
export function mitSorte(plan: LadenPlan, sorte: SorteId, shops: readonly string[]): LadenPlan {
  const regeln = { ...plan.regeln };
  const liste = shops.map(clean).filter(Boolean).slice(0, MAX_JE_SORTE);
  if (!liste.length || (liste.length === 1 && lower(liste[0]) === lower(plan.haupt))) delete regeln[sorte];
  else regeln[sorte] = liste;
  return { ...plan, regeln };
}

/** Hauptladen wechseln: Sorten, die nur beim alten Hauptladen standen, ziehen still mit */
export function mitHaupt(plan: LadenPlan, haupt: string): LadenPlan {
  const regeln: LadenPlan["regeln"] = {};
  for (const [k, v] of Object.entries(plan.regeln) as [SorteId, string[]][]) if (!(v.length === 1 && lower(v[0]) === lower(haupt))) regeln[k] = v;
  return { haupt: clean(haupt), regeln };
}

/** Eine Zeile für Mia: „Das meiste bei Rewe; Obst & Gemüse → Wochenmarkt + Rewe; …“ */
export function planZeile(plan: LadenPlan): string {
  const teile = SORTEN.filter((s) => plan.regeln[s.id]?.length).map((s) => `${s.label} → ${planText(plan.regeln[s.id]!)}`);
  return [`Das meiste bei ${plan.haupt}`, ...teile].join("; ");
}

/** Alle Läden, die der Plan nennt (Hauptladen zuerst) */
export function planLaeden(plan: LadenPlan): string[] {
  const out = [plan.haupt];
  for (const s of SORTEN) for (const l of plan.regeln[s.id] ?? []) if (!has(out, l)) out.push(l);
  return out;
}

/** Laden-Namen so schreiben, wie man sie kennt („rewe“ → „Rewe“, „dem Markt“ → „Wochenmarkt“) */
function ladenName(text: string, bekannt: readonly string[] = []): string {
  const t = clean(text.replace(/^(?:bei|beim|im|in der|auf dem|aufm|vom|von|dem|der|den)\s+/i, "").replace(/^(?:dem|der|den)\s+/i, "").replace(/[.!?]+$/, ""));
  if (/^(?:markt|wochenmarkt|dem markt)$/i.test(t)) return "Wochenmarkt";
  if (/^(?:getränke(?:markt|händler|laden)?)$/i.test(t)) return "Getränkemarkt";
  if (/^(?:bäcker(?:ei)?)$/i.test(t)) return "Bäcker";
  if (/^(?:schlachter(?:ei)?|metzger(?:ei)?|fleischer(?:ei)?)$/i.test(t)) return t.charAt(0).toLocaleUpperCase("de-DE") + t.slice(1).toLowerCase();
  const kennt = pick([...EINRICHTEN_LAEDEN, ...bekannt], t);
  if (kennt) return kennt;
  return t ? t.charAt(0).toLocaleUpperCase("de-DE") + t.slice(1) : t;
}

/** „Rewe, Lidl und dm“ → ["Rewe", "Lidl", "dm"] (höchstens 12, jeder einmal) */
export function laedenAusSatz(text: string, bekannt: readonly string[] = []): string[] {
  const roh = text
    .replace(/^(?:ich|wir)\s+(?:kauf\w*|geh\w*|hol\w*)\s+(?:meist(?:ens)?\s+)?(?:ein\s+)?/i, "")
    .split(/\s*(?:,|;|\+|&|\bund\b|\boder\b|\bsowie\b)\s*/i)
    .map((x) => ladenName(x, bekannt))
    .filter((x) => x && x.split(" ").length <= 3);
  return roh.filter((s, i) => roh.findIndex((x) => lower(x) === lower(s)) === i).slice(0, 12);
}
