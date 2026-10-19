// Küchenhelfer – Mock-Modus (KUECHENHELFER_MOCK=1): ein Schein-Modell mit
// Beispielantworten. Es ruft dieselben Werkzeuge auf wie Claude, damit
// Oberfläche, Werkzeuge und Vorschau ohne API-Schlüssel testbar sind.
// Versteht nur einfache Sätze – z. B. "Donnerstag und Freitag gibt es meine
// Rezepte, Mattis wünscht sich Sonntag Milchreis, der Rest vegetarische KI-Rezepte".

import { parseNoteCommand } from "../notizen/chat";
import { isKladdeTidyRequest, kladdeCommand, tidyKladde } from "../notizen/kladde";
import { eventsIn, greetingCommand, localNewMail, localReply, looksLikeMail, parseHistoryDraft, REPLY_CHOICES, reviseDraft, revisionOf, splitInstruction, styleFromContext, summaryOf, type MailDraft } from "./mail";
import type Anthropic from "@anthropic-ai/sdk";
import { WEEKDAYS } from "../einstellungen/profile";
import type { CreateMessage } from "./engine";
import { dateForDay } from "./tools";
import { parseCalendar, type Draft } from "../aufgaben/parse";
import { parseHomeCommand } from "./homeChat";
import { parseBausteinCommand } from "./bausteinChat";
import { BAUSTEINE } from "../core/features";
import { parsePauseRequest } from "../essen/spontan";
import { findByTitle, sanitizeEntry, type CalendarEntry } from "../aufgaben/model";
import { EMPTY_STOCK_HINT, ingredientsFromQuestion, isCookIdeasRequest, stockIdeas, stockItem, usesLine } from "../essen/dishIdeas";

/** Namen aus "Vorrat (aktuell): Hack 500 g (Kühlschrank), Paprika (Kühlschrank)" im Kontext */
function stockNames(system: string): string[] {
  const line = system.split("\n").find((l) => l.startsWith("Vorrat (aktuell): "));
  if (!line) return [];
  return line
    .slice("Vorrat (aktuell): ".length)
    .split(/\),\s*/)
    .map((part) => part.replace(/\s*\(.*$/, "").replace(/\s+\d.*$/, "").trim())
    .filter(Boolean);
}

type ToolUse = { name: string; input: Record<string, unknown>; id?: string };
type WeekResult = { woche: string; tage: { tag: string; datum: string; ausflug?: boolean; gericht?: string | null; rezept_id?: string; pause?: boolean; wochenende?: string }[] };
type CookbookResult = { rezepte: { rezept_id: string; titel: string; bekannt?: boolean; minuten?: number }[] };

const DAY_RE = new RegExp(`\\b(${WEEKDAYS.join("|")})\\b`, "gi");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
const daysIn = (text: string) => [...text.matchAll(DAY_RE)].map((m) => cap(m[1]));

const VEGGIE: { titel: string; zeit: number; zutaten: [number | null, string, string][]; schritte: string[] }[] = [
  { titel: "Gemüse-Curry mit Kichererbsen", zeit: 30, zutaten: [[1, "Dose", "Kichererbsen"], [400, "ml", "Kokosmilch"], [2, "Stück", "Paprika"], [1, "Stück", "Zwiebel"], [2, "TL", "Currypulver"], [250, "g", "Reis"]], schritte: ["Reis nach Packung kochen.", "Zwiebel und Paprika würfeln und in etwas Öl anbraten.", "Currypulver kurz mitrösten, Kokosmilch und Kichererbsen dazugeben.", "10 Minuten köcheln lassen, mit Salz abschmecken und mit Reis servieren."] },
  { titel: "Gefüllte Paprika mit Reis", zeit: 50, zutaten: [[4, "Stück", "Paprika"], [150, "g", "Reis"], [1, "Dose", "Tomaten"], [1, "Stück", "Zucchini"], [1, "Stück", "Zwiebel"]], schritte: ["Reis vorkochen, Ofen auf 180 °C vorheizen.", "Zwiebel und Zucchini würfeln, anbraten und mit dem Reis mischen.", "Paprika aushöhlen, füllen und in eine Form mit den Tomaten setzen.", "30 Minuten backen."] },
  { titel: "Kartoffel-Lauch-Suppe", zeit: 35, zutaten: [[800, "g", "Kartoffeln"], [2, "Stück", "Lauch"], [1, "l", "Gemüsebrühe"], [1, "Stück", "Zwiebel"], [null, "", "Muskat"]], schritte: ["Kartoffeln schälen und würfeln, Lauch in Ringe schneiden.", "Zwiebel anschwitzen, Gemüse dazugeben und mit Brühe auffüllen.", "20 Minuten köcheln, fein pürieren und mit Muskat abschmecken."] },
  { titel: "Linsen-Bolognese", zeit: 35, zutaten: [[150, "g", "rote Linsen"], [1, "Stück", "Möhre"], [1, "Dose", "passierte Tomaten"], [1, "Stück", "Zwiebel"], [400, "g", "Spaghetti"]], schritte: ["Zwiebel und Möhre fein würfeln und anbraten.", "Linsen und passierte Tomaten dazugeben, 15 Minuten köcheln.", "Spaghetti kochen und mit der Soße servieren."] },
  { titel: "Ofengemüse mit Rosmarinkartoffeln", zeit: 45, zutaten: [[800, "g", "Kartoffeln"], [2, "Stück", "Paprika"], [1, "Stück", "Zucchini"], [1, "Stück", "rote Zwiebel"], [2, "Zweig", "Rosmarin"]], schritte: ["Ofen auf 200 °C vorheizen.", "Kartoffeln und Gemüse in Stücke schneiden, mit Öl, Salz und Rosmarin mischen.", "Auf einem Blech 35 Minuten rösten."] },
  { titel: "Spinat-Risotto", zeit: 35, zutaten: [[300, "g", "Risottoreis"], [1, "l", "Gemüsebrühe"], [200, "g", "Blattspinat"], [1, "Stück", "Zwiebel"]], schritte: ["Zwiebel anschwitzen, Reis kurz mitrösten.", "Nach und nach heiße Brühe zugeben und rühren, bis der Reis cremig ist.", "Spinat unterheben und abschmecken."] },
];

