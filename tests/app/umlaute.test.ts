import { describe, expect, it } from "vitest";
import { guessLabel } from "@/lib/kalender/parse";
import { sectionFor } from "@/lib/einkauf/sections";
import { placeFor } from "@/lib/vorrat/pantry";
import { tidySchnellnotiz } from "@/lib/notizen/schnellnotiz";
import { extractDietItems } from "@/lib/einstellungen/onboarding/recognize";
import { GERICHT_TIPS } from "@/lib/essen/tips/data/gericht";
import { dishArt } from "@/lib/essen/dishArt";

// In JavaScript-Regex sind ä, ö, ü und ß keine Wortzeichen: `\bübermorgen`
// oder `grieß\b` treffen nie. Beim Aufräumen (Etappe 6) fiel das an vielen
// Stellen auf – hier die Fälle, die nicht schon in ihrem Bereich getestet sind.
describe("Fehler: Wortgrenzen an Umlauten", () => {
  it("„Ärztin“ bekommt das Etikett Arzt", () => {
    expect(guessLabel("Ärztin Dr. Meier")).toBe("Arzt");
    expect(guessLabel("Zahnärztin")).toBe("Arzt");
  });

  it("„Miete überweisen“ wird beim Aufräumen der Schnellnotiz eine Aufgabe", () => {
    expect(tidySchnellnotiz("Miete überweisen", "2026-10-22")[0].kind).toBe("aufgabe");
  });

  it("„überhaupt“ wird aus „mag nicht“ herausgenommen", () => {
    const items = extractDietItems("Lisa mag überhaupt keine Pilze", ["Lisa"]);
    expect(items.map((i) => i.term)).toEqual(["Pilze"]);
  });

  it("Tipp zum Grieß greift auch beim Wort „Grieß“ allein", () => {
    const tip = GERICHT_TIPS.find((t) => t.title === "Kniff für Grießbrei")!;
    expect(tip.match!.test("Grieß mit Zimt")).toBe(true);
  });
});

describe("Fehler: Einordnen von Zutaten", () => {
  it("Apfelsaft ist ein Getränk (nicht Obst) und kommt in den Schrank", () => {
    expect(sectionFor("Apfelsaft")).toBe("getraenke");
    expect(sectionFor("Zitronensaft")).toBe("vorrat");
    expect(sectionFor("Äpfel")).toBe("obst-gemuese");
    expect(placeFor("Apfelsaft")).toBe("schrank");
  });

  it("„Erbsen TK“ kommt in den Tiefkühler", () => {
    expect(placeFor("Erbsen TK")).toBe("tiefkuehler");
    expect(placeFor("TK-Spinat")).toBe("tiefkuehler");
    expect(placeFor("Erbsen")).not.toBe("tiefkuehler");
  });

  it("Seelachs wird nicht als Lachs gezeichnet", () => {
    expect(dishArt("Seelachs mit Kartoffeln").variant).not.toBe("lachs");
    expect(dishArt("Lachs mit Reis").variant).toBe("lachs");
  });
});
