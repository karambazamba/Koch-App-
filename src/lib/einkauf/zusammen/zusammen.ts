// Einkauf: Doppeltes zusammenfassen (Nachtrag A-018, Punkt 3), rein.
// Gleiche Sache (Normalform: Groß/klein, Einzahl/Mehrzahl, Umlaute) im
// selben Laden = ein Eintrag. Mengen werden addiert, wenn die Einheiten
// zusammenpassen („500 g“ + „250 g“ = „750 g“, „2“ + „1“ = „3“), sonst
// bleiben beide Angaben stehen („500 g + 1 Packung“) – nichts geht verloren.
// Hat nur eine Seite eine Menge, bleibt diese.

import type { ManualItem } from "@/lib/einkauf/listModel";

/** Letztes Wort ohne Mehrzahl-Endung („Tomaten“ = „Tomate“, „Zucchinis“ = „Zucchini“, „Eier“ = „Ei“) */
const stamm = (w: string) => (w === "eier" ? "ei" : w.length > 3 ? w.replace(/(en|n|e|s)$/, "") : w);

/** Normalform eines Namens: klein, ohne Umlaute/Zeichen, letztes Wort ohne Mehrzahl */
export function normalform(name: string): string {
  const words = name
    .toLocaleLowerCase("de-DE")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/ü/g, "u")
    .replace(/[^a-zß0-9 ]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const last = words.pop();
  return last ? [...words, stamm(last)].join(" ") : "";
}

/** Gleiche Sache? */
export const gleicheSache = (a: string, b: string) => {
  const x = normalform(a);
  return x !== "" && x === normalform(b);
};

// --- Mengen ---------------------------------------------------------------------

/** Einheit → Familie (g/ml in Grundeinheit), Einzahl/Mehrzahl zum Ausgeben */
const EINHEITEN: Record<string, { familie: string; faktor: number; eins?: string; viele?: string }> = {
  g: { familie: "g", faktor: 1 },
  gramm: { familie: "g", faktor: 1 },
  kg: { familie: "g", faktor: 1000 },
  ml: { familie: "ml", faktor: 1 },
  l: { familie: "ml", faktor: 1000 },
  liter: { familie: "ml", faktor: 1000 },
  "": { familie: "", faktor: 1 },
  x: { familie: "", faktor: 1 },
  "×": { familie: "", faktor: 1 },
  stück: { familie: "", faktor: 1 },
  stk: { familie: "", faktor: 1 },
  packung: { familie: "packung", faktor: 1, eins: "Packung", viele: "Packungen" },
  packungen: { familie: "packung", faktor: 1, eins: "Packung", viele: "Packungen" },
  pck: { familie: "packung", faktor: 1, eins: "Packung", viele: "Packungen" },
  dose: { familie: "dose", faktor: 1, eins: "Dose", viele: "Dosen" },
  dosen: { familie: "dose", faktor: 1, eins: "Dose", viele: "Dosen" },
  flasche: { familie: "flasche", faktor: 1, eins: "Flasche", viele: "Flaschen" },
  flaschen: { familie: "flasche", faktor: 1, eins: "Flasche", viele: "Flaschen" },
  becher: { familie: "becher", faktor: 1, eins: "Becher", viele: "Becher" },
  glas: { familie: "glas", faktor: 1, eins: "Glas", viele: "Gläser" },
  gläser: { familie: "glas", faktor: 1, eins: "Glas", viele: "Gläser" },
  bund: { familie: "bund", faktor: 1, eins: "Bund", viele: "Bund" },
  kiste: { familie: "kiste", faktor: 1, eins: "Kiste", viele: "Kisten" },
  kisten: { familie: "kiste", faktor: 1, eins: "Kiste", viele: "Kisten" },
};

const zahl = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

type Teil = { familie: string; wert: number; eins?: string; viele?: string } | { text: string };

function teil(raw: string): Teil | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/^(?:[x×]\s*)?(\d+(?:[.,]\d+)?)\s*(.*)$/i);
  if (m) {
    const e = EINHEITEN[m[2].trim().toLocaleLowerCase("de-DE")];
    if (e) return { familie: e.familie, wert: Number(m[1].replace(",", ".")) * e.faktor, eins: e.eins, viele: e.viele };
  }
  return { text: t };
}

