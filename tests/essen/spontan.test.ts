// Spontan kochen, Pause per Chat, Ausflugs-Snacks und schnelle Ideen (ohne KI)
import { describe, expect, it } from "vitest";
import {
  filtersFromText,
  isIdeaFilterRequest,
  isQuickRequest,
  isSnackRequest,
  parsePauseRequest,
  pauseLabel,
  perishables,
  quickIdeas,
  snackReply,
  spontanIdeas,
} from "@/lib/essen/spontan";
import { buch, rezept, vorrat } from "./hilfen";

// Donnerstag, 22.10.2026
const DO = new Date(2026, 9, 22, 12);
const MO = new Date(2026, 9, 26, 12);

describe("Pause per Chat", () => {
  it("erkennt Urlaub ab Freitag für eine Woche", () => {
    expect(parsePauseRequest("Wir sind ab Freitag eine Woche im Urlaub", DO)).toEqual({ kind: "start", pause: { from: "2026-10-23", until: "2026-10-29" } });
  });

  it("„Ab Montag“ an einem Montag ist die nächste Woche", () => {
    const r = parsePauseRequest("Ab Montag sind wir 3 Tage verreist", MO);
    expect(r).toEqual({ kind: "start", pause: { from: "2026-11-02", until: "2026-11-04" } });
  });

  it("Datum mit „ab“ und „bis“", () => {
    expect(parsePauseRequest("Wir sind im Urlaub ab dem 1.11. bis zum 8.11.", DO)).toEqual({ kind: "start", pause: { from: "2026-11-01", until: "2026-11-08" } });
    // Datum ohne Jahr, das schon vorbei ist → nächstes Jahr
    const r = parsePauseRequest("Ferien ab 2.1. zwei Wochen", DO);
    expect(r).toEqual({ kind: "start", pause: { from: "2027-01-02", until: "2027-01-15" } });
    // Mit Jahr (zweistellig)
    expect(parsePauseRequest("Urlaub bis 30.10.26", DO)).toEqual({ kind: "start", pause: { from: "2026-10-22", until: "2026-10-30" } });
  });

  it("morgen, übermorgen und bis Wochentag", () => {
    expect(parsePauseRequest("Ab morgen Urlaub bis Sonntag", DO)).toEqual({ kind: "start", pause: { from: "2026-10-23", until: "2026-10-25" } });
    // Ohne Dauer: offenes Ende
    expect(parsePauseRequest("Wir sind verreist, die ganze Woche", DO)).toEqual({ kind: "start", pause: { from: "2026-10-22", until: null } });
    const offen = parsePauseRequest("Wir machen ab Montag eine Pause", DO);
    expect(offen).toEqual({ kind: "start", pause: { from: "2026-10-26", until: null } });
  });

  it("„ab übermorgen“ beginnt übermorgen, nicht morgen (Fehler: „morgen“ passte zuerst)", () => {
    expect(parsePauseRequest("Wir sind ab übermorgen eine Woche im Urlaub", DO)).toEqual({ kind: "start", pause: { from: "2026-10-24", until: "2026-10-30" } });
  });

  it("übers Wochenende weg = Samstag und Sonntag", () => {
    expect(parsePauseRequest("Wir fahren übers Wochenende weg", DO)).toEqual({ kind: "start", pause: { from: "2026-10-24", until: "2026-10-25" } });
  });

  it("Zahlwort als Dauer", () => {
    expect(parsePauseRequest("Wir sind drei Tage im Urlaub", DO)).toEqual({ kind: "start", pause: { from: "2026-10-22", until: "2026-10-24" } });
  });

  it("„Wir sind wieder da“ beendet die Pause", () => {
    expect(parsePauseRequest("Wir sind wieder da!", DO)).toEqual({ kind: "end" });
    expect(parsePauseRequest("Pause beenden", DO)).toEqual({ kind: "end" });
  });

  it("keine Pause bei „nur zu zweit“, bloßem „Pause“ oder ohne Zeitangabe", () => {
    expect(parsePauseRequest("Heute sind wir nur zu zweit", DO)).toBeNull();
    expect(parsePauseRequest("Pause", DO)).toBeNull();
    expect(parsePauseRequest("Wir lieben Urlaub", DO)).toBeNull();
    expect(parsePauseRequest("Die Kinder sind nicht da", DO)).toBeNull();
    expect(parsePauseRequest("Für 2 Personen im Urlaub ab morgen", DO)).toBeNull();
  });

  it("Ende vor dem Beginn wird ignoriert", () => {
    const r = parsePauseRequest("Ab dem 10.11. Urlaub bis zum 5.11.", DO);
    expect(r).toEqual({ kind: "start", pause: { from: "2026-11-10", until: null } });
  });

  it("Beschriftung mit und ohne Ende", () => {
    expect(pauseLabel({ from: "2026-10-23", until: "2026-10-29" })).toBe("von Fr., 23.10. bis Do., 29.10.");
    expect(pauseLabel({ from: "2026-10-23", until: null })).toBe("ab Fr., 23.10.");
  });
});

