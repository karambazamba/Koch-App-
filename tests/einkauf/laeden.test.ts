import { describe, expect, it } from "vitest";
import { knownShop, shopModeLists, shopModeRequest } from "@/lib/einkauf/shopMode";
import type { ListItem } from "@/lib/einkauf/shoppingList";
import { jetztTopics, type JetztInput } from "@/lib/heute/jetztTopics";

const SHOPS = ["Aldi", "Lidl", "Edeka", "Rewe", "Rossmann", "dm", "Wochenmarkt", "Bäcker", "Hofladen"];
const item = (name: string, shop = "", checked = false): ListItem => ({ key: name, name, originalName: name, amount: "", section: "sonstiges", dishes: [], days: [], shop, checked, hidden: false });

describe("Einkaufsmodus „Bei REWE“", () => {
  const items = [item("Milch", "Rewe"), item("Brot", "Rewe", true), item("Äpfel"), item("Zahnpasta", "Rossmann"), item("Shampoo", "Rossmann"), item("Eier", "Edeka"), item("Butter", "", true)];

  it("hier · egal wo · andere Läden (meiste zuerst) · im Korb", () => {
    const l = shopModeLists(items, "REWE");
    expect(l.here.map((i) => i.name)).toEqual(["Milch"]);
    expect(l.anywhere.map((i) => i.name)).toEqual(["Äpfel"]);
    expect(l.elsewhere).toEqual([
      { shop: "Rossmann", names: ["Zahnpasta", "Shampoo"] },
      { shop: "Edeka", names: ["Eier"] },
    ]);
    expect(l.done.map((i) => i.name)).toEqual(["Brot", "Butter"]);
  });

  it("Ausgeblendetes („Haben wir schon“) taucht nicht auf", () => {
    const l = shopModeLists([{ ...item("Mehl", "Rewe"), hidden: true }], "Rewe");
    expect(l.here).toEqual([]);
  });
});

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

describe("Jetzt-Karte „Auf dem Heimweg?“ öffnet den Einkaufsmodus", () => {
  it("echte Liste → /einkaufsliste/laden?name=…, Beispiel-Tag → Einkaufsliste", () => {
    const base = { today: "2026-10-21", minutes: 16 * 60 + 40, shop: { shop: "REWE", names: ["Milch", "Brot", "Butter"] } } as unknown as JetztInput;
    const find = (x: JetztInput) => jetztTopics(x).find((t) => t.kind === "einkauf");
    const real = find({ ...emptyInput(), ...base, demo: false });
    expect(real?.target).toEqual({ href: "/einkaufsliste/laden?name=REWE" });
    const demo = find({ ...emptyInput(), ...base, demo: true });
    expect(demo?.target).toEqual({ href: "/einkaufsliste" });
  });
});

function emptyInput(): JetztInput {
  return {
    minutes: 600, today: "2026-10-21", calm: false, upcoming: [], tomorrow: { label: "Morgen · Do", date: "2026-10-22", items: [], weather: null },
    urgent: [], dueToday: [], allDone: false, pin: null, weatherTip: null, weatherNow: null, dish: null, dinnerFree: false, birthdays: [], sport: null,
    shop: null, timer: null, cookingStep: null, reminder: null, pause: null, leisure: null, tip: null, region: null, demo: false, firstTiles: [], weights: {}, hidden: [],
  } as JetztInput;
}
