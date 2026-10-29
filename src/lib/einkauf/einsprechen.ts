// Einkauf einsprechen (Tafel 110, Bild 2): einfach aufzählen, Mia macht die
// Liste daraus. Nur Lebensmittel und Verbrauchsartikel; Füllwörter,
// Abbrüche („M…“, „äh“), „weiß ich nicht mehr“, Smalltalk und Namen bleiben
// draußen. Korrekturen gelten („nee, keine Sahne“, „Milch, nee Hafermilch“),
// Mengen werden übernommen („zwei Milch“), Doppeltes zusammengefasst, „bei
// Rewe“ gilt für das, was mit „und“ davor steht.
// Die KI bekommt den Satz zuerst (`[Einkauf] …`); das hier ist der Testmodus
// und die Notlösung ohne KI. Rein: Satz rein, Sachen + Anzeige-Teile raus
// (Ignoriertes durchgestrichen in der Live-Blase).

import { ingredientStem } from "@/lib/vorrat/pantry";
import { istEinkaufSache } from "@/lib/einkauf/quickAdd";
import { sectionFor } from "@/lib/einkauf/sections";
import { SHOP_SUGGESTIONS } from "@/lib/einkauf/shops";
import { FRAGE_LAEDEN } from "@/lib/einkauf/meineLaeden";
import { shopChoice } from "@/lib/einkauf/shopRules";
import type { ShoppingSettings } from "@/lib/einkauf/listModel";
import type { ChangeOp } from "@/lib/begleitung/ops";

/** Kennzeichen einer Nachricht aus „Einsprechen“ an die KI */
export const EINKAUF_PREFIX = "[Einkauf]";
export const isEinkaufFrage = (text: string) => text.trim().startsWith(EINKAUF_PREFIX);

export type Sache = { name: string; amount: string; shop: string };
/** Ein Stück des gesagten Textes; `weg` = ignoriert (durchgestrichen) */
type Teil = { text: string; weg: boolean };
export type Verstanden = { sachen: Sache[]; teile: Teil[]; /** später zurückgenommen („nee, keine Sahne“) */ weg: string[]; wegLetztes: boolean };

type Kenner = Pick<ShoppingSettings, "products" | "itemShops" | "staples"> & { shops?: string[]; namen?: string[] };

