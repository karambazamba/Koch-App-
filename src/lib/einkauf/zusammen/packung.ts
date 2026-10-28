// Einkauf: Rezeptmengen als Einkaufsmengen (Nachtrag A-018, Punkt 4), rein.
// Aus Rezepten wird auf die übliche Packung gerundet: Milch 250 ml → „Milch“,
// Lasagneplatten 2 Stück → „1 Packung“, Parmesan 20 g → „Parmesan“. Die
// Rezeptmenge steht nur klein als Hinweis („250 ml für Lasagne“). Krümel
// (Löffel, Prisen, unter 50 g/ml) fallen als Hauptmenge weg. Gilt nur für
// Rezeptmengen – eigene Mengen der Nutzer werden nie geändert.

type Packung = {
  /** Normalform-Muster (letztes Wort bzw. ganzer Name) */
  muster: RegExp;
  /** Größe einer Packung in g bzw. ml (Familie `familie`) */
  groesse: number;
  familie: "g" | "ml";
  eins: string;
  viele: string;
  /** Auch bei einer Packung die Menge zeigen („1 Packung“) */
  immer?: boolean;
  /** Stück je Packung, wenn das Rezept Stück zählt (Lasagneplatten) */
  stueck?: number;
};

// Reihenfolge zählt: Besonderes zuerst („Kokosmilch“ ≠ Milch). Muster auf dem
// klein geschriebenen Namen ohne Umlaute (Mehrzahl optional)
const PACKUNGEN: Packung[] = [
  { muster: /kokosmilch$/, groesse: 400, familie: "ml", eins: "Dose", viele: "Dosen", immer: true },
  { muster: /(passierte tomaten|passata)$/, groesse: 500, familie: "g", eins: "Packung", viele: "Packungen", immer: true },
  { muster: /(gehackte|stuckige) tomaten$/, groesse: 400, familie: "g", eins: "Dose", viele: "Dosen", immer: true },
  { muster: /(saure sahne|schmand|creme fraiche)$/, groesse: 200, familie: "g", eins: "Becher", viele: "Becher" },
  { muster: /sahne$/, groesse: 200, familie: "ml", eins: "Becher", viele: "Becher" },
  { muster: /milch$/, groesse: 1000, familie: "ml", eins: "l", viele: "l" },
  { muster: /mehl$/, groesse: 1000, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /zucker$/, groesse: 1000, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /butter$/, groesse: 250, familie: "g", eins: "Stück", viele: "Stück" },
  { muster: /(parmesan|pecorino|grana padano)$/, groesse: 200, familie: "g", eins: "Stück", viele: "Stück" },
  { muster: /mozzarella$/, groesse: 125, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /(feta|hirtenkase|schafskase)$/, groesse: 200, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /(kase|gouda|emmentaler|cheddar)$/, groesse: 200, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /quark$/, groesse: 250, familie: "g", eins: "Packung", viele: "Packungen" },
  { muster: /joghurt$/, groesse: 500, familie: "g", eins: "Becher", viele: "Becher" },
  { muster: /lasagneplatten?$/, groesse: 500, familie: "g", eins: "Packung", viele: "Packungen", immer: true, stueck: 20 },
  { muster: /(nudeln?|spaghetti|penne|fusilli|farfalle|tagliatelle|makkaroni|rigatoni|spatzle)$/, groesse: 500, familie: "g", eins: "Packung", viele: "Packungen", immer: true },
  { muster: /reis$/, groesse: 1000, familie: "g", eins: "Packung", viele: "Packungen", immer: true },
  { muster: /(^|oliven|raps|sonnenblumen|speise) ?ol$/, groesse: 750, familie: "ml", eins: "Flasche", viele: "Flaschen" },
];

/** Klein, ohne Umlaute und Zeichen („Crème fraîche“ → „creme fraiche“) */
const einfach = (name: string) =>
  name
    .toLocaleLowerCase("de-DE")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const zahl = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