/** Beispielrezepte sind für 4 Personen – umrechnen, Stückzahlen ganz */
function scale(amount: number | null, unit: string, persons: number): number | null {
  if (amount === null) return null;
  const value = (amount * persons) / 4;
  return ["g", "ml", "l", "kg"].includes(unit) ? Math.round(value / 10) * 10 || value : Math.max(1, Math.round(value));
}

function message(content: Anthropic.Beta.BetaContentBlock[], stop: "end_turn" | "tool_use"): Anthropic.Beta.BetaMessage {
  return {
    id: `mock_${Date.now()}`,
    type: "message",
    role: "assistant",
    model: "mock",
    content,
    stop_reason: stop,
    stop_sequence: null,
    usage: { input_tokens: 0, output_tokens: 0 },
  } as unknown as Anthropic.Beta.BetaMessage;
}
const text = (t: string) => message([{ type: "text", text: t, citations: null } as Anthropic.Beta.BetaTextBlock], "end_turn");
let seq = 0;
const tools = (uses: ToolUse[]) =>
  message(
    uses.map((u) => ({ type: "tool_use", id: u.id ?? `mock_tool_${++seq}`, name: u.name, input: u.input }) as Anthropic.Beta.BetaToolUseBlock),
    "tool_use",
  );

/** Was die Familie will – aus der letzten Nachricht (plus der davor, wenn zuletzt nachgefragt wurde) */
function intentText(messages: Anthropic.Beta.BetaMessageParam[]): string {
  const turns = messages.filter((m) => typeof m.content === "string") as { role: string; content: string }[];
  const latest = turns[turns.length - 1]?.content ?? "";
  const prevAssistant = [...turns].reverse().find((m, i) => i > 0 && m.role === "assistant");
  const prevUser = [...turns].reverse().find((m, i) => i > 0 && m.role === "user");
  return prevAssistant?.content.includes("?") && prevUser ? `${prevUser.content}\n${latest}` : latest;
}

function cookbookTitles(system: string): string[] {
  const line = system.split("\n").find((l) => l.startsWith("Kochbuch:")) ?? "";
  const list = line.split(" – ")[1];
  return list ? list.split(", ").map((t) => t.replace(/ \(👍\d+\)$/, "")) : [];
}

/** Titel der Nie-wieder-Liste aus dem Kontext */
function neverAgainTitles(system: string): string[] {
  const start = system.indexOf("NIE WIEDER");
  if (start < 0) return [];
  return system
    .slice(start)
    .split("\n")
    .slice(1)
    .filter((l) => l.startsWith("- "))
    .map((l) => l.slice(2).split(";")[0].trim());
}

/** Spontan-Ideen im Testmodus: Kochbuch-Rezepte (ohne Nie-wieder) plus Beispielideen */
function leftoverReply(intentValue: string, system: string): string | null {
  const m = intentValue.match(/Spontan kochen mit dem, was da ist: (.*?)\.(?: Wünsche: ([^.]+)\.)? Bitte/);
  if (!m) return null;
  const banned = neverAgainTitles(system).map((t) => t.toLowerCase());
  const fromBook = cookbookTitles(system).filter((t) => !banned.includes(t.toLowerCase()));
  const extra = ["Resteomelett (10 Min.)", "Gemüsepfanne (15 Min.)", "Bunte Suppe (20 Min.)"];
  const ideas = [...fromBook.slice(0, 1), ...extra].slice(0, 3);
  return `Aus ${m[1]} fallen mir drei Sachen ein (Testmodus): ${ideas[0]}, ${ideas[1]} oder ${ideas[2]}. Welche soll's werden?`;
}

/** Rezepte aus dem Kochbuch in der Reihenfolge, in der sie genannt werden */
function mentionedRecipes(textValue: string, titles: string[]): string[] {
  const t = textValue.toLowerCase();
  return titles
    .map((title) => {
      const words = [title.toLowerCase(), ...title.toLowerCase().split(/[\s-]+/).filter((w) => w.length >= 5)];
      const at = Math.min(...words.map((w) => t.indexOf(w)).filter((i) => i >= 0));
      return { title, at };
    })
    .filter((m) => Number.isFinite(m.at))
    .sort((a, b) => a.at - b.at)
    .map((m) => m.title);
}

const DAY_WORDS = `heute|morgen|${WEEKDAYS.join("|")}`;

/** Alltags-Sätze, die ohne Wochenplanung auskommen (Testmodus) */
function everyday(t: string) {
  const s = t.trim().replace(/[.!]+$/, "");
  const dish = s.match(new RegExp(`^(${DAY_WORDS})\\s+gibt(?:'|’)?s\\s+(?:es\\s+)?(.+)$`, "i"));
  const pantry = s.match(/^ich hab(?:e)?\s+(?:noch\s+)?(\d+(?:[.,]\d+)?)?\s*(portionen|portion|g|kg|stück|becher|packungen)?\s*(.+?)\s+(eingefroren|im tiefkühler|im kühlschrank|im schrank)$/i);
  const wish = s.match(new RegExp(`^([A-ZÄÖÜ][a-zäöüß]+)\\s+wünscht sich\\s+(?!(?:am\\s+)?(?:${WEEKDAYS.join("|")})\\b)(.+)$`, "i"));
  return {
    dish: dish ? { tag: dish[1].toLowerCase() === "heute" || dish[1].toLowerCase() === "morgen" ? dish[1].toLowerCase() : cap(dish[1]), gericht: dish[2].trim() } : null,
    pantry: pantry
      ? {
          name: cap(pantry[3].trim()),
          menge: pantry[1] ? Number(pantry[1].replace(",", ".")) : null,
          einheit: pantry[2] ? (/^portion/i.test(pantry[2]) ? "Portionen" : pantry[2]) : "",
          ort: /eingefroren|tiefkühler/i.test(pantry[4]) ? "tiefkuehler" : /kühlschrank/i.test(pantry[4]) ? "kuehlschrank" : "schrank",
        }
      : null,
    wish: wish ? { person: wish[1], gericht: wish[2].trim() } : null,
    need: s.match(/^(?:wir|ich)\s+brauch(?:en|e)\s+(?:noch\s+)?(.+)$/i)?.[1] ?? null,
    quick: /nur (noch )?schnelle/i.test(s),
  };
}