const FUELL = new Set(
  "äh ähm öhm hm hmm also dann noch bitte mal so halt ja jo okay ok und auch wir ich uns brauchen brauch brauche haben hab habe eben genau gut außerdem ach achso na nochmal wieder vielleicht glaub glaube irgendwie sowas die der das den dem kaufen holen besorgen mitbringen drauf dazu liste zettel einkaufszettel einkaufsliste auf setz setze schreib pack mia lotte gern gerne danke erstmal zuerst mehr bisschen etwas was aber übrigens eigentlich".split(" "),
);
const KORREKTUR = new Set(["nee", "nein", "ne", "nö", "quatsch", "sorry", "lieber", "sondern"]);
const SMALLTALK = /(weiß ich nicht|weiss ich nicht|keine ahnung|was noch|warte mal|mal überlegen|lass mich überlegen|wie heißt das|ach so|das war['’]?s|das wär['’]?s|fällt mir nicht ein|wie war das|ist egal|schönes wetter|wie geht'?s)/i;
const ABBRUCH = /^\S*(…|\.\.\.|-)$|^[a-zäöüß]$/i;
const ZAHL: Record<string, number> = { ein: 1, eine: 1, einen: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12 };
const MENGE = new RegExp(
  `^(\\d+(?:[.,]\\d+)?|${Object.keys(ZAHL).join("|")}|ein paar|paar)\\s+(?:(packung(?:en)?|pck|liter|l|kilo|kg|gramm|g|flaschen?|dosen?|becher|stück|bund|tüten?|gläser|glas|rollen?|beutel|tafeln?|netz|kisten?|sack|schalen?)\\s+)?(.+)$`,
  "i",
);
const HABEN = /(?<![a-zäöüß])(haben|hab|habe|ist|sind|gibt'?s)(?![a-zäöüß])/i;
const ALLE = /\s+(?:ist|sind)\s+(?:jetzt\s+|leider\s+|schon\s+|fast\s+)*(?:alle|leer|aus|aufgebraucht|weg)$/i;
const NIE_IM_NAMEN = /(?<![a-zäöüß])(nicht|mehr|alle|kein\w*|doch)(?![a-zäöüß])/i;

const cap = (s: string) => (s ? s.charAt(0).toLocaleUpperCase("de-DE") + s.slice(1) : s);
const lower = (s: string) => s.trim().toLowerCase();
/** Gleiche Sache („Tomate“/„Tomaten“), aber nie „Milch“ = „Hafermilch“ */
const gleich = (a: string, b: string) => lower(a) === lower(b) || (ingredientStem(a) !== "" && ingredientStem(a) === ingredientStem(b));

const ladenName = (word: string, k: Kenner): string | null => {
  const all = [...SHOP_SUGGESTIONS, ...FRAGE_LAEDEN, ...(k.shops ?? [])];
  return all.find((s) => lower(s) === lower(word)) ?? null;
};

type Klausel = { kind: "sache"; sache: Sache; vorne: number; hinten: number; korrektur: boolean } | { kind: "nein"; name: string | null } | { kind: "nee" } | { kind: "laden"; shop: string } | { kind: "weg" };

/** Eine Klausel (zwischen Komma, „und“, Punkt) verstehen */
function klausel(raw: string, k: Kenner): Klausel {
  const toks = raw.split(/(\s+)/);
  // Füllwörter, Abbrüche und „nee“ vorne/hinten abschneiden (Länge merken fürs Durchstreichen)
  let a = 0;
  let b = toks.length;
  let korrektur = false;
  const fill = (t: string) => !t.trim() || FUELL.has(lower(t).replace(/[„“"]/g, "")) || ABBRUCH.test(t.trim());
  while (a < b) {
    const t = lower(toks[a]);
    if (KORREKTUR.has(t)) korrektur = true;
    else if (!fill(toks[a])) break;
    a++;
  }
  while (b > a && fill(toks[b - 1])) b--;
  const vorne = toks.slice(0, a).join("").length;
  const hinten = toks.slice(b).join("").length;
  let r = toks
    .slice(a, b)
    .filter((t) => !ABBRUCH.test(t.trim()))
    .join("")
    .trim();
  if (!r) return korrektur ? { kind: "nee" } : { kind: "weg" };
  if (SMALLTALK.test(r) || SMALLTALK.test(raw)) return { kind: "weg" };
  // „Mathis wollte noch Joghurt“ → Joghurt (wer es will, kommt nicht auf die Liste)
  r = r.replace(/^\S+\s+(?:wollte|will|möchte|mag|braucht|hätte gern|wünscht sich)\s+(?:noch\s+|gern\s+|gerne\s+)?/i, "");
  const haben = HABEN.test(raw);
  // „doch nicht“, „lieber nicht“ allein: das Letzte war falsch
  if (/^(?:doch\s+|lieber\s+)?nicht$/i.test(r)) return { kind: "nein", name: null };
  // „keine Sahne“ = Korrektur; „wir haben keine Windeln mehr“ = auf die Liste
  const kein = r.match(/^(?:doch\s+)?kein(?:e|en|er|s)?\s+(.+?)(?:\s+mehr)?$/i);
  if (kein && !(haben && /mehr|da|im haus/i.test(raw))) return { kind: "nein", name: kein[1] };
  if (kein) r = kein[1];
  const nicht = r.match(/^(.+?)\s+(?:doch\s+|lieber\s+|auch\s+)?nicht(?:\s+mehr)?$/i);
  if (nicht && !(haben && /mehr/i.test(raw))) return { kind: "nein", name: nicht[1] };
  if (nicht) r = nicht[1];
  r = r.replace(ALLE, "").replace(/\s+fürs?\s+.+$/i, "").trim();
  // „bei Rewe“ allein oder am Ende
  const nurLaden = r.match(/^(?:bei|beim|von|vom|im|aus dem|für)\s+(?:dem\s+|der\s+)?(\S+)$/i);
  if (nurLaden && ladenName(nurLaden[1], k)) return { kind: "laden", shop: ladenName(nurLaden[1], k)! };
  let shop = "";
  const amEnde = r.match(/^(.+?)\s+(?:bei|beim|von|vom|im|aus dem|aus der|in der)\s+(?:dem\s+|der\s+)?([A-Za-zÄÖÜäöüß][\wÄÖÜäöüß-]*)$/i);
  if (amEnde && (ladenName(amEnde[2], k) || /^[A-ZÄÖÜ]/.test(amEnde[2]))) {
    shop = ladenName(amEnde[2], k) ?? cap(amEnde[2]);
    r = amEnde[1];
  }
  const vorn = r.match(/^(?:bei|beim)\s+(\S+)\s+(.+)$/i);
  if (vorn && ladenName(vorn[1], k)) {
    shop = ladenName(vorn[1], k)!;
    r = vorn[2];
  }
  let amount = "";
  const m = r.match(MENGE);
  if (m) {
    const n = /^\d/.test(m[1]) ? m[1].replace(".", ",") : String(ZAHL[lower(m[1])] ?? "");
    amount = m[2] ? `${n || "1"} ${m[2]}` : n === "1" ? "" : n;
    r = m[3];
  }
  // Füllwörter, die nach Laden/Menge vorne stehen blieben („noch zwei so Milch“)
  r = r.split(/\s+/).filter((w, i, all) => !(FUELL.has(lower(w)) && (i === 0 || i === all.length - 1))).join(" ");
  const name = cap(r.replace(/[„“"]/g, "").trim());
  const words = name.split(/\s+/);
  const person = (k.namen ?? []).some((n) => lower(n) === lower(name) || words.some((w) => lower(w) === lower(n)));
  if (!name || name.length > 30 || words.length > 3 || person || NIE_IM_NAMEN.test(name) || !istEinkaufSache(name, k)) return { kind: "weg" };
  return { kind: "sache", sache: { name, amount, shop }, vorne, hinten, korrektur };
}

/** Zwei Mengen zusammenfassen: Zahlen addieren, sonst gilt die spätere */
function plus(a: string, b: string): string {
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) return String(Number(a) + Number(b));
  return b || a;
}

/** Trenner: Satzende, Komma, „und“, gesprochenes „äh“ zwischen zwei Sachen */
const TRENNER = /([.;!?\n]+\s*|,\s*|\s+(?:und|sowie|plus|oder)\s+|\s+(?:äh+m?|öhm|hm+)\s+)/i;

/** Gesagtes verstehen: Sachen (in Reihenfolge, ohne Doppelte) und die Teile für die Live-Blase */
export function einkaufVerstehen(text: string, k: Kenner): Verstanden {
  const ohne = text.startsWith(EINKAUF_PREFIX) ? text.slice(EINKAUF_PREFIX.length) : text;
  const stuecke = ohne.split(TRENNER);
  const teile: Teil[] = [];
  const liste: { sache: Sache; teil: number[] }[] = [];
  const weg: string[] = [];
  let wegLetztes = false;
  let kette: number[] = [];
  let nee = false;
  const raus = (i: number) => {
    for (const t of liste[i].teil) teile[t].weg = true;
    liste.splice(i, 1);
    kette = kette.filter((x) => x !== i).map((x) => (x > i ? x - 1 : x));
  };
  stuecke.forEach((st, idx) => {
    if (idx % 2 === 1) {
      teile.push({ text: st, weg: false });
      // Komma und Satzende beenden die „und“-Kette („Milch, Brot und Käse bei Rewe“: nur Brot und Käse)
      if (!/^\s+(?:und|sowie|plus|äh|öhm|hm)/i.test(st)) kette = [];
      return;
    }
    if (!st) return;
    const kl = klausel(st, k);
    if (kl.kind === "weg") {
      teile.push({ text: st, weg: true });
      return;
    }
    if (kl.kind === "nee") {
      // „nee“ allein: was danach kommt, entscheidet (eine Sache ersetzt, „keine Sahne“ nimmt genau die)
      teile.push({ text: st, weg: true });
      nee = true;
      return;
    }
    if (kl.kind === "nein") {
      nee = false;
      teile.push({ text: st, weg: true });
      const i = kl.name ? liste.findIndex((x) => gleich(x.sache.name, kl.name!) || lower(x.sache.name).endsWith(lower(kl.name!))) : liste.length - 1;
      if (i >= 0) raus(i);
      else if (kl.name) weg.push(cap(kl.name.trim()));
      else wegLetztes = true;
      return;
    }
    if (kl.kind === "laden") {
      teile.push({ text: st, weg: false });
      for (const i of kette) if (!liste[i].sache.shop) liste[i].sache.shop = kl.shop;
      return;
    }
    const { sache, vorne, hinten, korrektur } = kl;
    const at = teile.length;
    if (vorne) teile.push({ text: st.slice(0, vorne), weg: true });
    teile.push({ text: st.slice(vorne, st.length - hinten), weg: false });
    if (hinten) teile.push({ text: st.slice(st.length - hinten), weg: true });
    const ids = Array.from({ length: teile.length - at }, (_, j) => at + j);
    // „Milch, nee Hafermilch“ / „Sahne, nee, Schmand“: die neue ersetzt die letzte
    if ((korrektur || nee) && liste.length) raus(liste.length - 1);
    nee = false;
    const da = liste.findIndex((x) => gleich(x.sache.name, sache.name));
    if (da >= 0) {
      liste[da].sache.amount = plus(liste[da].sache.amount, sache.amount);
      liste[da].sache.shop = sache.shop || liste[da].sache.shop;
      liste[da].teil.push(...ids);
      kette.push(da);
    } else {
      liste.push({ sache: { ...sache }, teil: ids });
      kette.push(liste.length - 1);
    }
    if (sache.shop) for (const i of kette) if (!liste[i].sache.shop) liste[i].sache.shop = sache.shop;
  });
  // „…, Eier, nee.“ am Ende: das Letzte war falsch
  if (nee) {
    if (liste.length) raus(liste.length - 1);
    else wegLetztes = true;
  }
  return { sachen: liste.map((x) => x.sache), teile: zusammen(teile), weg, wegLetztes };
}

/** Benachbarte Teile gleicher Art zusammenlegen */
function zusammen(teile: Teil[]): Teil[] {
  const out: Teil[] = [];
  for (const t of teile) {
    if (!t.text) continue;
    const last = out[out.length - 1];
    if (last && last.weg === t.weg) last.text += t.text;
    else out.push({ ...t });
  }
  return out;
}

let lastId = 0;

/** Vorschlag für „Hab ich:“ – je Sache ein `add_shopping`, gemerkter Laden schon dran @public (Tests) */
export function einkaufOps(sachen: Sache[], weekStart: string): ChangeOp[] {
  return sachen.map((s) => ({ id: `ek${++lastId}`, type: "add_shopping" as const, weekStart, name: s.name, amount: s.amount, section: sectionFor(s.name), ...(s.shop ? { shop: s.shop } : {}) }));
}

/** Besteht ein Vorschlag nur aus Einkaufs-Sachen? */
export const isEinkaufVorschlag = (ops: ChangeOp[]) => ops.length > 0 && ops.every((op) => op.type === "add_shopping");

/**
 * Ohne KI (Notlösung): Gesagtes verstehen und mit dem offenen Vorschlag
 * zusammenführen („Weiter erzählen“): Früheres bleibt, dieselbe Sache wird
 * ersetzt, „nee, keine Sahne“ nimmt sie auch aus dem Früheren.
 */
export function einkaufVorschlag(text: string, prev: ChangeOp[], weekStart: string, k: Kenner): { ops: ChangeOp[]; reply: string } {
  const v = einkaufVerstehen(text, k);
  let kept = isEinkaufVorschlag(prev) ? prev.filter((op) => op.type === "add_shopping" && !v.sachen.some((s) => gleich(s.name, op.name)) && !v.weg.some((w) => gleich(w, op.name))) : [];
  if (v.wegLetztes && !v.sachen.length) kept = kept.slice(0, -1);
  const ops = [...kept, ...einkaufOps(v.sachen, weekStart)];
  return { ops, reply: ops.length ? "Passt so?" : "Hab nichts für die Liste gehört. Zähl einfach auf: Milch, Brot, Klopapier." };
}

/** Kommt das gleich in einen Laden (genannt oder gemerkt)? Sonst „Noch ohne Laden“ */
export function ladenFuer(op: ChangeOp, s: Pick<ShoppingSettings, "itemShops" | "shopRules" | "products" | "ladenPlan" | "sortenKi">): string {
  if (op.type !== "add_shopping") return "";
  return op.shop?.trim() || shopChoice(op.name, s) || "";
}

const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;

/** Kopf der Bestätigung: „Hab ich: 9 Sachen“ */
export const habIchText = (n: number) => `Hab ich: ${sachen(n)}`;

/** Meldung nach „Passt“: „9 drauf · 3 ohne Laden“ */
export const passtText = (n: number, ohne: number) => `${n} drauf${ohne ? ` · ${ohne} ohne Laden` : ""}`;