/** Löffel, Prisen, Messerspitzen: nie eine Einkaufsmenge */
const KRUEMEL = /^(el|tl|prise|prisen|msp|messerspitze|spritzer|schuss|zehe|zehen)$/i;

const istStueck = (familie: string) => familie === "" || /^st(ü|u)ck$/i.test(familie);

/**
 * Einkaufsmenge aus einer Rezeptmenge (`total` in g/ml bzw. Einheit `familie`,
 * `null` = ohne Menge). Liefert die Menge für die Liste („“ = nur der Name).
 */
export function einkaufsMenge(name: string, total: number | null, familie: string): string {
  const roh = total === null ? "" : `${zahl(total)} ${familie}`.trim();
  if (total === null || total <= 0) return istStueck(familie) || KRUEMEL.test(familie) ? "" : familie;
  if (KRUEMEL.test(familie)) return "";
  const n = einfach(name);
  // Eier: 6er oder 10er
  if (/(^| )eier?$/.test(n) && istStueck(familie)) return total <= 6 ? "6 Stück" : total <= 10 ? "10 Stück" : `${Math.ceil(total / 10) * 10} Stück`;
  const p = PACKUNGEN.find((x) => x.muster.test(n));
  if (p) {
    const anzahl = familie === p.familie ? Math.max(1, Math.ceil(total / p.groesse - 1e-9)) : istStueck(familie) && p.stueck ? Math.max(1, Math.ceil(total / p.stueck - 1e-9)) : null;
    if (anzahl !== null) {
      if (p.eins === "l") return anzahl === 1 ? "" : `${anzahl} l`;
      if (anzahl === 1) return p.immer ? `1 ${p.eins}` : "";
      return `${anzahl} ${p.viele}`;
    }
    // Andere Einheit (z. B. „1 Packung“ Nudeln): so lassen, eine Packung ohne Zahl
    return istStueck(familie) ? (p.immer ? `1 ${p.eins}` : "") : roh;
  }
  // Ohne Tabelle: Krümel unter 50 g/ml weg, „1 Bund“ = nur der Name, sonst wie im Rezept
  if ((familie === "g" || familie === "ml") && total < 50) return "";
  if (/^bund$/i.test(familie) && total <= 1) return "";
  return familie === "g" && total >= 1000 ? `${zahl(total / 1000)} kg` : familie === "ml" && total >= 1000 ? `${zahl(total / 1000)} l` : roh;
}

/** Hinweis unter dem Namen: „250 ml für Lasagne“ (Gerichte ohne Tag, ohne „×2“) */
export function rezeptHinweis(rezeptMenge: string, gerichte: string[]): string {
  const namen = [...new Set(gerichte.map((g) => g.replace(/\s*×2$/, "").replace(/\s*\([^)]*\)$/, "").trim()).filter(Boolean))];
  const fuer = namen.length ? `für ${namen.join(", ")}` : "";
  const menge = /^\d+(,\d+)?$/.test(rezeptMenge.trim()) ? `${rezeptMenge.trim()} Stück` : rezeptMenge.trim();
  return [menge, fuer].filter(Boolean).join(" ");
}

/**
 * Rezept-Zutat als eigener Artikel (Rezept-Link, Kochidee): Menge auf die
 * Packung gerundet, die Rezeptmenge nur als Hinweis (`rezeptMenge`).
 */
export function alsEinkauf(name: string, amount: number | null, unit: string): { amount: string; rezeptMenge?: string } {
  const u = unit.trim().toLowerCase();
  const faktor = u === "kg" || u === "l" ? 1000 : 1;
  const familie = u === "kg" ? "g" : u === "l" ? "ml" : unit.trim();
  const roh = amount === null ? "" : `${zahl(amount)} ${unit.trim()}`.trim();
  const menge = einkaufsMenge(name, amount === null ? null : amount * faktor, familie);
  return menge === roh || !roh ? { amount: menge } : { amount: menge, rezeptMenge: roh };
}
