// Weniger Mia + „Dein Tag“ (Tafel 66 B, 67, 68): Themen-Symbol statt Gesicht
// (je Thema genau eins), Jetzt-Karte ohne Knopf, höchstens 3 Themen, Antippen
// öffnet „Dein Tag“ mit dem Thema hervorgehoben, Abschnitte in fester
// Reihenfolge, Termine nach Uhrzeit mit „Jetzt“-Linie, Arbeit nur für den
// Besitzer, Mia fasst den Tag in 2 Sätzen zusammen, Mia-Knopf macht Platz.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { aufgabe, fakeWindow, jetztInput, jetztTermin, termin } from "../helpers";
import { daySummary, isDayQuestion, openDeinTag, onOpenDeinTag, terminRows, topicIcon, topicSpot } from "@/lib/heute/deinTag";
import { jetztTopics, type JetztKind } from "@/lib/heute/jetztTopics";
import { itemsForDay } from "@/lib/kalender/model";
import { knopfAway, REST_MS } from "@/lib/begleitung/knopfScroll";

const TODAY = "2026-10-21";
const day = (entries: Parameters<typeof itemsForDay>[0]) => itemsForDay(entries, TODAY, TODAY);

describe("Themen-Symbol statt Mias Gesicht", () => {
  it.each<[JetztKind, string]>([
    ["wetter", "Umbrella"],
    ["gleich", "CalendarDays"],
    ["geburtstag", "CalendarDays"],
    ["vorbereiten", "ListChecks"],
    ["packliste", "ListChecks"],
    ["aufgabe", "ListChecks"],
    ["einkauf", "ShoppingCart"],
    ["kochstart", "CookingPot"],
    ["kochen", "CookingPot"],
    ["ideen", "CookingPot"],
    ["pinnwand", "MessageCircle"],
    ["absprache", "MessageCircle"],
    ["timer", "Timer"],
    ["ausblick", "Sunrise"],
    ["tipp", "Sparkles"],
    ["ruhig", "Sparkles"],
  ])("%s → %s", (kind, icon) => {
    expect(topicIcon(kind)).toBe(icon);
  });

  it("Jetzt-Karte: kein BegleitungAvatar, kein eigener Knopf, 46-px-Kreis, nie mitten im Wort", () => {
    const src = readFileSync("src/components/heute/JetztCard.tsx", "utf8");
    expect(src).not.toMatch(/BegleitungAvatar/);
    expect(src).not.toMatch(/topic\.button|onDone/);
    expect(src).toMatch(/h-\[46px\] w-\[46px\][^"]*rounded-full bg-surface text-accent/);
    expect(src).toMatch(/Dein Tag öffnen/);
    expect(src.match(/<button/g)).toHaveLength(1);
    // Wischen 1 → 3 und nicht weiter
    expect(src).toMatch(/if \(to < 0 \|\| to >= shown\.length\) return;/);
  });

  it("Startseite: genau zwei Mias – Logo (nicht antippbar) und der Knopf", () => {
    const brand = readFileSync("src/components/ui/BrandMark.tsx", "utf8");
    expect(brand).toMatch(/role="img"/);
    expect(brand).not.toMatch(/onClick/);
    for (const f of ["src/components/heute/TodayPage.tsx", "src/components/heute/JetztCard.tsx", "src/components/pinnwand/PinboardTile.tsx"]) expect(readFileSync(f, "utf8"), f).not.toMatch(/<BegleitungAvatar/);
  });
});

describe("Höchstens 3 Themen, nichts doppelt zu den Kacheln", () => {
  it("Termin ohne Tipp steht nur in der Kachel; mit Ort/Notiz darf er auf die Karte", () => {
    const plain = jetztTopics(jetztInput(9 * 60 + 50, { upcoming: [jetztTermin("Zahnarzt", "10:00")] }));
    expect(plain.some((t) => t.kind === "gleich")).toBe(false);
    const withTip = jetztTopics(jetztInput(9 * 60 + 50, { upcoming: [jetztTermin("Zahnarzt", "10:00", { place: "Praxis Lindenstraße" })] }));
    expect(withTip.some((t) => t.kind === "gleich")).toBe(true);
  });

  it("die Karte zeigt nie mehr als 3", () => {
    const src = readFileSync("src/components/heute/JetztCard.tsx", "utf8");
    expect(src).toMatch(/const MAX_TOPICS = 3;/);
  });
});

describe("Wohin ein Thema auf „Dein Tag“ gehört", () => {
  it("Abschnitt und Eintrag aus der Themen-ID", () => {
    expect(topicSpot({ id: "gleich:abc@2026-10-21", kind: "gleich" })).toEqual({ section: "termine", key: "abc@2026-10-21" });
    expect(topicSpot({ id: "kochstart:2026-10-21", kind: "kochstart" })).toEqual({ section: "essen", key: null });
    expect(topicSpot({ id: "pinnwand:n1", kind: "pinnwand" })).toEqual({ section: "pinnwand", key: "n1" });
    expect(topicSpot({ id: "aufgabe:k1", kind: "aufgabe" })).toEqual({ section: "aufgaben", key: "k1" });
    expect(topicSpot({ id: "tipp", kind: "tipp" })).toBeNull();
  });

  it("Abschnitte in fester Reihenfolge: Termine → Essen → Pinnwand → Aufgaben, Thema hervorgehoben", () => {
    const src = readFileSync("src/components/heute/DeinTag.tsx", "utf8");
    const at = (s: string) => src.indexOf(`<Section id="${s}"`);
    expect(at("termine")).toBeGreaterThan(0);
    expect(at("termine")).toBeLessThan(at("essen"));
    expect(at("essen")).toBeLessThan(at("pinnwand"));
    expect(at("pinnwand")).toBeLessThan(at("aufgaben"));
    expect(src).toMatch(/scrollIntoView/);
    expect(src).toContain("Heute ist nichts geplant. Genieß es.");
  });
});

describe("Termine nach Uhrzeit mit „Jetzt“-Linie", () => {
  const items = () => day([termin({ title: "Kita", date: TODAY, start: "08:00" }), termin({ title: "Turnen", date: TODAY, start: "16:00" }), termin({ title: "Zahnarzt", date: TODAY, start: "10:00", end: "11:00" }), aufgabe({ title: "Steuer", date: TODAY })]);

  it("sortiert, Vorbei grau, Linie vor dem nächsten", () => {
    const { rows, nowAt } = terminRows(items(), 10 * 60 + 30);
    expect(rows.map((r) => r.item.title)).toEqual(["Kita", "Zahnarzt", "Turnen"]);
    expect(rows.map((r) => r.past)).toEqual([true, false, false]);
    expect(nowAt).toBe(1);
  });

  it("abends alles vorbei → Linie am Ende; nur Termine (keine Aufgaben)", () => {
    const { rows, nowAt } = terminRows(items(), 20 * 60);
    expect(rows.every((r) => r.past)).toBe(true);
    expect(nowAt).toBe(3);
  });

  it("„Arbeit“ sieht nur der Besitzer: fremde Arbeit kommt nie aufs Gerät (RLS), eigene trägt „Nur für dich“", () => {
    const src = readFileSync("src/components/heute/DeinTag.tsx", "utf8");
    expect(src).toMatch(/r\.item\.room === "arbeit"[^\n]*Nur für dich/);
    const server = readFileSync("src/lib/konten/testServer.ts", "utf8");
    expect(server).toMatch(/raum === "arbeit" && old\.besitzer !== user\.id/);
  });
});

describe("Mia: „Was steht heute an?“", () => {
  it.each(["Was steht heute an?", "Was steht heute noch an", "Wie sieht mein Tag aus?", "Wie sieht mein Tag heute aus?", "Was hab ich heute vor?", "Mein Tag"])("„%s“ öffnet „Dein Tag“", (q) => {
    expect(isDayQuestion(q)).toBe(true);
  });

  it("fremde Sätze bleiben fremd", () => {
    expect(isDayQuestion("Was steht heute in der Zeitung?")).toBe(false);
    expect(isDayQuestion("Trag mein Tagebuch ein")).toBe(false);
  });

  it("höchstens 2 Sätze, ohne Druck-Wörter", () => {
    const termine = day([termin({ title: "Turnen", date: TODAY, start: "16:00" })]);
    const tasks = day([aufgabe({ title: "Steuer", date: TODAY })]);
    const s = daySummary({ termine, tasks, dish: "Gemüsepfanne", minutes: 9 * 60 });
    expect(s).toBe("Heute kommt 16:00 Turnen. Zum Essen gibt’s Gemüsepfanne, dazu „Steuer“.");
    expect(daySummary({ termine: [], tasks: [], dish: null, minutes: 9 * 60 })).toBe("Heute stehen keine Termine mehr an. Sonst ist alles ruhig.");
    expect(s.split(/[.!?](\s|$)/).filter((x) => x.trim()).length).toBeLessThanOrEqual(2);
  });

  it("öffnen vor dem Zuhören geht nicht verloren", () => {
    fakeWindow();
    const seen: (string | null)[] = [];
    openDeinTag("gleich:x");
    const off = onOpenDeinTag((t) => seen.push(t));
    expect(seen).toEqual(["gleich:x"]);
    off();
  });

  it("keine Willkommens-Nachricht von Mia in der Pinnwand", () => {
    for (const f of ["src/lib/pinnwand/model.ts", "src/components/pinnwand/PinboardView.tsx"]) {
      expect(readFileSync(f, "utf8"), f).not.toMatch(/Willkommen|Hallo, ich bin/);
    }
  });
});

describe("Mia-Knopf macht beim Scrollen Platz", () => {
  it("runter = weg, hoch = da, oben immer da", () => {
    expect(knopfAway(false, 200, 260)).toBe(true);
    expect(knopfAway(true, 260, 200)).toBe(false);
    expect(knopfAway(true, 260, 262)).toBe(true);
    expect(knopfAway(true, 120, 40)).toBe(false);
    expect(knopfAway(false, 0, 60)).toBe(false);
    expect(REST_MS).toBe(600);
  });

  it("nur transform/opacity, kommt nach Ruhe zurück", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.mia-knopf-gleiten\[data-weg\] \{ transform: translateY\(140%\); opacity: 0; \}/);
    const src = readFileSync("src/components/begleitung/MiaButton.tsx", "utf8");
    expect(src).toMatch(/setTimeout\(\(\) => setAway\(false\), REST_MS\)/);
  });
});
