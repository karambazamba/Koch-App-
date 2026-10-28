import { describe, expect, it } from "vitest";
import { knownShop, shopModeRequest } from "@/lib/einkauf/shopMode";
import { jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";
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

describe("Jetzt-Karte „Auf dem Heimweg?“ öffnet die Laden-Seite (unterwegs)", () => {
  it("echte Liste → /einkaufsliste/laden?name=…&unterwegs=1, Beispiel-Tag → Einkaufsliste", () => {
    const shop = { shop: "REWE", names: ["Milch", "Brot", "Butter"] };
    const find = (x: JetztInput) => jetztTopics(x).find((t) => t.kind === "einkauf");
    const real = find(jetztInput(16 * 60 + 40, { shop, demo: false }));
    expect(real?.target).toEqual({ href: "/einkaufsliste/laden?name=REWE&unterwegs=1" });
    const demo = find(jetztInput(16 * 60 + 40, { shop, demo: true }));
    expect(demo?.target).toEqual({ href: "/einkaufsliste" });
  });
});
