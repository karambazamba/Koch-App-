// Ohne KI sofort erledigt: Jetzt-Karte, Timer, Kochschritte, Sport – plus die
// rechnenden Antworten (Uhrzeit, Schleifenschutz, schnelle Ideen, Supermarkt,
// Backen), das Öffnen des Chats und der Zähler für die Chat-Vorschläge.
import { beforeEach, describe, expect, it } from "vitest";
import { dayChat } from "@/lib/begleitung/dayChat";
import { bakingAnswer, clockNow, isSameReply, marketAnswer, quickAnswer } from "@/lib/begleitung/localAnswers";
import { onOpenHelper, openHelper } from "@/lib/begleitung/open";
import { noteChatMessage } from "@/lib/begleitung/chatSuggestions";
import { loadHomeTiles } from "@/lib/core/homeLayout";
import { loadEntries } from "@/lib/kalender/store";
import { loadTimers } from "@/lib/timer/store";
import { createEmptyProfile, createPerson } from "@/lib/einstellungen/profile";
import type { AssistantData } from "@/lib/begleitung/ops";
import type { Recipe } from "@/lib/essen/cookbook";
import { at, memoryStorage } from "../helpers";

type FakeWindow = { localStorage: Storage; addEventListener: (t: string, h: (e: Event) => void) => void; removeEventListener: (t: string, h: (e: Event) => void) => void; dispatchEvent: (e: Event) => boolean };

function freshWindow(): FakeWindow {
  const handlers = new Map<string, Set<(e: Event) => void>>();
  const w: FakeWindow = {
    localStorage: memoryStorage(),
    addEventListener: (t, h) => void (handlers.get(t) ?? handlers.set(t, new Set()).get(t)!).add(h),
    removeEventListener: (t, h) => void handlers.get(t)?.delete(h),
    dispatchEvent: (e) => {
      handlers.get(e.type)?.forEach((h) => h(e));
      return true;
    },
  };
  (globalThis as { window?: unknown }).window = w;
  return w;
}

const COOK = { dish: "Pasta", recipe: "r1", steps: ["Wasser aufsetzen.", "Nudeln kochen.", "Soße rühren."] };
const ctx = { today: "2026-10-22", me: null, cooking: COOK };
const say = (text: string, c: Parameters<typeof dayChat>[1] = ctx) => dayChat(text, c);

beforeEach(() => {
  freshWindow();
  at("2026-10-22T10:00");
});

describe("Jetzt-Karte und Timer", () => {
  it("Jetzt-Karte aus und wieder an, mit Rückgängig", () => {
    const off = say("Blende die Jetzt-Karte aus")!;
    expect(off.text).toMatch(/^Erledigt ✓ Die Jetzt-Karte ist aus\./);
    expect(off.undo).toBeTypeOf("function");
    expect(say("Zeig die Jetzt-Karte wieder")!.text).toMatch(/steht wieder oben/);
  });

  it("stellt Timer, blendet die Kachel einmal ein, zeigt den Stand", () => {
    expect(say("Wie lange noch?")!.text).toBe("Gerade läuft kein Timer.");
    expect(say("Timer 10 Minuten für die Nudeln")!.text).toBe("Läuft ⏱ Nudeln – 10 Min. Der Timer steht jetzt auf der Startseite.");
    expect(loadHomeTiles().find((t) => t.id === "timer")?.visible).toBe(true);
    expect(say("Timer 5 Minuten Eier")!.text).toBe("Läuft ⏱ Eier – 5 Min.");
    expect(say("Wie lange noch?")!.text).toBe("Eier: noch 5 Minuten. Nudeln: noch 10 Minuten.");
    at("2026-10-22T10:07");
    expect(say("Wie lange noch?")!.text).toBe("Eier ist fertig. Nudeln: noch 3 Minuten.");
  });

  it("stoppen, Stoppuhr, Rückgängig nimmt den Timer zurück", () => {
    const started = say("Timer 3 Minuten Tee")!;
    expect(say("Stopp den Kuchen-Timer")!.text).toBe("Gerade läuft kein passender Timer.");
    started.undo!();
    expect(loadTimers().timers.filter((t) => t.name === "Tee")).toEqual([]);
    say("Timer 3 Minuten Tee");
    expect(say("Stopp den Tee-Timer")!.text).toBe("Gestoppt: Tee.");
    expect(say("Stoppuhr starten")!.text).toBe("Stoppuhr läuft ⏱");
    expect(say("Stoppuhr stoppen")!.text).toBe("Stoppuhr angehalten.");
  });

  it("höchstens fünf Timer gleichzeitig", () => {
    for (let i = 1; i <= 5; i++) expect(say(`Timer ${i} Minuten`)).not.toBeNull();
    expect(say("Timer 9 Minuten")!.text).toBe("Fünf Timer laufen schon – sobald einer fertig ist, geht der nächste.");
  });
});