describe("Ausflugs-Snacks", () => {
  it("erkennt die Frage", () => {
    expect(isSnackRequest("Wir fahren spontan los, was nehmen wir mit?")).toBe(true);
    expect(isSnackRequest("Snacks für den Ausflug?")).toBe(true);
    expect(isSnackRequest("Was gibt's heute?")).toBe(false);
  });

  it("nimmt Passendes aus dem Vorrat, sonst ein freundlicher Satz", () => {
    const text = snackReply([vorrat("Äpfel"), vorrat("Hackfleisch"), vorrat("Käse"), vorrat("Brezeln")]);
    expect(text).toContain("Äpfel");
    expect(text).toContain("Käse");
    expect(text).not.toContain("Hackfleisch");
    expect(snackReply([vorrat("Hackfleisch")])).toMatch(/nichts Passendes.*gute Fahrt/i);
  });
});

describe("Schnelle Ideen", () => {
  it("erkennt die Frage", () => {
    expect(isQuickRequest("Wir kommen erst um 19 Uhr heim")).toBe(true);
    expect(isQuickRequest("Heute was Schnelles bitte")).toBe(true);
    expect(isQuickRequest("Was gibt's morgen?")).toBe(false);
  });

  it("Kochbuch zuerst (beliebt, dann schnell), dann Klassiker, ohne Doppelte und ohne „Nie wieder“", () => {
    const recipes = buch(
      rezept("Lasagne", [], { prepMinutes: 60 }),
      rezept("Rührei mit Brot", [], { prepMinutes: 10 }),
      rezept("Wraps", [], { prepMinutes: 15, thumbsUp: 3 }),
      rezept("Ohne Zeit", [], { prepMinutes: null }),
    );
    expect(quickIdeas(recipes, [])).toEqual(["Wraps", "Rührei mit Brot", "Nudeln mit Pesto"]);
    expect(quickIdeas({}, [{ id: "n", title: "Nudeln mit Pesto" } as never])).toEqual(["Rührei mit Brot", "Wraps mit Gemüse", "Ofen-Baguette"]);
  });

  it("Verderbliches vor der Pause", () => {
    expect(perishables([vorrat("Milch"), vorrat("Reis", "schrank"), vorrat("Äpfel"), vorrat("Hackfleisch"), vorrat("Brot"), vorrat("Joghurt")])).toEqual([
      "Milch",
      "Äpfel",
      "Hackfleisch",
      "Brot",
    ]);
  });
});

