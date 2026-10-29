// Mehrere Sachen in einem Satz (A-056, rein – getestet in
// tests/begleitung/mehrereSachen.test.ts und mit den Prüfstand-Sätzen
// `pruefstand/aufzaehlung.ts`).
// - `mehrteilig`: Steht mehr als EINE Sache drin („und“, Komma, „außerdem“,
//   „dann“, mehrere Doppelpunkte, Frage)? Dann nie der Sofort-Weg, sondern die KI.
// - `mehrereOhneKi`: die Regel-Notlösung ohne KI. Teilt nur auf, wenn es
//   eindeutig geht: Einkauf (Katalog-Artikel, „auf die Liste“), Termin (mit
//   Uhrzeit) und Aufgabe. „Aufgabe heute dazu: Maler kommt und Bank anrufen“ →
//   zwei Aufgaben für heute; „Termin morgen 10 Uhr Zahnarzt und danach Bank“ →
//   Termin + Aufgabe (morgen, „danach“ erbt den Tag). Steuerwörter kommen nie
//   in den Titel. Ist ein Teil unklar, gibt es `null` – dann merkt Mia es sich
//   lieber und holt es mit KI nach (CLAUDE.md: nie halbgar).

import { createEntry } from "@/lib/core/entries";
import type { ChangeOp } from "@/lib/begleitung/ops";
import type { CalendarEntry } from "@/lib/kalender/model";
import { parseCalendar } from "@/lib/kalender/parse";
import { readSentence } from "@/lib/kalender/sentence";
import { quickTaskData, readQuickText } from "@/lib/kalender/quick";
import { arbeitsWorte, guessRoom, type RaumHilfen } from "@/lib/kalender/raum/raten";
import { isShoppingRequest, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { sectionFor } from "@/lib/einkauf/shoppingList";
import { imKatalog } from "@/lib/begleitung/sofort/einkauf";
import type { SofortKontext } from "@/lib/begleitung/sofort/erkennen";
import { ohneFuellwoerter, titelSauber } from "@/lib/begleitung/fuellwoerter";

const V = "(?<![a-zäöüß])";
const W = "(?![a-zäöüß])";
const re = (body: string, flags = "i") => new RegExp(`${V}(?:${body})${W}`, flags);

/** Verbinder zwischen zwei Sachen */
const VERBINDER = "und|außerdem|dann|danach|sowie|plus|zusätzlich";

/** Mehr als EINE Sache? (Uhrzeiten und Zahlen wie „8:15“, „1,5“ zählen nicht als Trenner) */
export function mehrteilig(text: string): boolean {
  const t = text.replace(/\d+[:.,]\d+/g, "0");
  if (/[?,;]/.test(t)) return true;
  if (re(VERBINDER).test(t)) return true;
  return (t.match(/:/g) ?? []).length >= 2;
}

/** Ausdrückliche Uhrzeit (wie im Sofort-Weg) */
const UHRZEIT = re("\\d{1,2}\\s*uhr|\\d{1,2}[:.]\\d{2}|halb\\s+\\w+|viertel\\s+(?:nach|vor)\\s+\\w+|um\\s+\\d{1,2}");
/** Fragen, Ändern, Verneinen, Notiz/Pinnwand/Timer: nicht ohne KI */
const NIE = re(
  "wie|was|warum|wieso|wann|wo|wer|welche\\w*|soll\\w*|verschieb\\w*|verleg\\w*|lösch\\w*|streich\\w*|entfern\\w*|absag\\w*|statt|lieber|nicht|kein\\w*|rückgängig|jeden|jede|täglich|wöchentlich|immer|merk\\s+dir|notier\\w*|pinnwand|timer|wecker|plan\\w*|koch\\w*",
);
const TAGE = "heute|morgen|übermorgen|montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag";
/** „Aufgabe heute:“, „Aufgaben morgen“, „Termin morgen …“, „Einkauf:“ – nur Steuerwörter, nie Titel */
const LEAD = new RegExp(`^(aufgaben?|to-?dos?|termine?|einkauf(?:sliste)?|einkaufen)(?:\\s+(${TAGE}))?\\s*(:)?\\s*(.+)$`, "i");
/** Einkaufs-Zeichen in einem Teil */
const EINKAUF = /(?:auf (?:die|unsere|meine) (?:einkaufs)?liste|auf den einkaufszettel|zur (?:einkaufs)?liste)\s*$|(?<![a-zäöüß])drauf[.!]*$|^(?:wir|ich)\s+brauch(?:en|e)\s+/i;
const TRENNER = new RegExp(`\\s*(?:[,;]\\s*(?:(?:und\\s+)?(${VERBINDER})${W})?|${V}(?:und\\s+)?(${VERBINDER})${W})\\s*`, "gi");

/** Endet mit einer Tätigkeit (klein geschriebene Grundform: „anrufen“, „backen“, „wechseln“, „kommt“) */
const TAETIGKEIT_ENDE = /(?<![\p{L}])\p{Ll}[\p{Ll}-]*(?:en|ern|eln|kommt|geht)[.!]?$/u;

type Art = "aufgabe" | "termin" | "einkauf";
type Teil = { text: string; erbt: boolean };

/** In Teile schneiden; `erbt` = mit „dann/danach“ angehängt (übernimmt den Tag davor) */
function schneiden(t: string): Teil[] {
  const teile: Teil[] = [];
  let erbt = false;
  let start = 0;
  const sicher = t.replace(/(\d)[,.:](\d)/g, "$1\u0000$2");
  for (const m of sicher.matchAll(TRENNER)) {
    teile.push({ text: t.slice(start, m.index), erbt });
    const wort = (m[1] ?? m[2] ?? "").toLowerCase();
    erbt = wort === "dann" || wort === "danach";
    start = m.index! + m[0].length;
  }
  teile.push({ text: t.slice(start), erbt });
  return teile.map((x) => ({ ...x, text: x.text.trim() })).filter((x) => x.text);
}

/** Datum eines Tag-Worts („morgen“, „Freitag“) */
const tagDatum = (tag: string | undefined, today: string) => (tag ? readSentence(tag, today).date : undefined);

/** Einkaufs-Gruppe → Artikel (Laden-Namen kennt der Leser) */
function einkaufOps(text: string, ctx: SofortKontext, n: () => string): ChangeOp[] | null {
  const satz = text
    .replace(/^(?:pack|setz|schreib|tu)\w*\s+/i, "")
    .replace(/\s+(?:noch\s+)?(?:mit\s+)?drauf[.!]*$/i, "")
    .replace(/\s*(?:auf (?:die|unsere|meine) (?:einkaufs)?liste|auf den einkaufszettel|zur (?:einkaufs)?liste)\s*$/i, "")
    .replace(/^(?:wir|ich)\s+brauch(?:en|e)\s+/i, "");
  const items = parseShoppingText(`${satz} auf die Liste`, ctx.laeden);
  if (!items.length || items.length > 12 || !items.every((i) => imKatalog(i.name))) return null;
  return items.map((i) => ({ id: n(), type: "add_shopping" as const, weekStart: ctx.weekStart, name: i.name, amount: i.amount, section: sectionFor(i.name), ...(i.shop ? { shop: i.shop } : {}) }));
}

/**
 * Regel-Notlösung ohne KI für Aufzählungen. Liefert die Einträge (alle oder
 * keine) und eine kurze Antwort – oder null, wenn es nicht eindeutig geht bzw.
 * nur EINE Sache ohne Steuerwort drinsteht (das können die anderen Regeln).
 */
export function mehrereOhneKi(text: string, ctx: SofortKontext): { ops: ChangeOp[]; reply: string } | null {
  const t = ohneFuellwoerter(text);
  if (!t || t.length > 240 || /[?\n]/.test(t) || t.startsWith("[") || NIE.test(t)) return null;
  const hilfen: RaumHilfen = { gelernt: ctx.gelernt ?? [], arbeitWorte: arbeitsWorte(ctx.entries) };
  const lead = t.match(LEAD);
  // „Termin …“ ohne Doppelpunkt nur mit Tag („Termin morgen 10 Uhr …“), „Einkauf“ nur mit Doppelpunkt
  const leadOk = lead && (lead[3] || lead[2] || /^aufgabe/i.test(lead[1])) && !(/^einkauf/i.test(lead[1]) && !lead[3]);
  const leadArt: Art | null = !leadOk ? null : /^termin/i.test(lead![1]) ? "termin" : /^einkauf/i.test(lead![1]) ? "einkauf" : "aufgabe";
  const leadTag = leadOk ? tagDatum(lead![2], ctx.today) : undefined;
  // „Pack Äpfel und Gurken drauf“: der Befehl gehört zum ganzen Einkauf, nicht zum ersten Teil
  const rest = (leadOk ? lead![4] : t).replace(/^(?:pack|setz|schreib|tu)\w*\s+(?=.*(?:drauf|liste|einkaufszettel)[.!]*$)/i, "");
  // „Termin morgen 10 Uhr …“: der Tag gehört zum Termin selbst
  const roh = schneiden(leadArt === "termin" && lead![2] ? `${lead![2]} ${rest}` : rest);
  if (!roh.length || roh.length > 8) return null;

  // Jeder Teil: Einkauf-Zeichen, Termin (Uhrzeit), bloßer Artikel oder Aufgabe
  const arten = roh.map(({ text: x }): Art | "artikel" => {
    if (leadArt === "einkauf" || EINKAUF.test(x)) return "einkauf";
    if (UHRZEIT.test(x)) return "termin";
    const worte = titelSauber(x).split(" ");
    // Ein Wort („Butter“) oder zwei Hauptwörter („Griechischer Joghurt“) – „Kuchen backen“ ist eine Aufgabe
    const ding = worte.length === 1 || (worte.length === 2 && /^\p{Lu}/u.test(worte[1]));
    if (leadArt !== "aufgabe" && ding && imKatalog(worte.join(" ").toLowerCase())) return "artikel";
    return "aufgabe";
  });
  // Bloße Artikel gehören zur Einkaufs-Gruppe daneben („Milch, Eier und Butter auf die Liste“)
  const gruppe = arten.map((a) => a);
  for (let i = 0; i < arten.length; i++) {
    if (arten[i] !== "einkauf") continue;
    for (let j = i - 1; j >= 0 && arten[j] === "artikel"; j--) gruppe[j] = "einkauf";
    for (let j = i + 1; j < arten.length && arten[j] === "artikel"; j++) gruppe[j] = "einkauf";
  }
  if (gruppe.some((a) => a === "artikel")) return null;

  let nr = 0;
  const id = () => `ohneki-${++nr}`;
  const ops: ChangeOp[] = [];
  let teile = 0;
  let letzterTag: string | undefined = leadTag;
  for (let i = 0; i < roh.length; i++) {
    const art = gruppe[i];
    if (art === "einkauf") {
      // Die ganze Gruppe am Stück
      let j = i;
      while (j + 1 < roh.length && gruppe[j + 1] === "einkauf") j++;
      const satz = roh.slice(i, j + 1).map((x) => x.text).join(", ");
      const einkauf = einkaufOps(satz, ctx, id);
      if (!einkauf) return null;
      ops.push(...einkauf);
      teile++;
      i = j;
      continue;
    }
    const x = roh[i].text.replace(/\s+als\s+aufgabe$/i, "");
    if (x.split(/\s+/).length > 9) return null;
    const satz = readSentence(x, ctx.today);
    const geerbt = roh[i].erbt ? letzterTag : leadTag;
    // „Termine: Zahnarzt und Friseur“ ohne Uhrzeit: lieber die KI (nur „… und danach Bank“ wird eine Aufgabe)
    if (art === "aufgabe" && leadArt === "termin" && !roh[i].erbt) return null;
    // Ohne „Aufgabe:“ vorn nur, was nach Tätigkeit klingt („Bank anrufen“, „Kuchen backen“) oder mit „danach“ am Termin hängt
    if (art === "aufgabe" && leadArt !== "aufgabe" && !(roh[i].erbt && letzterTag) && !TAETIGKEIT_ENDE.test(x)) return null;
    if (art === "termin") {
      const cmd = parseCalendar(x, ctx.today, ctx.persons, hilfen);
      if (cmd?.kind !== "create" || cmd.draft.typ !== "termin") return null;
      const d = cmd.draft.data;
      const date = satz.date ?? geerbt ?? d.date;
      const title = titelSauber(d.title.replace(re("abends?|morgens|früh|vormittags?|nachmittags?|mittags?|termin", "gi"), " ").replace(/^(?:zum|zur|zu|beim|bei|den|die|das)\s+/i, "").replace(/\s+/g, " "));
      if (title.length < 2 || title.split(" ").length > 6) return null;
      ops.push({ id: id(), type: "upsert_entry", isNew: true, entry: createEntry("termin", { ...d, date, title }, { raum: guessRoom(x, "termin", hilfen) }) as CalendarEntry });
      letzterTag = date;
    } else {
      const read = readQuickText(x, ctx.today);
      if (read.time) return null;
      const title = titelSauber(read.title);
      if (title.length < 2 || title.split(" ").length > 7) return null;
      const when = read.when ?? (geerbt ? { date: geerbt } : "heute");
      const data = quickTaskData(title, when, ctx.today, { ...(read.label ? { label: read.label } : {}), ...(read.urgent ? { dringend: true } : {}) });
      ops.push({ id: id(), type: "upsert_entry", isNew: true, entry: createEntry("aufgabe", data, { raum: guessRoom(x, "aufgabe", hilfen) }) as CalendarEntry });
      letzterTag = data.date;
    }
    teile++;
  }
  // Nur EINE Sache ohne Steuerwort: das machen die anderen Regeln
  // Ein Einkauf mit mehreren Sachen, den die Einkaufs-Regel nicht erkennt („Pack Äpfel und Gurken drauf“), zählt mit
  const einkaufAllein = teile === 1 && ops.length >= 2 && ops.every((op) => op.type === "add_shopping") && !isShoppingRequest(t);
  if (!ops.length || (teile < 2 && !leadOk && !einkaufAllein)) return null;
  return { ops, reply: "Steht drin." };
}