function plan(intent: string, system: string) {
  const clauses = intent.split(/[,.;\n]/);
  const myClause = clauses.find((c) => /meine(n)? rezepte|unsere(n)? rezepte/i.test(c)) ?? "";
  const myDays = daysIn(myClause);
  const titles = cookbookTitles(system);
  const otherText = clauses.filter((c) => c !== myClause && !/wünscht sich/i.test(c)).join(",");
  const named = mentionedRecipes(otherText, titles);
  const wish = intent.match(new RegExp(`([A-ZÄÖÜ][a-zäöüß]+)\\s+wünscht sich\\s+(?:am\\s+)?(${WEEKDAYS.join("|")})\\s+([^,.;\\n]+?)(?=\\s+und\\s|[,.;\\n]|$)`, "i"));
  const week = /nächste(n)? woche/i.test(intent)
    ? "naechste"
    : /diese(r)? woche/i.test(intent)
      ? "aktuell"
      : system.match(/wenn nichts gesagt wird: (\w+)/)?.[1] === "naechste" ? "naechste" : "aktuell";
  return {
    week,
    myDays,
    named,
    titles,
    wish: wish ? { kind: wish[1], tag: cap(wish[2]), gericht: wish[3].trim() } : null,
    restVeggie: /\b(der |den )?rest\b/i.test(intent) && /veg/i.test(intent),
    planWeek: /\bplan\w*\s+(mir |uns )?(bitte )?(die |unsere )?(nächste |diese )?woche\b|\bwoche planen\b|was für die nächsten tage/i.test(intent),
    clear: /(leer|lösch|streich)/i.test(intent) ? daysIn(intent) : [],
    double: /(doppelt|reste für morgen)/i.test(intent) ? daysIn(intent) : [],
    swap: /(tausch|verschieb)/i.test(intent) ? daysIn(intent) : [],
    shopping:
      intent.match(/(?:setz|pack|schreib)\w*\s+(.+?)\s+auf die einkaufsliste/i)?.[1] ??
      intent.match(/einkaufsliste\s*:\s*(.+)$/i)?.[1] ??
      null,
  };
}

/**
 * Wochenplanung im Testmodus: bekannte Gerichte, schnellste zuerst, und
 * `perWeek` neue (unbekannte Kochbuch-Rezepte, sonst ein KI-Rezept = recipe
 * null) – verteilt auf die Wochenmitte. Reichen die bekannten nicht, bleiben
 * Tage frei.
 */
export function pickWeekDishes(
  book: CookbookResult["rezepte"],
  free: string[],
  perWeek: number,
): { tag: string; recipe: CookbookResult["rezepte"][number] | null }[] {
  const known = book.filter((r) => r.bekannt).sort((a, b) => (a.minuten ?? 999) - (b.minuten ?? 999));
  const fresh = book.filter((r) => r.bekannt === false);
  const newCount = Math.min(perWeek, free.length);
  const newDays = new Set(Array.from({ length: newCount }, (_, i) => free[Math.floor(((i + 1) * free.length) / (newCount + 1))]));
  let k = 0;
  let f = 0;
  return free.flatMap((tag) => {
    if (newDays.has(tag)) return [{ tag, recipe: fresh[f++] ?? null }];
    const recipe = known[k++];
    return recipe ? [{ tag, recipe }] : [];
  });
}

