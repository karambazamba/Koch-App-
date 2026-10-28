// „Im Haus“ reinsprechen (Tafel 102): ein Satz, mehrere Sachen – „ist da“,
// „haben wir noch“, „gekauft“ = rein; „ist alle“, „haben wir nicht mehr“,
// „gar nicht im Haus“, „kein … mehr“ = raus. Satzteile werden nie zu Sachen
// („gar nicht im Haus“ ist kein Artikel). Rein: Satz rein, zwei Listen raus.
// Die KI bekommt den Satz zuerst (`[Im Haus] …`); das hier ist der Testmodus
// und die Notlösung ohne KI. Mia zeigt beides als „Hab ich so verstanden:“.

import { sectionFor } from "@/lib/einkauf/sections";
import { isFood, isGrundsache, placeFor, withoutAmount, type PantryPlace } from "@/lib/vorrat/haltbar";
import { sameIngredient } from "@/lib/vorrat/pantry";
import type { ChangeOp } from "@/lib/begleitung/ops";

export type ImHausVerstanden = { rein: string[]; raus: string[] };

/** Kennzeichen einer Nachricht aus „Was ist da?“ an die KI */
export const IM_HAUS_PREFIX = "[Im Haus]";
export const isImHausFrage = (text: string) => text.trim().startsWith(IM_HAUS_PREFIX);

const W = "(?<![a-zäöüß])";
const E = "(?![a-zäöüß])";

/** Nachgestellt: was davor steht, ist weg */
const RAUS = [
  "(?:ist|sind)\\s+(?:jetzt\\s+|leider\\s+|schon\\s+|auch\\s+)*(?:alle|aufgebraucht|verbraucht|leer|weg|aus)",
  "(?:haben|hab|habe)\\s+(?:wir|ich)\\s+(?:auch\\s+|leider\\s+)*(?:gar\\s+)?(?:nicht|nix|nichts)\\s+mehr",
  "(?:ist|sind)?\\s*(?:gar|überhaupt)\\s+nicht\\s+(?:mehr\\s+)?(?:im\\s+haus|da|zu\\s*hause)",
  "(?:ist|sind)?\\s*nicht\\s+mehr\\s+(?:im\\s+haus|da|zu\\s*hause)",
  "(?:ist|sind)\\s+nicht\\s+(?:im\\s+haus|da)",
];
/** Nachgestellt: was davor steht, ist da */
const REIN = [
  "(?:ist|sind)\\s+(?:noch\\s+|auch\\s+|wieder\\s+)*(?:da|im\\s+haus|im\\s+kühlschrank|im\\s+schrank|im\\s+tiefkühler|im\\s+gefrierfach|zu\\s*hause)",
  "(?:haben|hab|habe)\\s+(?:wir|ich)(?:\\s+(?:noch|auch|wieder))*",
  "(?:gekauft|mitgebracht|geholt|eingefroren|eingekauft)",
];
const PRAEDIKAT = new RegExp(`${W}(?:(?<raus>${RAUS.join("|")})|(?<rein>${REIN.join("|")}))${E}`, "gi");
/** „kein Brot mehr“, „keine Milch“ (bis Satzzeichen oder „und“) */
const KEIN = new RegExp(`${W}kein(?:e|en|er|s)?\\s+(.+?)(?:\\s+mehr${E}|(?=\\s*(?:[,.;!?:]|$)|\\s+(?:und|aber|sondern)${E}))`, "gi");
/** Vorne „wir haben …“: nur das Letzte vor einem „ist alle“ ist weg */
const REIN_VORNE = new RegExp(`^\\s*(?:(?:wir|ich)\\s+(?:haben|hab|habe)|(?:haben|hab|habe)\\s+(?:wir|ich)|es\\s+gibt|da\\s+(?:ist|sind))${E}`, "i");

/** Füllwörter, die nie zu einer Sache gehören */
const FUELL = new Set(
  "wir ich du hab habe haben hat noch auch da dann ist sind es gibt also außerdem ähm äh ach ja jo nee nein so jetzt grad gerade leider schon wieder mal bitte mia der die das den dem des ein eine einen einer eines etwas bisschen paar ne n im in am auf zu hause zuhause haus kühlschrank schrank vorrat tiefkühler gefrierfach mehr nicht gar alle keine kein keinen nichts nix und oder aber sondern okay ok gut doch eben grad halt zwei drei vier fünf sechs sieben acht neun zehn zwölf".split(" "),
);
/** Wörter, die in keinem Namen vorkommen dürfen (dann war es ein Satzteil) */
const NIE_IM_NAMEN = /(?<![a-zäöüß])(nicht|mehr|alle|haus|aufgebraucht|kein\w*)(?![a-zäöüß])/i;
const MENGE = /^\d+([.,]\d+)?\s*(g|kg|l|ml|stück|stk|packung(en)?|pck|dose(n)?|flasche(n)?|becher|gläser|glas|tüte(n)?|bund|beutel)?\s+/i;

