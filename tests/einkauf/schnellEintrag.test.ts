// Schnell etwas auf die Liste (quickAdd.ts), Sätze zerlegen (shoppingParse.ts),
// Laden-Seite unterwegs (shopMode.ts) und Läden-Gruppen (shopGroups.ts).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { parseQuickAdd } from "@/lib/einkauf/quickAdd";
import { isShoppingRequest, parseProductStatement, parseShoppingText } from "@/lib/einkauf/shoppingParse";
import { knownShop, shopModeHref, shopModeRequest } from "@/lib/einkauf/shopMode";
import { shopGroups, shopTone, shopType, SHOP_TYPE_ICON } from "@/lib/einkauf/shopGroups";
import { fakeWindow } from "../helpers";

const SETTINGS = { products: { butter: "Alsan" }, itemShops: { "lieblingskram": "dm" }, staples: [{ id: "s", name: "Hausmarke", amount: "", section: "sonstiges" as const, purchases: [], intervalDays: 7, active: true }], shops: ["Hofladen"] };

describe("Sätze für die Einkaufsliste", () => {
  it("erkennt ‚auf die Liste‘ und ‚wir brauchen‘", () => {
    expect(isShoppingRequest("Setz Milch auf die Liste")).toBe(true);
    expect(isShoppingRequest("Einkaufsliste: Brot")).toBe(true);
    expect(isShoppingRequest("Pack Eier auf den Einkaufszettel")).toBe(true);
    expect(isShoppingRequest("Wir brauchen noch Milch und Eier")).toBe(true);
    expect(isShoppingRequest("Wir brauchen eine Idee fürs Essen?")).toBe(false);
    expect(isShoppingRequest("Hallo")).toBe(false);
  });

  it("zerlegt in Artikel mit Menge und Laden – ohne Tippfehler-Korrektur", () => {
    const items = parseShoppingText("Bitte Müsli von Rossmann, 2 kg Kartoffeln und Windeln bei dm auf die Liste setzen.");
    expect(items).toEqual([
      { name: "Müsli", amount: "", shop: "Rossmann" },
      { name: "Kartoffeln", amount: "2 kg", shop: "" },
      { name: "Windeln", amount: "", shop: "dm" },
    ]);
    // „Tomaten und Gurke bei Rewe“: der Laden am Ende gilt für beide (Einkauf neu, Punkt 9) – mit Komma nur fürs Letzte
    expect(parseShoppingText("Tomaten und Gurke bei Rewe")).toEqual([
      { name: "Tomaten", amount: "", shop: "Rewe" },
      { name: "Gurke", amount: "", shop: "Rewe" },
    ]);
    expect(parseShoppingText("Milch, Windeln und Müsli von Rossmann").map((i) => i.shop)).toEqual(["", "", "Rossmann"]);
    expect(parseShoppingText("Wir brauchen Eier (Hofladen) sowie Brot vom Bäcker", ["Hofladen"])).toEqual([
      { name: "Eier", amount: "", shop: "Hofladen" },
      { name: "Brot", amount: "", shop: "Bäcker" },
    ]);
    expect(parseShoppingText("Tofu bei Asia Markt")[0]).toEqual({ name: "Tofu", amount: "", shop: "Asia Markt" });
    expect(parseShoppingText("Kekse (Kiosk)")[0].shop).toBe("Kiosk");
    expect(parseShoppingText("Einkaufsliste: ,  ;")).toEqual([]);
  });

  it("Produkt-Wünsche: ‚Wir nehmen immer Alsan statt Butter‘", () => {
    expect(parseProductStatement("Wir nehmen immer Alsan statt Butter.")).toEqual({ product: "Alsan", ingredient: "Butter" });
    expect(parseProductStatement("Statt Sahne nehmen wir lieber hafersahne")).toEqual({ ingredient: "Sahne", product: "Hafersahne" });
    expect(parseProductStatement("Wir lieben Käse")).toBeNull();
  });
});