const parse = <T,>(s: unknown): T | null => {
  try {
    return typeof s === "string" ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
};

/** Testmodus: wie das echte Modell, der Text kommt Wort für Wort (Streaming) */
export function createMockModel(): CreateMessage {
  const model = mockModel();
  return async (params, onText) => {
    const message = await model(params);
    if (onText) {
      for (const block of message.content) {
        if (block.type !== "text") continue;
        for (const word of block.text.split(/(?<=\s)/)) {
          onText(word);
          await new Promise((r) => setTimeout(r, 40));
        }
      }
    }
    return message;
  };
}

function mockModel(): CreateMessage {
  return async (params) => {
    const msgs = params.messages;
    const system = (params.system as Anthropic.Beta.BetaTextBlockParam[]).map((b) => b.text).join("\n");
    const intent = plan(intentText(msgs), system);
    const last = msgs[msgs.length - 1];
    const prev = msgs[msgs.length - 2];
    const prevUses =
      prev && Array.isArray(prev.content)
        ? (prev.content as Anthropic.Beta.BetaContentBlockParam[]).filter((b): b is Anthropic.Beta.BetaToolUseBlockParam => b.type === "tool_use")
        : [];
    const results =
      Array.isArray(last.content)
        ? (last.content as Anthropic.Beta.BetaToolResultBlockParam[]).filter((b) => b.type === "tool_result")
        : [];
    const resultFor = (name: string) => {
      const use = prevUses.find((u) => u.name === name);
      return use ? results.find((r) => r.tool_use_id === use.id)?.content : undefined;
    };

    // 1. Neue Frage: unklar → nachfragen, sonst Woche und Kochbuch lesen
    if (typeof last.content === "string") {
      // Gedächtnis: Lotte kennt die letzten Nachrichten des Gesprächs
      const memory = memoryReply(last.content, msgs);
      if (memory) return text(memory);
      const mail = mailUses(last.content, msgs, system);
      if (mail) return mail;
      const kladde = kladdeUses(last.content, msgs, system);
      if (kladde) return kladde;
      const note = noteUses(last.content);
      if (note) return note;
      const leftovers = leftoverReply(last.content, system);
      if (leftovers) return text(leftovers);
      const everydayUse = everydayUses(last.content, system);
      if (everydayUse) return everydayUse;
      const calendar = calendarUses(last.content, system);
      if (calendar) return calendar;
      const latest = last.content;
      const prevAssistant = [...msgs].reverse().find((x, i) => i > 0 && x.role === "assistant" && typeof x.content === "string");
      const day = everyday(latest);
      const planningWeek = system.match(/wenn nichts gesagt wird: (\w+)/)?.[1] === "naechste" ? "naechste" : "aktuell";
      // Ideen aus dem aktuellen Vorrat im Kontext (+ eben Genanntes)
      const named = ingredientsFromQuestion(latest);
      if (named || isCookIdeasRequest(latest)) {
        const todayIso = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
        const stock = [...stockNames(system), ...(named ?? [])].map((n) => stockItem(n, "s", todayIso));
        const ideas = stockIdeas(stock);
        const lines = ideas.map((i) => `${i.title} (${i.minutes} Min.${i.uses.length ? `, ${usesLine(i.uses, i.needs)}` : ""})`);
        return text(
          stock.length
            ? `Mit dem, was da ist: ${lines.join("; ")}. Soll ich eins für heute einplanen? (Testmodus)`
            : `Aus Grundzutaten geht z. B. ${lines.join("; ")}. ${EMPTY_STOCK_HINT} (Testmodus)`,
        );
      }
      if (day.pantry) return tools([{ name: "vorrat_hinzufuegen", input: { sachen: [day.pantry] } }]);
      if (day.wish) return tools([{ name: "wunsch_merken", input: day.wish }]);
      if (day.need) {
        const artikel = day.need.split(/,|\bund\b/).map((n) => n.trim()).filter(Boolean).map((name) => ({ name: cap(name) }));
        return tools([{ name: "einkaufsliste_hinzufuegen", input: { woche: planningWeek, artikel } }]);
      }
      if (day.dish) {
        return tools([
          { name: "woche_lesen", input: { woche: "aktuell" } },
          { name: "woche_lesen", input: { woche: "naechste" } },
          { name: "kochbuch_durchsuchen", input: {} },
        ]);
      }
      if (day.quick) {
        return tools([
          { name: "woche_lesen", input: { woche: intent.week } },
          { name: "kochbuch_durchsuchen", input: {} },
        ]);
      }
      if (/entdecker|was neues ausprobieren/i.test(latest)) {
        const likes = system.match(/Das mögt ihr \(Lieblingszutaten, bevorzugt einbauen\): (.+)/)?.[1]?.split(", ") ?? [];
        return text(
          likes.length
            ? `Neu, aber nicht fremd: Wie wär's mit einer Shakshuka mit ${likes.slice(0, 2).join(" und ")}? (Testmodus)`
            : "Wie wär's mit einer Shakshuka? (Testmodus)",
        );
      }
      if (/(neues rezept|neue rezepte|denk dir|rezeptidee|was neues)/i.test(latest)) {
        return text("Klar, mach ich! Was soll die Basis sein – Kartoffeln, Reis, Nudeln oder was anderes?");
      }
      if (typeof prevAssistant?.content === "string" && /basis/i.test(prevAssistant.content)) {
        return text(`Mit ${latest} – wie wär's mit einer cremigen Gemüsepfanne dazu? Sag Bescheid, für welchen Tag (Testmodus).`);
      }
      if (intent.myDays.length > 0 && intent.named.length < intent.myDays.length) {
        const choice = intent.titles.slice(0, 6).join(", ");
        return text(
          `Gern! Welche deiner Rezepte soll es am ${intent.myDays.join(" und am ")} geben?${choice ? ` Zur Auswahl hast du zum Beispiel: ${choice}.` : " Im Kochbuch ist noch nichts – sag mir einfach die Gerichte."}`,
        );
      }
      const actionable =
        intent.myDays.length || intent.wish || intent.restVeggie || intent.planWeek || intent.clear.length || intent.double.length || intent.swap.length >= 2 || intent.shopping;
      if (!actionable) {
        const name = system.match(/^Du bist ([^,]+),/)?.[1] ?? "dein Küchenhelfer";
        return text(`Ich bin ${name} (Testmodus). Sag zum Beispiel: „Donnerstag und Freitag gibt es meine Rezepte, Mattis wünscht sich Sonntag Milchreis, der Rest vegetarische KI-Rezepte.“`);
      }
      return tools([
        { name: "woche_lesen", input: { woche: intent.week } },
        { name: "kochbuch_durchsuchen", input: {} },
      ]);
    }

    // 2. Woche gelesen → Änderungen vorschlagen (neue Rezepte zuerst anlegen)
    if (prevUses.some((u) => u.name === "woche_lesen")) {
      const week = parse<WeekResult>(resultFor("woche_lesen"));
      const book = parse<CookbookResult>(resultFor("kochbuch_durchsuchen"));
      if (!week) return text("Ich konnte die Woche gerade nicht lesen.");
      const day = everyday(intentText(msgs));
      if (day.dish) {
        // Tag über das Datum in einer der beiden gelesenen Wochen finden
        const todayIso = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
        const date = dateForDay(todayIso, day.dish.tag);
        const [, m, d] = (date ?? "").split("-");
        const label = date ? `${Number(d)}.${Number(m)}.` : "";
        const weeks = prevUses
          .filter((u) => u.name === "woche_lesen")
          .map((u) => parse<WeekResult>(results.find((r) => r.tool_use_id === u.id)?.content))
          .filter((w): w is WeekResult => Boolean(w));
        const hit = weeks.flatMap((w) => w.tage.map((t) => ({ w, t }))).find(({ t }) => t.datum === label);
        if (!hit) return text("Den Tag finde ich gerade nicht im Plan – magst du ihn mir nochmal sagen?");
        const recipe = book?.rezepte.find((r) => r.titel.toLowerCase().includes(day.dish!.gericht.toLowerCase()));
        return tools([
          {
            name: "gericht_setzen",
            input: { woche: hit.w.woche, tag: hit.t.tag, ...(recipe ? { rezept_id: recipe.rezept_id } : { gericht: day.dish.gericht }) },
          },
        ]);
      }
      if (day.quick && book) {
        // Langsames (über 30 Min.) und Freies durch schnelle, bekannte Gerichte ersetzen
        const quick = book.rezepte.filter((r) => r.bekannt && (r.minuten ?? 99) <= 30).sort((a, b) => (a.minuten ?? 99) - (b.minuten ?? 99));
        const slow = new Set(book.rezepte.filter((r) => (r.minuten ?? 0) > 30).map((r) => r.rezept_id));
        const spontan = /Ich koche spontan – keine Planung/.test(system);
        let k = 0;
        const uses: ToolUse[] = [];
        for (const t of week.tage) {
          if (t.ausflug || t.pause || t.wochenende === "frei") continue;
          const replace = t.rezept_id ? slow.has(t.rezept_id) : !t.gericht && !spontan;
          const recipe = replace ? quick[k++ % Math.max(1, quick.length)] : undefined;
          if (recipe && recipe.rezept_id !== t.rezept_id) uses.push({ name: "gericht_setzen", input: { woche: week.woche, tag: t.tag, rezept_id: recipe.rezept_id } });
        }
        return uses.length ? tools(uses) : text("Diese Woche ist schon alles schnell – passt! (Testmodus)");
      }
      // Der Tag mit seinem einen Hauptgericht (null bei Ausflug)
      const main = (tag: string) => {
        const d = week.tage.find((x) => x.tag === tag);
        return !d || d.ausflug ? null : { gericht: d.gericht ?? null };
      };
      const uses: ToolUse[] = [];
      const taken = new Set<string>();
      const assignDays = intent.myDays.length ? intent.myDays : daysIn(intentText(msgs)).slice(0, intent.named.length);
      intent.named.slice(0, assignDays.length).forEach((title, i) => {
        const tag = assignDays[i];
        const recipe = book?.rezepte.find((r) => r.titel === title);
        const slot = main(tag);
        if (!recipe || !slot) return;
        uses.push({ name: "gericht_setzen", input: { woche: intent.week, tag, rezept_id: recipe.rezept_id } });
        taken.add(tag);
      });
      if (intent.wish) {
        uses.push({
          name: "vorgaben_aendern",
          input: { woche: intent.week, wunsch: { kind: intent.wish.kind, gericht: intent.wish.gericht, tag: intent.wish.tag } },
        });
        taken.add(intent.wish.tag);
      }
      for (const tag of intent.clear) {
        const slot = main(tag);
        if (slot?.gericht) uses.push({ name: "platz_leeren", input: { woche: intent.week, tag } });
      }
      for (const tag of intent.double) {
        if (main(tag)?.gericht) uses.push({ name: "doppelt_kochen", input: { woche: intent.week, tag, an: true } });
      }
      if (intent.swap.length >= 2) {
        const [a, b] = intent.swap;
        const from = main(a);
        const to = main(b);
        if (from && to) uses.push({ name: "gericht_verschieben", input: { woche: intent.week, von_tag: a, nach_tag: b } });
      }
      if (intent.shopping) {
        const artikel = intent.shopping.split(/,|\bund\b/).map((s) => s.trim()).filter(Boolean).map((name) => ({ name }));
        if (artikel.length) uses.push({ name: "einkaufsliste_hinzufuegen", input: { woche: intent.week, artikel } });
      }
      if (intent.restVeggie) {
        const persons = Number(system.match(/, (\d+) Personen/)?.[1] ?? 4);
        let n = 0;
        for (const d of week.tage) {
          const slot = main(d.tag);
          if (!slot || slot.gericht || taken.has(d.tag)) continue;
          const r = VEGGIE[n++ % VEGGIE.length];
          uses.push({
            id: `mock_rezept_${d.tag}_${n}`,
            name: "rezept_erstellen",
            input: {
              titel: r.titel,
              kategorie: "vegetarisch",
              portionen: persons,
              zubereitungszeit_min: r.zeit,
              zutaten: r.zutaten.map(([menge, einheit, name]) => ({ menge: scale(menge, einheit, persons), einheit, name })),
              schritte: r.schritte,
              fuer_plan: true,
            },
          });
        }
      }
      if (intent.planWeek && book) {
        // Überwiegend Bekanntes und Schnelles, dazu so viel Neues wie gewünscht
        const free = week.tage.filter((d) => main(d.tag) && !main(d.tag)!.gericht && !d.pause && d.wochenende !== "frei" && !taken.has(d.tag)).map((d) => d.tag);
        const perWeek = Number(system.match(/Neue Gerichte pro Woche: (\d)/)?.[1] ?? 1);
        const picks = pickWeekDishes(book.rezepte, free, perWeek);
        const persons = Number(system.match(/, (\d+) Personen/)?.[1] ?? 4);
        picks.forEach(({ tag, recipe }, n) => {
          if (recipe) {
            uses.push({ name: "gericht_setzen", input: { woche: intent.week, tag, rezept_id: recipe.rezept_id } });
            return;
          }
          const r = VEGGIE[n % VEGGIE.length];
          uses.push({
            id: `mock_rezept_${tag}_${n}`,
            name: "rezept_erstellen",
            input: {
              titel: r.titel,
              kategorie: "vegetarisch",
              portionen: persons,
              zubereitungszeit_min: r.zeit,
              zutaten: r.zutaten.map(([menge, einheit, name]) => ({ menge: scale(menge, einheit, persons), einheit, name })),
              schritte: r.schritte,
              fuer_plan: true,
            },
          });
        });
      }
      return uses.length ? tools(uses) : text("Ich habe nichts gefunden, was ich ändern könnte – sag mir gern genauer, was du möchtest.");
    }

    // Umgerechnet → die Zutaten nennen
    const portions = prevUses.find((u) => u.name === "portionen_anpassen");
    if (portions) {
      const content = String(resultFor("portionen_anpassen") ?? "");
      return text(content.startsWith("Vorgemerkt") ? `Klar! ${content.replace(/^Vorgemerkt: /, "")} Tipp unten auf Übernehmen. (Testmodus)` : `${content} (Testmodus)`);
    }
    if (prevUses.some((u) => u.name === "app_befehl")) return text("Mach ich – tipp unten auf Übernehmen. (Testmodus)");

    // Mails: ein Satz zum Entwurf bzw. zur Frage, evtl. "Soll ich das eintragen?"
    const drafted = prevUses.find((u) => u.name === "mail_entwurf");
    const asked = prevUses.some((u) => u.name === "antwort_knoepfe");
    if (drafted || asked) {
      const summary = drafted ? String((drafted.input as Record<string, unknown>).kurzfassung ?? "") : summaryOf(splitInstruction(intentText(msgs)).mail);
      const event = prevUses.some((u) => u.name === "termin_anlegen" || u.name === "aufgabe_anlegen") ? " Da steht auch ein Termin drin – soll ich das eintragen? Tipp unten auf Übernehmen." : "";
      if (asked) return text(`Kurz gesagt: ${summary} Wie willst du antworten?${event} (Testmodus)`);
      return text(`${summary ? `Kurz gesagt: ${summary} ` : ""}Hier mein Vorschlag – senden machst du selbst.${event} (Testmodus)`);
    }

    // Notizen/Aufgaben gelesen → Inhalt kurz wiedergeben (ohne ids)
    const read = prevUses.find((u) => u.name === "notizen_anzeigen" || u.name === "aufgaben_anzeigen");
    if (read) return text(`${String(resultFor(read.name) ?? "").replace(/ \[id=[^\]]+\]/g, "")} (Testmodus)`);

    // Termine gelesen → kurz antworten
    const shown = prevUses.find((u) => u.name === "woche_anzeigen" || u.name === "tag_anzeigen");
    if (shown) return text(calendarAnswer(String(resultFor(shown.name) ?? ""), shown.input as Record<string, unknown>));

    // 3. Neue Rezepte angelegt → eintragen
    const created = prevUses.filter((u) => u.name === "rezept_erstellen");
    if (created.length > 0) {
      const uses: ToolUse[] = created.flatMap((u) => {
        const ref = String(results.find((r) => r.tool_use_id === u.id)?.content ?? "").match(/ref: (\S+)/)?.[1];
        const [, , tag] = u.id.split("_");
        return ref ? [{ name: "gericht_setzen", input: { woche: intent.week, tag, neues_rezept: ref } }] : [];
      });
      if (uses.length) return tools(uses);
    }

    // 4. Fertig
    const ok = results.filter((r) => !r.is_error).length;
    if (ok > 0 && prevUses.some((u) => CALENDAR_WRITE.has(u.name))) return text("Steht bereit – tipp unten auf Übernehmen. (Testmodus)");
    return text(
      ok > 0
        ? "Ich habe dir einen Vorschlag gemacht (Testmodus). Schau ihn dir unten an – du kannst einzelne Punkte abwählen und dann übernehmen."
        : "Das hat leider nicht geklappt. Magst du es anders formulieren?",
    );
  };
}

/** "Was hab ich eben gesagt?" / "Wie heiße ich?" – zeigt, dass der Verlauf mitkommt */
function memoryReply(latest: string, msgs: Anthropic.Beta.BetaMessageParam[]): string | null {
  const earlier = msgs.slice(0, -1).filter((m) => m.role === "user" && typeof m.content === "string").map((m) => m.content as string);
  if (/was hab(e)? ich (eben|gerade|vorhin) gesagt/i.test(latest)) {
    const said = earlier[earlier.length - 1];
    return said ? `Du hast gesagt: „${said}“` : "Wir haben gerade erst angefangen.";
  }
  if (/wie hei(ß|ss)e ich/i.test(latest)) {
    const named = [...earlier].reverse().map((t) => t.match(/ich hei(?:ß|ss)e (\p{L}+)/iu)?.[1]).find(Boolean);
    return named ? `Du heißt ${named}.` : "Das hast du mir noch nicht verraten.";
  }
  if (/^ich hei(ß|ss)e (\p{L}+)/iu.test(latest)) return `Schön, dich kennenzulernen, ${latest.match(/^ich hei(?:ß|ss)e (\p{L}+)/iu)![1]}!`;
  return null;
}

// --- Termine und Aufgaben (Testmodus: Satz-Erkennung ohne KI) --------------------

const NUMBER_WORDS: Record<string, number> = { zweit: 2, dritt: 3, viert: 4, fünft: 5, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6 };

/** Alltag im Testmodus: Portionen, Pause, Startseite/Rückgängig, App-Bedienung */
function everydayUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const t = latest.toLowerCase();
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  // "Heute sind wir nur zu zweit" / "Rechne das Rezept auf 2 Personen um"
  const people = t.match(/\bnur (?:zu )?(zweit|dritt|viert|fünft)\b/) ?? t.match(/\bauf (\d+|zwei|drei|vier|fünf|sechs) (?:personen|leute|portionen)\b/) ?? t.match(/\bnur (\d+|zwei|drei|vier) (?:personen|leute)\b/);
  if (people) return tools([{ name: "portionen_anpassen", input: { personen: Number(people[1]) || NUMBER_WORDS[people[1]] || 2 } }]);
  if (/\b(wieder da|zurück aus dem urlaub|urlaub ist vorbei)\b/.test(t)) return tools([{ name: "pause_beenden", input: {} }]);
  if (/\b(urlaub|verreist|verreisen|ferien)\b/.test(t) && today) {
    const pause = parsePauseRequest(latest, new Date(`${today}T12:00:00`));
    if (pause?.kind === "start" && pause.pause.until) return tools([{ name: "pause_setzen", input: { von: pause.pause.from, bis: pause.pause.until } }]);
    return text("Schön! Von wann bis wann seid ihr weg? (Testmodus)");
  }
  // Bausteine: "Zeig mir den Vorrat", "Ich brauche die Tipps nicht", "Was kannst du noch?"
  const baustein = parseBausteinCommand(latest);
  if (baustein) {
    const offLine = system.match(/Aus: (.+)$/m)?.[1] ?? "";
    if (baustein.kind === "list") {
      const off = BAUSTEINE.filter((b) => offLine.includes(`(${b.feature}:`));
      return text(off.length ? `Ich kann noch: ${off.map((b) => `${b.name} – ${b.text.replace(/\.$/, "")}`).join("; ")}. Soll ich was davon einschalten? (Testmodus)` : "Gerade ist alles an, was ich kann. (Testmodus)");
    }
    const isOff = offLine.includes(`(${baustein.feature}:`);
    if (isOff === baustein.on) return tools([{ name: baustein.on ? "baustein_an" : "baustein_aus", input: { baustein: baustein.feature } }]);
  }
  const home = parseHomeCommand(latest);
  if (home) {
    if (home.kind === "undo") return tools([{ name: "rueckgaengig", input: {} }]);
    if (home.kind === "home") return tools([{ name: "startseite_anpassen", input: { kachel: home.change.tile, aktion: home.change.action } }]);
    if (home.kind === "clear_week") return tools([{ name: "wochenplan_loeschen", input: {} }]);
    if (home.kind === "clear_shopping") return tools([{ name: "einkaufsliste_leeren", input: {} }]);
    if (home.kind === "remove_shopping") return tools([{ name: "einkaufsliste_entfernen", input: { artikel: home.names } }]);
    return tools([{ name: "app_befehl", input: { text: latest } }]);
  }
  // App-Bedienung (Ansicht, Vorlesen, Einstellungen, neue Person, Produkte, Seiten)
  if (greetingCommand(latest)) return tools([{ name: "app_befehl", input: { text: latest } }]);
  if (/\b(ansicht|dunkel|vorlesen|lies mir|sprich (langsamer|schneller)|melde dich|keine tipps|isst jetzt|mag kein\w*|allergisch|wohnt jetzt|immer .+ statt|zeig mir (alles|unsere rezepte|den vorrat)|koche jetzt spontan)\b/.test(t)) {
    return tools([{ name: "app_befehl", input: { text: latest } }]);
  }
  return null;
}