function ausgeben(t: Teil): string {
  if ("text" in t) return t.text;
  if (t.familie === "g") return t.wert >= 1000 ? `${zahl(t.wert / 1000)} kg` : `${zahl(t.wert)} g`;
  if (t.familie === "ml") return t.wert >= 1000 ? `${zahl(t.wert / 1000)} l` : `${zahl(t.wert)} ml`;
  if (t.familie === "") return zahl(t.wert);
  return `${zahl(t.wert)} ${t.wert === 1 ? t.eins : t.viele}`;
}

/** Zwei Mengen-Texte zusammen: gleiche Einheiten addiert, sonst beide („500 g + 1 Packung“) */
export function mengenAddieren(a: string, b: string): string {
  if (!a.trim()) return b.trim();
  if (!b.trim()) return a.trim();
  const out: Teil[] = [];
  for (const raw of [...a.split(" + "), ...b.split(" + ")]) {
    const t = teil(raw);
    if (!t) continue;
    if ("text" in t) {
      if (!out.some((x) => "text" in x && x.text.toLocaleLowerCase("de-DE") === t.text.toLocaleLowerCase("de-DE"))) out.push(t);
      continue;
    }
    const da = out.find((x): x is Exclude<Teil, { text: string }> => !("text" in x) && x.familie === t.familie);
    if (da) da.wert += t.wert;
    else out.push({ ...t });
  }
  return out.map(ausgeben).join(" + ");
}

// --- Eigene Artikel -------------------------------------------------------------

/** Laden eines Namens (gemerkt/Regel); `null` = noch ohne Laden */
export type LadenVon = (name: string) => string | null;

const gleicherLaden = (a: string, b: string, laden: LadenVon) => (laden(a) ?? "\u0000").toLowerCase() === (laden(b) ?? "\u0000").toLowerCase();

/** Wohin gehört ein neuer Artikel? Offener eigener Artikel mit gleicher Sache im selben Laden */
export function zielFuer(manual: ManualItem[], name: string, laden: LadenVon): ManualItem | undefined {
  return manual.find((m) => !m.done && gleicheSache(m.name, name) && gleicherLaden(m.name, name, laden));
}

/** `neu` in `ziel` aufnehmen: Mengen addiert, „Jetzt mitnehmen“ bleibt, Rezeptmenge addiert */
export function aufnehmen(ziel: ManualItem, neu: Pick<ManualItem, "amount"> & Partial<ManualItem>): ManualItem {
  const rezeptMenge = mengenAddieren(ziel.rezeptMenge ?? "", neu.rezeptMenge ?? "");
  return {
    ...ziel,
    amount: mengenAddieren(ziel.amount, neu.amount),
    ...(neu.now ? { now: true } : {}),
    ...(!ziel.dish && neu.dish ? { dish: neu.dish } : {}),
    ...(!ziel.day && neu.day ? { day: neu.day } : {}),
    ...(rezeptMenge ? { rezeptMenge } : {}),
  };
}

/**
 * Doppelte offene eigene Artikel einer Woche zusammenfassen (Migration, rückwirkend).
 * Bleiben darf der Eintrag mit der kleinsten Kennung – so entscheiden alle
 * Geräte im Haushalt gleich (der andere wird beim Abgleich als gelöscht markiert).
 */
export function wocheZusammenfassen(manual: ManualItem[], laden: LadenVon): ManualItem[] {
  const offen = manual.filter((m) => !m.done);
  const weg = new Set<string>();
  const neu = new Map<string, ManualItem>();
  const reihe = [...offen].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const m of reihe) {
    if (weg.has(m.id)) continue;
    let ziel = m;
    for (const x of reihe) {
      if (x.id === m.id || weg.has(x.id) || neu.has(x.id) || !gleicheSache(x.name, m.name) || !gleicherLaden(x.name, m.name, laden)) continue;
      ziel = aufnehmen(ziel, x);
      weg.add(x.id);
    }
    if (ziel !== m) neu.set(m.id, ziel);
  }
  if (!weg.size) return manual;
  return manual.filter((m) => !weg.has(m.id)).map((m) => neu.get(m.id) ?? m);
}
