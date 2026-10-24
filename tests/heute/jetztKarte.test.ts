import { describe, expect, it } from "vitest";
import { jetztTopics } from "@/lib/heute/jetztTopics";
import { jetztInput as base } from "../helpers";
import { jetztCommand } from "@/lib/heute/jetztCommand";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";

describe("Jetzt-Karte per Sprache (ohne KI)", () => {
  it("an/aus – auch die alten Sätze zur Startseite", () => {
    expect(jetztCommand("Blende die Jetzt-Karte aus")).toBe(false);
    expect(jetztCommand("Zeig die Jetzt-Karte wieder")).toBe(true);
    expect(jetztCommand("Lass die Startseite immer gleich")).toBe(false);
    expect(jetztCommand("Die Startseite soll mitdenken")).toBe(true);
    expect(jetztCommand("Was steht heute an?")).toBeNull();
  });
});

describe("Eine feste Kachel-Anordnung", () => {
  it("Standard: Pinnwand + Wetter klein nebeneinander, Termine, Aufgaben, Essen + Einkauf – ohne Morgen (Spendentopf für 1.0 ausgeblendet)", () => {
    const shown = DEFAULT_HOME.filter((t) => t.visible && t.id !== "vorrat");
    expect(shown.map((t) => `${t.id}:${t.size}`)).toEqual(["pinnwand:S", "wetter:S", "termine:M", "aufgaben:M", "essen:S", "einkauf:S"]);
  });
});

describe("Einkauf nach Läden", () => {
  it("Jetzt-Karte nachmittags: „Auf dem Heimweg bei REWE?“ (ohne Zahl)", () => {
    const t = jetztTopics(base(17 * 60, { shop: { shop: "REWE", names: ["Milch", "Brot", "Butter"] } }));
    expect(t[0].title).toBe("Auf dem Heimweg bei REWE?");
    expect(t[0].detail).toBe("Milch, Brot, Butter");
    expect(jetztTopics(base(10 * 60, { shop: { shop: "REWE", names: ["Milch", "Brot"] } })).some((x) => x.kind === "einkauf")).toBe(false);
  });

  it("Läden gruppieren: meiste zuerst, „Egal wo“ zuletzt, feste Farbe", async () => {
    const { shopGroups, shopTone } = await import("@/lib/einkauf/shopGroups");
    const g = shopGroups([{ name: "Milch", shop: "REWE" }, { name: "Zahnpasta", shop: "dm" }, { name: "Brot", shop: "REWE" }, { name: "Salz", shop: "" }]);
    expect(g.map((x) => `${x.shop ?? "Egal wo"}:${x.names.join(",")}`)).toEqual(["REWE:Milch,Brot", "dm:Zahnpasta", "Egal wo:Salz"]);
    expect(shopTone("REWE")).toBe(shopTone("rewe"));
    expect(shopTone("REWE")).toBeGreaterThanOrEqual(1);
  });
});

describe("Läden ohne Logos", () => {
  it("Symbol nach Ladentyp und feste Farben für bekannte Läden", async () => {
    const { shopType, SHOP_TYPE_ICON, shopTone } = await import("@/lib/einkauf/shopGroups");
    expect(["REWE", "EDEKA", "Lidl", "Biomarkt", "dm", "Bäcker", "Wochenmarkt", "Hofcafé"].map((n) => SHOP_TYPE_ICON[shopType(n)]).join("")).toBe("🛒🛒🛒🌿🧴🥖🥕🏪");
    expect([shopTone("REWE"), shopTone("EDEKA"), shopTone("Lidl")]).toEqual([1, 2, 4]);
  });
});
