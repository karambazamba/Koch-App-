import { describe, expect, it } from "vitest";
import { knownShop, shopModeRequest } from "@/lib/einkauf/shopMode";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { jetztInput } from "../helpers";

const SHOPS = ["Aldi", "Lidl", "Edeka", "Rewe", "Rossmann", "dm", "Wochenmarkt", "Bäcker", "Hofladen"];

describe("„Ich bin bei REWE“ erkennen (ohne KI)", () => {
  it("bekannte Läden, Groß/klein egal, Schreibweise der Familie", () => {
    expect(shopModeRequest("Ich bin bei REWE", SHOPS)).toBe("Rewe");
    expect(shopModeRequest("Ich bin jetzt im Edeka.", SHOPS)).toBe("Edeka");
    expect(shopModeRequest("Wir sind beim Hofladen", SHOPS)).toBe("Hofladen");
    expect(shopModeRequest("Ich geh zu Lidl einkaufen", SHOPS)).toBe("Lidl");
    expect(shopModeRequest("Einkaufsmodus Rossmann", SHOPS)).toBe("Rossmann");
  });

  it("keine Verwechslung mit der Supermarkt-Frage oder anderen Sätzen", () => {
    expect(shopModeRequest("Ich steh im REWE, Hack ist im Angebot – was kann ich machen?", SHOPS)).toBeNull();
    expect(shopModeRequest("Ich bin bei Oma", SHOPS)).toBeNull();
    expect(shopModeRequest("Ich bin bei REWE und hier gibt's Spargel", SHOPS)).toBeNull();
  });

  it("knownShop mit Artikel davor", () => {
    expect(knownShop("dem Rewe", SHOPS)).toBe("Rewe");
    expect(knownShop("Unbekannt", SHOPS)).toBeNull();
  });
});

describe("Jetzt-Karte (A-054): kein „Auf dem Heimweg?“ mehr", () => {
  it("die Einkaufsliste allein füllt die Karte nicht – nur Zutaten fürs Gericht von heute", () => {
    expect(jetztTopics(jetztInput(16 * 60 + 40))).toEqual([]);
    const dish = { name: "Pad Thai", clock: "18:30", minutes: 30, ready: false, missing: ["Eier"], liste: ["Eier"] };
    expect(jetztTopics(jetztInput(16 * 60 + 40, { dish }))[0]?.aktion?.label).toBe("Auf die Liste: Eier");
  });
});