describe("Kochen Schritt für Schritt", () => {
  it("startet, zeigt und hakt Schritte ab bis zum Ende", () => {
    expect(say("Ich fang an zu kochen")!.text).toBe("Los geht’s mit Pasta 🍳 Jetzt: Wasser aufsetzen. Die Schritte stehen in der Essen-Kachel.");
    expect(say("Was kommt jetzt?")!.text).toBe("Schritt 1 von 3: Wasser aufsetzen.");
    expect(say("Nächster Schritt")!.text).toBe("Abgehakt ✓ Jetzt Schritt 2: Nudeln kochen.");
    const second = say("Nächster Schritt")!;
    expect(second.text).toBe("Abgehakt ✓ Jetzt Schritt 3: Soße rühren.");
    second.undo!();
    expect(say("Was kommt jetzt?")!.text).toBe("Schritt 2 von 3: Nudeln kochen.");
    say("Nächster Schritt");
    expect(say("Nächster Schritt")!.text).toBe("Abgehakt ✓ Das war der letzte Schritt – guten Appetit!");
    expect(say("Nächster Schritt")!.text).toBe("Alle Schritte sind fertig – guten Appetit!");
    expect(say("Was kommt jetzt?")!.text).toBe("Alle Schritte sind fertig – guten Appetit!");
  });

  it("ohne Gericht: trotzdem loslegen, aber keine Schritte", () => {
    expect(say("Ich koche jetzt", { ...ctx, cooking: null })!.text).toBe("Los geht’s 🍳 Die Schritte stehen in der Essen-Kachel.");
    expect(say("Nächster Schritt", { ...ctx, cooking: null })).toBeNull();
  });
});

describe("Sport", () => {
  it("Ziel, Eintragen, Woche und Monat – ohne Druck", () => {
    expect(say("Wie oft war ich diese Woche beim Sport?")!.text).toBe("Diese Woche ist noch frisch – bereit, wenn du’s bist.");
    expect(say("Ich will 2× pro Woche Sport machen")!.text).toBe("Wochenziel: 2× pro Woche ✓ Die Sport-Kachel steht jetzt auf der Startseite.");
    expect(say("Ich will 3× pro Woche Sport machen")!.text).toBe("Wochenziel: 3× pro Woche ✓");
    const run = say("War heute 5 km laufen")!;
    expect(run.text).toMatch(/^Eingetragen 🏃 Laufen, 30 Min, 5 km\. /);
    expect(say("War gestern 45 Minuten schwimmen")!.text).toMatch(/^Eingetragen 🏊 Schwimmen, 45 Min\. /);
    expect(say("Wie oft war ich diese Woche beim Sport?")!.text).toBe("Diese Woche 2× – Ziel sind 3.");
    expect(say("Wie viele km bin ich diesen Monat gelaufen?")!.text).toBe("Oktober: 2 Einheiten, 1 h 15 min, 5 km.");
    expect(say("War heute 20 Minuten Yoga")!.text).toMatch(/Wochenziel geschafft\.$/);
    expect(say("Wie oft war ich diese Woche beim Sport?")!.text).toBe("Diese Woche 3× – Wochenziel geschafft 🎉");
    expect(say("War heute 30 Minuten Rad fahren")!.text).toMatch(/Bonusrunde! 🔥$/);
    expect(say("Wie oft war ich diese Woche beim Sport?")!.text).toBe("Diese Woche 4× – Bonusrunde! 🔥");
  });

  it("plant Trainings in freie Lücken, mit Erinnerung", () => {
    const r = say("Plan mir 3 Trainings nächste Woche, am liebsten morgens")!;
    expect(r.text).toBe("Eingeplant ✓ Mo 07:00 Laufen, Mi 07:00 Laufen, Fr 07:00 Laufen – mit Erinnerung 30 Min vorher. Die Sport-Kachel steht jetzt auf der Startseite.");
    const saved = loadEntries().filter((e) => e.typ === "termin");
    expect(saved).toHaveLength(3);
    expect(saved[0].data).toMatchObject({ label: "Sport", reminder: "30", start: "07:00" });
    r.undo!();
    expect(loadEntries()).toEqual([]);
  });

  it("weicht Regen aus (Wetter aus dem Speicher)", () => {
    const hours = Array.from({ length: 17 }, (_, i) => ({ date: "2026-10-26", hour: 6 + i, temp: 9, code: i < 4 ? 61 : 1, rain: i < 4 ? 90 : 0, gust: 10, mm: i < 4 ? 2 : 0, sun: 0, cloud: 80 }));
    const w = (globalThis as unknown as { window: FakeWindow }).window;
    w.localStorage.setItem("wasgibts.wetterdaten", JSON.stringify({ version: 1, forecast: { place: "Eutin", hours, days: [], current: { temp: 9, code: 61 } } }));
    const r = say("Plan mir 3 Trainings nächste Woche, am liebsten morgens", { ...ctx, me: "felix" })!;
    expect(r.text).toMatch(/^Eingeplant ✓ Mo /);
    expect(r.text).toMatch(/regnet es\.|drinnen\./);
    expect(loadEntries()[0].data).toMatchObject({ who: ["felix"] });
  });

  it("andere Sätze gehören nicht hierher", () => {
    expect(say("Hallo")).toBeNull();
    expect(say("Milch auf die Liste")).toBeNull();
  });
});