describe("Schnell-Plus", () => {
  it("sicher erkannt: Lebensmittel, Drogerie, Abteilung, eigene Produkte, Läden, Stammliste", () => {
    const { items, unsure } = parseQuickAdd("Milch, Windeln, Zahnpasta, Alsan, Lieblingskram, Hausmarke, Kirschtomaten", SETTINGS);
    expect(items.map((i) => i.name)).toEqual(["Milch", "Windeln", "Zahnpasta", "Alsan", "Lieblingskram", "Hausmarke", "Kirschtomaten"]);
    expect(items[0].section).toBe("kuehlregal");
    expect(unsure).toEqual([]);
  });

  it("Unbekanntes kommt als Chip zum Bestätigen zurück", () => {
    const { items, unsure } = parseQuickAdd("Zuchini, Xyzq", SETTINGS);
    expect(items).toEqual([]);
    expect(unsure.map((u) => u.name)).toEqual(["Zuchini", "Xyzq"]);
    expect(unsure[0].suggestion).toBe("Zucchini");
    expect(unsure[1].suggestion).toBeNull();
  });
});

describe("Laden-Seite unterwegs", () => {
  it("Laden erkennen und Link", () => {
    expect(shopModeHref("Bäcker Möller")).toBe("/einkaufsliste/laden?name=B%C3%A4cker%20M%C3%B6ller&unterwegs=1");
    expect(knownShop("dem Rewe", ["Rewe"])).toBe("Rewe");
    expect(knownShop("Rewe City", ["Rewe"])).toBe("Rewe");
    expect(knownShop(" ", ["Rewe"])).toBeNull();
    expect(knownShop("dm-Markt", ["dm"])).toBeNull();
    expect(shopModeRequest("Ich gehe jetzt zum Rewe einkaufen", ["Rewe"])).toBe("Rewe");
    expect(shopModeRequest("Ich bin bei Aldi und kaufe heute ganz viele Sachen ein", ["Aldi"])).toBeNull();
    expect(shopModeRequest("Hallo", ["Aldi"])).toBeNull();
  });

  it("aktiver Laden in „Aussuchen“ wird pro Gerät gemerkt (gleiches Format wie früher der Chip)", async () => {
    vi.resetModules();
    const w = fakeWindow();
    const { setShopChip } = await import("@/lib/einkauf/shopMode");
    setShopChip("laden:Rewe");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.einkaufsansicht")!)).toEqual({ version: 2, chip: "laden:Rewe" });
  });
});

describe("Läden-Gruppen", () => {
  beforeEach(() => vi.resetModules());

  it("meiste zuerst, ‚Egal wo‘ zuletzt, höchstens drei", () => {
    const groups = shopGroups([
      { name: "Milch", shop: "REWE" },
      { name: "Brot", shop: "REWE" },
      { name: "Äpfel", shop: " " },
      { name: "Eier", shop: "EDEKA" },
      { name: "Seife", shop: "dm" },
    ]);
    expect(groups[0]).toEqual({ shop: "REWE", names: ["Milch", "Brot"] });
    expect(groups).toHaveLength(3);
    expect(groups.some((g) => g.shop === null)).toBe(false);
    expect(shopGroups([{ name: "Äpfel", shop: "" }, { name: "Milch", shop: "Lidl" }], 5).map((g) => g.shop)).toEqual(["Lidl", null]);
  });

  it("feste Farbe und neutrales Symbol je Laden", () => {
    expect(shopTone("REWE")).toBe(1);
    expect(shopTone("Lidl")).toBe(4);
    const tone = shopTone("Hofladen Meier");
    expect(tone).toBeGreaterThanOrEqual(1);
    expect(tone).toBeLessThanOrEqual(8);
    expect(shopTone("Hofladen Meier")).toBe(tone);
    expect(shopType("Alnatura")).toBe("bio");
    expect(shopType("Rossmann")).toBe("drogerie");
    expect(shopType("Bäckerei Junge")).toBe("baecker");
    expect(shopType("Wochenmarkt")).toBe("markt");
    expect(shopType("Supermarkt")).toBe("supermarkt");
    expect(shopType("Kiosk")).toBe("sonst");
    expect(SHOP_TYPE_ICON[shopType("Edeka")]).toBe("🛒");
  });
});