/** Mails im Testmodus: eingefügte Mail, "Zusagen"/"Absagen"/"Nachfragen", neue Mail, "Kürzer"/"Auf Du" */
function mailUses(latest: string, msgs: Anthropic.Beta.BetaMessageParam[], system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  const { style, name } = styleFromContext(system);
  const strings = msgs.slice(0, -1).filter((m) => typeof m.content === "string") as { role: string; content: string }[];
  const eventsFor = (mail: string) => (today ? eventsIn(mail, today).map((d) => draftInput(d, today)) : []);
  const draftUse = (d: MailDraft) => ({ name: "mail_entwurf", input: { an: d.to, empfaenger: d.recipient ?? "", betreff: d.subject, text: d.body, anrede: d.tone, ...(d.summary ? { kurzfassung: d.summary } : {}) } });
  const { instruction, mail } = splitInstruction(latest);
  if (looksLikeMail(mail)) {
    if (instruction) return tools([draftUse(localReply(mail, { instruction }, style, name)), ...eventsFor(mail)]);
    return tools([{ name: "antwort_knoepfe", input: { optionen: REPLY_CHOICES.map((c) => c.label) } }, ...eventsFor(mail)]);
  }
  // Antwort-Knopf auf die zuletzt eingefügte Mail
  const choice = REPLY_CHOICES.find((c) => c.label.toLowerCase() === latest.trim().toLowerCase());
  const pasted = [...strings].reverse().find((m) => m.role === "user" && looksLikeMail(splitInstruction(m.content).mail));
  if (choice && pasted) return tools([draftUse(localReply(splitInstruction(pasted.content).mail, { choice: choice.id }, style, name))]);
  // Änderung am letzten Entwurf
  const rev = revisionOf(latest);
  const lastDraft = [...strings].reverse().find((m) => m.role === "assistant" && m.content.includes("[Mail-Entwurf"));
  const previous = lastDraft ? parseHistoryDraft(lastDraft.content.slice(lastDraft.content.indexOf("[Mail-Entwurf"))) : null;
  if (rev && previous) return tools([draftUse(reviseDraft(previous, rev))]);
  const fresh = localNewMail(latest, style, name);
  if (fresh) return tools([draftUse(fresh)]);
  return null;
}