describe("Rechnende Antworten ohne KI", () => {
  const recipe = (id: string, title: string, extra: Partial<Recipe> = {}): Recipe => ({ id, title, prepMinutes: 15, thumbsUp: 0, ingredients: [], steps: [], ...extra }) as unknown as Recipe;
  const data = (recipes: Recipe[] = [], persons = [createPerson("erwachsen"), createPerson("kind")]): AssistantData => ({
    profile: { ...createEmptyProfile(), persons },
    weekPlans: {},
    mealPlans: {},
    recipes: Object.fromEntries(recipes.map((r) => [r.id, r])),
    shopping: {},
  });

  it("Uhrzeit und Schleifenschutz", () => {
    at("2026-10-22T07:05");
    expect(clockNow()).toBe("07:05");
    expect(isSameReply("Gern! Ich hab’s.", "gern ich hab s")).toBe(true);
    expect(isSameReply(undefined, "")).toBe(false);
    expect(isSameReply("Eins", "Zwei")).toBe(false);
  });

  it("drei schnelle Ideen", () => {
    expect(quickAnswer(null)).toBeNull();
    const answer = quickAnswer(data([recipe("r1", "Rührei", { prepMinutes: 10 })]))!;
    expect(answer).toMatch(/^Drei schnelle Ideen unter 20 Minuten: Rührei, .+ oder .+\.$/);
  });

  it("Supermarkt: Ideen zum Angebot und ein passender Tag", () => {
    expect(marketAnswer("Lachs ist im Angebot", null, undefined, [], [], false)).toBeNull();
    expect(marketAnswer("Wie wird das Wetter?", data(), new Date("2026-10-22T12:00:00"), [], [], false)).toBeNull();
    at("2026-10-22T10:00");
    const r = marketAnswer("Lachs ist im Angebot", data(), new Date("2026-10-22T12:00:00"), [], [{ name: "Reis" }, { name: "Dill", checked: true }], false)!;
    expect(r.text).toBe("Lachs? Damit geht z. B.:");
    expect(r.market.product).toBe("Lachs");
    expect(r.market.ideas.length).toBeGreaterThan(0);
    expect(r.market.target).not.toBeNull();
    const spontan = marketAnswer("Lachs ist im Angebot", data(), new Date("2026-10-22T12:00:00"), [], [], true)!;
    expect(spontan.market.target).toMatchObject({ date: "2026-10-22", label: "Heute kochen" });
    at("2026-10-22T21:00");
    expect(marketAnswer("Lachs ist im Angebot", data(), new Date("2026-10-22T12:00:00"), [], [], true)!.market.target).toBeNull();
  });

  it("Backwunsch: eigenes Rezept zuerst, mit Kindern zusammen", () => {
    expect(bakingAnswer("Lass uns backen", null)).toBeNull();
    expect(bakingAnswer("Was gibt’s heute?", data())).toBeNull();
    const own = recipe("o1", "Omas Apfelkuchen", { kind: "backen" } as Partial<Recipe>);
    const r = bakingAnswer("Können wir mit den Kindern einen Apfelkuchen backen?", data([own]))!;
    expect(r.text).toBe("Oh ja, backen wir zusammen! 🧁 Das klappt gut mit Kindern:");
    expect(r.baking[0].title).toBe("Omas Apfelkuchen");
    expect(r.baking.length).toBeLessThanOrEqual(3);
    const adults = bakingAnswer("Wir wollen Muffins backen", data([], [createPerson("erwachsen")]))!;
    expect(adults.text).toBe("Gern! 🧁 Wie wär’s damit:");
  });
});

describe("Chat öffnen und Vorschläge zählen", () => {
  it("wartet auf den ersten Zuhörer und schickt danach direkt", () => {
    const got: unknown[][] = [];
    openHelper("spontan", "Was ist noch da?", ["reste"]);
    const stop = onOpenHelper((...args) => got.push(args));
    expect(got).toEqual([["spontan", "Was ist noch da?", ["reste"]]]);
    openHelper("voice");
    expect(got[1]).toEqual(["voice", undefined, undefined]);
    stop();
    openHelper();
    const later: unknown[][] = [];
    const stop2 = onOpenHelper((...args) => later.push(args));
    expect(later).toEqual([[undefined, undefined, undefined]]);
    stop2();
  });

  it("zählt eigene Nachrichten bis zur Grenze", () => {
    for (let i = 0; i < 12; i++) noteChatMessage();
    const w = (globalThis as unknown as { window: FakeWindow }).window;
    expect(JSON.parse(w.localStorage.getItem("wasgibts.chatnutzung")!)).toEqual({ version: 1, messages: 10 });
    w.localStorage.setItem("wasgibts.chatnutzung", JSON.stringify({ version: 2 }));
    noteChatMessage();
    expect(JSON.parse(w.localStorage.getItem("wasgibts.chatnutzung")!).messages).toBe(1);
  });
});