function sauber(raw: string): string | null {
  let words = raw.replace(/[„“"'():]/g, " ").replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  while (words.length && FUELL.has(words[0].toLowerCase())) words.shift();
  while (words.length && FUELL.has(words[words.length - 1].toLowerCase())) words.pop();
  // „Joghurt im Kühlschrank“ → „Joghurt“
  const im = words.findIndex((w, i) => /^(im|in|auf)$/i.test(w) && i > 0);
  if (im > 0) words = words.slice(0, im);
  let name = words.join(" ").replace(MENGE, "");
  name = withoutAmount(name).trim();
  if (!name || name.length > 30 || name.split(" ").length > 3 || NIE_IM_NAMEN.test(name) || !/[a-zäöüß]/i.test(name)) return null;
  return name.charAt(0).toUpperCase() + name.slice(1);
}

const teile = (segment: string) => segment.split(/\s*(?:,|&|\+|(?<![a-zäöüß])(?:und|sowie|oder)(?![a-zäöüß]))\s*/i);

/** Einen gesprochenen Satz in „rein“ und „raus“ aufteilen (das Letztgesagte gilt) */
export function imHausVerstehen(text: string): ImHausVerstanden {
  const said: { name: string; rein: boolean }[] = [];
  const add = (segment: string, rein: boolean) => {
    for (const t of teile(segment)) {
      const name = sauber(t);
      if (name) said.push({ name, rein });
    }
  };
  // „kein Brot mehr“ zuerst herausnehmen (sonst landete „kein“ im Namen)
  const rest = text.replace(IM_HAUS_PREFIX, " ").replace(KEIN, (_, x: string) => {
    add(x, false);
    return " ; ";
  });
  for (const satz of rest.split(/[.;!?\n]+|(?<![a-zäöüß])(?:aber|sondern|dafür)(?![a-zäöüß])/i)) {
    let last = 0;
    let vorher: boolean | null = null;
    for (const m of satz.matchAll(PRAEDIKAT)) {
      const rein = Boolean(m.groups?.rein);
      const segment = satz.slice(last, m.index);
      last = (m.index ?? 0) + m[0].length;
      if (!segment.replace(/[\s,:]/g, "")) {
        // „Gar nicht im Haus: Zucchini“ – gilt für das, was danach kommt
        vorher = rein;
        continue;
      }
      // „Wir haben Milch, Eier und Thunfisch ist alle“: nur das Letzte ist weg
      if (!rein && REIN_VORNE.test(segment)) {
        const parts = teile(segment);
        add(parts.slice(0, -1).join(", "), true);
        add(parts[parts.length - 1], false);
      } else if (!rein && !/^\s*(?:sind|haben|hab|habe)(?![a-zäöüß])/i.test(m[0]) && segment.includes(",")) {
        // „Milch, Eier, Zucchini gar nicht im Haus“: ohne „sind“ gilt es nur fürs Letzte nach dem Komma
        const cut = segment.lastIndexOf(",");
        add(segment.slice(0, cut), vorher ?? true);
        add(segment.slice(cut + 1), false);
      } else add(segment, vorher ?? rein);
      vorher = null;
    }
    const tail = satz.slice(last);
    if (tail.trim()) add(tail, vorher ?? true);
  }
  // Doppelt Genanntes: das zuletzt Gesagte gilt; Grundsachen und Nicht-Essen bleiben draußen
  const out: ImHausVerstanden = { rein: [], raus: [] };
  said.forEach((s, i) => {
    if (said.slice(i + 1).some((x) => sameIngredient(x.name, s.name))) return;
    if (!isFood(s.name) || isGrundsache(s.name)) return;
    (s.rein ? out.rein : out.raus).push(s.name);
  });
  return out;
}

/**
 * Vorschlag für „Hab ich so verstanden:“: rein = `add_pantry`, raus =
 * `use_pantry` und – wenn es nicht schon auf der Liste steht – `add_shopping`
 * („auf die Liste“, abwählbar). @public (Tests)
 */
let lastId = 0;

export function imHausOps(v: ImHausVerstanden, weekStart: string, onList: (name: string) => boolean, place: (name: string) => PantryPlace = placeFor): ChangeOp[] {
  const ops: ChangeOp[] = [];
  const id = () => `ih${++lastId}`;
  for (const name of v.rein) ops.push({ id: id(), type: "add_pantry", name, place: place(name) });
  for (const name of v.raus) {
    ops.push({ id: id(), type: "use_pantry", name });
    if (!onList(name)) ops.push({ id: id(), type: "add_shopping", weekStart, name, amount: "", section: sectionFor(name) });
  }
  return ops;
}

/** Besteht ein Vorschlag nur aus „Im Haus“ (rein/raus, dazu „auf die Liste“)? */
export const isImHausVorschlag = (ops: ChangeOp[]) =>
  ops.length > 0 && ops.some((op) => op.type === "add_pantry" || op.type === "use_pantry") && ops.every((op) => op.type === "add_pantry" || op.type === "use_pantry" || op.type === "add_shopping");

/** Name einer „Im Haus“-Zeile (für das Zusammenführen beim „Ändern“) */
const opName = (op: ChangeOp) => (op.type === "add_pantry" || op.type === "use_pantry" || op.type === "add_shopping" ? op.name : null);

/**
 * Ohne KI (Notlösung): Satz verstehen und als Vorschlag zurückgeben. Beim
 * „Ändern“ (`prev` = offener Vorschlag) bleibt Früheres, neu Gesagtes ersetzt
 * dieselbe Sache.
 */
export function imHausVorschlag(text: string, prev: ChangeOp[], weekStart: string, onList: (name: string) => boolean): { ops: ChangeOp[]; reply: string } {
  const v = imHausVerstehen(text);
  const fresh = imHausOps(v, weekStart, onList);
  const names = [...v.rein, ...v.raus];
  const kept = isImHausVorschlag(prev) ? prev.filter((op) => !names.some((n) => sameIngredient(n, opName(op) ?? ""))) : [];
  const ops = [...kept, ...fresh];
  return { ops, reply: fresh.length ? "Passt so?" : "Hab nichts zum Einräumen gehört. Sag einfach: Milch ist da, Thunfisch ist alle." };
}