/** Kladde und Umwandeln im Testmodus */
function kladdeUses(latest: string, msgs: Anthropic.Beta.BetaMessageParam[], system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1] ?? "";
  const write = kladdeCommand(latest);
  if (write) return tools([{ name: "kladde_schreiben", input: { text: write } }]);
  if (isKladdeTidyRequest(latest)) {
    const raw = system.match(/^Kladde \(Schmierzettel\): (.*)$/m)?.[1] ?? "leer";
    const kladdeText = raw === "leer" ? "" : (JSON.parse(raw) as string);
    const lines = today ? tidyKladde(kladdeText, today).filter((l) => l.kind) : [];
    if (!lines.length) return text("In deiner Kladde finde ich gerade nichts, was ein Termin, eine Aufgabe oder eine Notiz wird. (Testmodus)");
    const uses: ToolUse[] = lines.map((l) =>
      l.draft
        ? draftInput(l.draft, today)
        : l.note?.kind === "add"
          ? { name: "liste_eintrag_hinzufuegen", input: { liste: l.note.list, eintraege: l.note.items } }
          : { name: "notiz_anlegen", input: { titel: l.note && l.note.kind === "create" ? l.note.title : l.line, text: l.note && l.note.kind === "create" ? (l.note.text ?? "") : l.line } },
    );
    return tools([...uses, { name: "kladde_aufraeumen", input: { zeilen: lines.map((l) => l.line) } }]);
  }
  const toTask = /\bkein(?:en)?\s+termin\b.*\baufgabe\b/i.test(latest);
  const toTermin = latest.match(/\bkeine\s+aufgabe\b.*\btermin\b.*?\b(?:um\s+)?(\d{1,2})(?::(\d{2}))?\s*uhr\b/i);
  if (toTask || toTermin) {
    const known = contextEntries(system).filter((e) => e.typ === (toTask ? "termin" : "aufgabe"));
    const prevUser = [...msgs].reverse().find((m, i) => i > 0 && m.role === "user" && typeof m.content === "string")?.content as string | undefined;
    const hit = known.find((e) => prevUser?.toLowerCase().includes(e.title.toLowerCase().split(" ")[0])) ?? known[0];
    if (!hit) return text("Welchen Eintrag meinst du genau? (Testmodus)");
    if (toTask) return tools([{ name: "termin_in_aufgabe_umwandeln", input: { id: hit.id } }]);
    return tools([{ name: "aufgabe_in_termin_umwandeln", input: { id: hit.id, start: `${toTermin![1].padStart(2, "0")}:${toTermin![2] ?? "00"}` } }]);
  }
  return null;
}

