// Küchenhelfer – Mock-Modus (KUECHENHELFER_MOCK=1): ein Schein-Modell mit
// Beispielantworten. Es ruft dieselben Werkzeuge auf wie Claude, damit
// Oberfläche, Werkzeuge und Vorschau ohne API-Schlüssel testbar sind.
// Versteht nur einfache Sätze – z. B. "Donnerstag und Freitag gibt es meine
// Rezepte, Mattis wünscht sich Sonntag Milchreis, der Rest vegetarische KI-Rezepte".

import type Anthropic from "@anthropic-ai/sdk";
import { WEEKDAYS } from "../profile";
import type { CreateMessage } from "./engine";

type ToolUse = { name: string; input: Record<string, unknown>; id?: string };
type WeekResult = { tage: { tag: string; ausflug?: boolean; gericht?: string | null }[] };
type CookbookResult = { rezepte: { rezept_id: string; titel: string }[] };

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
  return list ? list.split(", ") : [];
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
    clear: /(leer|lösch|streich)/i.test(intent) ? daysIn(intent) : [],
    double: /(doppelt|reste für morgen)/i.test(intent) ? daysIn(intent) : [],
    swap: /(tausch|verschieb)/i.test(intent) ? daysIn(intent) : [],
    shopping:
      intent.match(/(?:setz|pack|schreib)\w*\s+(.+?)\s+auf die einkaufsliste/i)?.[1] ??
      intent.match(/einkaufsliste\s*:\s*(.+)$/i)?.[1] ??
      null,
  };
}

const parse = <T,>(s: unknown): T | null => {
  try {
    return typeof s === "string" ? (JSON.parse(s) as T) : null;
  } catch {
    return null;
  }
};

export function createMockModel(): CreateMessage {
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
      if (intent.myDays.length > 0 && intent.named.length < intent.myDays.length) {
        const choice = intent.titles.slice(0, 6).join(", ");
        return text(
          `Gern! Welche deiner Rezepte soll es am ${intent.myDays.join(" und am ")} geben?${choice ? ` Zur Auswahl hast du zum Beispiel: ${choice}.` : " Im Kochbuch ist noch nichts – sag mir einfach die Gerichte."}`,
        );
      }
      const actionable =
        intent.myDays.length || intent.wish || intent.restVeggie || intent.clear.length || intent.double.length || intent.swap.length >= 2 || intent.shopping;
      if (!actionable) {
        return text("Ich bin der Küchenhelfer (Testmodus). Sag zum Beispiel: „Donnerstag und Freitag gibt es meine Rezepte, Mattis wünscht sich Sonntag Milchreis, der Rest vegetarische KI-Rezepte.“");
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
      return uses.length ? tools(uses) : text("Ich habe nichts gefunden, was ich ändern könnte – sag mir gern genauer, was du möchtest.");
    }

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
    return text(
      ok > 0
        ? "Ich habe dir einen Vorschlag gemacht (Testmodus). Schau ihn dir unten an – du kannst einzelne Punkte abwählen und dann übernehmen."
        : "Das hat leider nicht geklappt. Magst du es anders formulieren?",
    );
  };
}