describe("Spontan-Ideen aus dem Vorrat", () => {
  it("leerer Vorrat → Gerichte mit Grundzutaten, schnellste zuerst, nie leer", () => {
    const ideas = spontanIdeas({}, [vorrat("Salz", "schrank")], [], []);
    expect(ideas).toHaveLength(3);
    expect(ideas[0].title).toBe("Rührei mit Brot");
    expect(ideas.every((i) => i.uses.length === 0)).toBe(true);
    expect(ideas[0].extra).toEqual(["Eier", "Brot"]);
  });

  it("nutzt den Vorrat, Kochbuch und Fertigprodukte; Backrezepte nicht", () => {
    const recipes = buch(
      rezept("Hack-Nudeln", ["Hackfleisch", "Nudeln", "Salz"], { id: "hn", prepMinutes: 30 }),
      rezept("Hackkuchen", ["Hackfleisch", "Nudeln"], { id: "hk", kind: "backen" }),
    );
    const pantry = [vorrat("Hackfleisch"), vorrat("Nudeln", "schrank"), vorrat("Tiefkühlpizza", "tiefkuehler")];
    const ideas = spontanIdeas(recipes, pantry, [], []);
    expect(ideas.map((i) => i.id)).toContain("hn");
    expect(ideas.map((i) => i.id)).not.toContain("hk");
    const pizza = ideas.find((i) => i.id === "f:Tiefkühlpizza");
    expect(pizza).toMatchObject({ minutes: 15, uses: ["Tiefkühlpizza"], extra: [] });
    // Angezeigt: schnellste zuerst
    const minutes = ideas.map((i) => i.minutes ?? 999);
    expect([...minutes].sort((a, b) => a - b)).toEqual(minutes);
    const hn = ideas.find((i) => i.id === "hn")!;
    expect(hn.uses.sort()).toEqual(["Hackfleisch", "Nudeln"]);
    expect(hn.extra).toEqual([]);
  });

  it("„Andere Ideen“ zeigt keine schon gezeigten", () => {
    const pantry = [vorrat("Eier"), vorrat("Milch"), vorrat("Kartoffeln", "schrank"), vorrat("Brot")];
    const first = spontanIdeas({}, pantry, [], []);
    const more = spontanIdeas({}, pantry, [], [], first.map((i) => i.id));
    expect(more.length).toBeGreaterThan(0);
    expect(more.some((i) => first.some((f) => f.id === i.id))).toBe(false);
  });

  it("⚡ nur bis 20 Minuten, Basis-Filter und Reste zuerst", () => {
    const pantry = [vorrat("Eier"), vorrat("Nudeln", "schrank"), vorrat("Pesto", "schrank"), vorrat("Kartoffeln", "schrank"), vorrat("Brot")];
    const fast = spontanIdeas({}, pantry, ["schnell"], []);
    expect(fast.every((i) => i.minutes !== null && i.minutes <= 20)).toBe(true);
    const nudeln = spontanIdeas({}, pantry, ["basis:nudeln"], []);
    expect(nudeln.length).toBeGreaterThan(0);
    expect(nudeln.every((i) => /nudel/i.test(i.title))).toBe(true);
    const reste = spontanIdeas({}, pantry, ["reste"], []);
    // Reste zuerst: Reihenfolge nach genutzten Vorrats-Zutaten
    expect(reste[0].uses.length).toBeGreaterThanOrEqual(reste[reste.length - 1].uses.length);
  });

  it("mit „1 Sache darf auf die Liste“ sind Ideen mit einer Kleinigkeit erlaubt", () => {
    const pantry = [vorrat("Zucchini")];
    const strict = spontanIdeas({}, pantry, [], []);
    expect(strict.length).toBeGreaterThan(0);
    const ok = spontanIdeas({}, pantry, ["einkauf"], []);
    expect(ok.every((i) => i.uses.includes("Zucchini"))).toBe(true);
    expect(ok.some((i) => i.extra.length === 1)).toBe(true);
  });

  it("nie ohne Ideen: passt nichts, kommen Gerichte mit mehr Einkauf", () => {
    const recipes = buch(rezept("Sushi", ["Reis", "Lachs", "Nori", "Gurke"], { id: "su" }));
    const ideas = spontanIdeas(recipes, [vorrat("Drachenfrucht")], [], []);
    expect(ideas.length).toBe(3);
    expect(ideas.every((i) => i.uses.length === 0)).toBe(true);
  });

  it("„Nie wieder“ wird nie vorgeschlagen", () => {
    const pantry = [vorrat("Eier"), vorrat("Brot")];
    const ideas = spontanIdeas({}, pantry, [], [{ id: "x", title: "Rührei mit Brot" } as never]);
    expect(ideas.some((i) => i.title === "Rührei mit Brot")).toBe(false);
  });
});

describe("Filter aus dem Gesagten", () => {
  it("erkennt Tempo, Reste, Einkauf und Basen", () => {
    expect(filtersFromText("Was Schnelles mit Nudeln")).toEqual(["schnell", "basis:nudeln"]);
    expect(filtersFromText("Reste verwerten, darf was fehlen")).toEqual(["reste", "einkauf"]);
    expect(filtersFromText("Kartoffeln, Reis, Brot oder Salat")).toEqual(["basis:kartoffeln", "basis:reis", "basis:brot", "basis:salat"]);
    expect(filtersFromText("Hallo")).toEqual([]);
  });

  it("klingt wie ein Ideen-Wunsch – aber nicht bei Liste, Plan oder Wochentag", () => {
    expect(isIdeaFilterRequest("Was Schnelles mit Nudeln")).toBe(true);
    expect(isIdeaFilterRequest("Lieber was mit Reis")).toBe(true);
    expect(isIdeaFilterRequest("Nudeln auf die Liste")).toBe(false);
    expect(isIdeaFilterRequest("Was mit Reis am Montag")).toBe(false);
    expect(isIdeaFilterRequest("Was Lustiges")).toBe(false);
  });
});