/** Notizen im Testmodus: "Merk dir …", "Was steht auf der Packliste?", "Häng das WLAN oben an", "Was muss ich heute noch erledigen?" */
function noteUses(latest: string): Anthropic.Beta.BetaMessage | null {
  const cmd = parseNoteCommand(latest);
  if (!cmd) return null;
  switch (cmd.kind) {
    case "tasks":
      // "Zeig mir meine Aufgaben" öffnet die Seite, sonst kurz antworten
      if (cmd.open) return tools([{ name: "app_befehl", input: { text: latest } }]);
      return tools([{ name: "aufgaben_anzeigen", input: { gruppe: /\bheute\b/i.test(latest) ? "heute" : "alle" } }]);
    case "show_all":
      return tools([{ name: "app_befehl", input: { text: latest } }]);
    case "show":
      return tools([{ name: "notizen_anzeigen", input: { suche: cmd.query } }]);
    case "pin":
      return tools([{ name: "notiz_anheften", input: { id: cmd.query.replace(/^(das|die|den|der|meine|unsere)\s+/i, ""), angeheftet: cmd.on } }]);
    case "add":
      return tools([{ name: "liste_eintrag_hinzufuegen", input: { liste: cmd.list, eintraege: cmd.items } }]);
    case "create":
      return tools([{ name: "notiz_anlegen", input: { titel: cmd.title, ...(cmd.items ? { liste: cmd.items } : { text: cmd.text ?? "" }) } }]);
  }
}

const CALENDAR_WRITE = new Set(["kladde_schreiben", "kladde_aufraeumen", "termin_in_aufgabe_umwandeln", "aufgabe_in_termin_umwandeln", "notiz_anlegen", "notiz_aendern", "notiz_loeschen", "liste_eintrag_hinzufuegen", "notiz_anheften", "baustein_an", "baustein_aus", "portionen_anpassen", "pause_setzen", "pause_beenden", "startseite_anpassen", "wochenplan_loeschen", "einkaufsliste_leeren", "einkaufsliste_entfernen", "rueckgaengig", "termin_anlegen", "termin_aendern", "termin_loeschen", "aufgabe_anlegen", "aufgabe_aendern", "aufgabe_erledigen", "aufgabe_verschieben"]);

/** Einträge aus der Kontext-Liste "- Mo 2026-10-19: 09:00 Titel [id=…; termin, familie] | …" */
function contextEntries(system: string): { date: string; time: string | null; title: string; id: string; typ: string; repeat: boolean }[] {
  return system
    .split("\n")
    .filter((l) => /^- \S+ \d{4}-\d{2}-\d{2}: /.test(l))
    .flatMap((l) => {
      const date = l.match(/\d{4}-\d{2}-\d{2}/)![0];
      return [...l.slice(l.indexOf(": ")).matchAll(/(?:\| |: )(?:(\d{2}:\d{2}) )?([^|[]+?) \[id=([^;]+); (termin|aufgabe)([^\]]*)\]/g)].map((m) => ({
        date,
        time: m[1] ?? null,
        title: m[2].trim(),
        id: m[3],
        typ: m[4],
        repeat: m[5].includes("wiederkehrend"),
      }));
    });
}

function draftInput(draft: Draft, today?: string): { name: string; input: Record<string, unknown> } {
  const d = draft.data;
  const wiederholung = d.repeat ? { art: d.repeat.kind, ...(d.repeat.kind === "wochentage" ? { tage: d.repeat.days } : {}) } : undefined;
  const common = { titel: d.title, raum: draft.raum, erinnerung: d.reminder, ...(d.label ? { etikett: d.label } : {}), ...(wiederholung ? { wiederholung } : {}) };
  if (draft.typ === "termin") return { name: "termin_anlegen", input: { ...common, datum: draft.data.date, start: draft.data.start, ...(draft.data.who ? { personen: draft.data.who } : {}) } };
  const a = draft.data;
  const zeitraum = a.week && today ? (a.week <= today ? "diese_woche" : "naechste_woche") : undefined;
  return { name: "aufgabe_anlegen", input: { ...common, ...(a.date ? { tag: a.date } : {}), ...(a.due ? { frist: a.due } : {}), ...(a.time ? { uhrzeit: a.time } : {}), ...(zeitraum ? { zeitraum } : {}) } };
}

function calendarUses(latest: string, system: string): Anthropic.Beta.BetaMessage | null {
  const today = system.match(/^Heute: .*\((\d{4}-\d{2}-\d{2})\)/m)?.[1];
  if (!today) return null;
  // Personen aus dem Profil ("- Jonne; Kind, 6 J.") – Name als Kennung
  const persons = [...system.matchAll(/^- ([^;\n]+); (?:Kind|erwachsen)/gm)].map((m) => ({ id: m[1].trim(), name: m[1].trim() }));
  const cmd = parseCalendar(latest, today, persons);
  if (!cmd) return null;
  if (cmd.kind === "create") return tools([draftInput(cmd.draft, today)]);
  if (cmd.kind === "show") return tools([cmd.days > 1 ? { name: "woche_anzeigen", input: { ab: cmd.from, tage: cmd.days, label: cmd.label } } : { name: "tag_anzeigen", input: { datum: cmd.from, label: cmd.label } }]);
  if (cmd.kind === "free") return tools([{ name: "tag_anzeigen", input: { datum: cmd.date, frei: [cmd.from, cmd.to], label: cmd.label } }]);
  // Ändern: Eintrag über den Titel finden (ungefähr)
  const known = contextEntries(system);
  const asEntries = known
    .map((k) => sanitizeEntry({ id: k.id, typ: k.typ, data: { title: k.title, date: k.date, start: k.time ?? "08:00", reminder: "aus" } }))
    .filter((e): e is CalendarEntry => e !== null);
  const hit = findByTitle(asEntries, cmd.query)[0];
  const found = hit ? known.find((k) => k.id === hit.id)! : null;
  if (!found) return text("Den Eintrag finde ich gerade nicht – wie heißt er genau? (Testmodus)");
  if (cmd.kind === "move") {
    if (found.typ === "termin") return tools([{ name: "termin_aendern", input: { id: found.id, datum: cmd.to, ...(cmd.time ? { start: cmd.time } : {}), ...(found.repeat ? { nur_am: found.date } : {}) } }]);
    return tools([{ name: "aufgabe_verschieben", input: { id: found.id, auf: cmd.to, ...(found.repeat ? { am: found.date } : {}) } }]);
  }
  if (cmd.kind === "delete") return tools([found.typ === "termin" ? { name: "termin_loeschen", input: { id: found.id } } : { name: "aufgabe_aendern", input: { id: found.id, loeschen: true } }]);
  return tools([{ name: "aufgabe_erledigen", input: { id: found.id, am: found.date } }]);
}

/** Kurze Antwort aus der gelesenen Liste (Testmodus) */
function calendarAnswer(content: string, input: Record<string, unknown>): string {
  const label = typeof input.label === "string" ? input.label : "Da";
  const cap1 = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const days = contextEntries(content.split("\n").map((l) => (l.startsWith("- ") ? l : `- ${l}`)).join("\n"));
  const open = days.filter((d) => !/erledigt/.test(d.title));
  if (Array.isArray(input.frei)) {
    const [from, to] = input.frei as string[];
    const busy = open.filter((d) => d.typ === "termin" && d.time && d.time >= from && d.time < to);
    return busy.length ? `${cap1(label)} hast du ${busy.map((b) => `${b.time!.replace(/^0/, "")} ${b.title}`).join(" und ")}. (Testmodus)` : `Ja, ${label} ist frei. (Testmodus)`;
  }
  if (!open.length) return `${cap1(label)} steht nichts an – schön ruhig. (Testmodus)`;
  const byDay = [...new Set(open.map((d) => d.date))].slice(0, 5).map((date) => {
    const items = open.filter((d) => d.date === date).map((d) => `${d.time ? `${d.time.replace(/^0/, "")} ` : ""}${d.title}`);
    const wd = new Intl.DateTimeFormat("de-DE", { weekday: "short", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`)).replace(".", "");
    return input.datum ? items.join(", ") : `${wd}: ${items.join(", ")}`;
  });
  return `${cap1(label)}: ${byDay.join(". ")}. (Testmodus)`;
}
