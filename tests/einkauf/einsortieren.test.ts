// Einkauf: erst einsortieren, dann einkaufen (Tafel 99). Zu Hause heißt
// Antippen „Wo kaufst du das?“ (nie gekauft), abgehakt wird im
// Einkaufsmodus. Drei Zustände: Laden · bewusst „Egal wo“ · noch ohne Laden.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import { buildShoppingList } from "@/lib/einkauf/buildList";
import { migrateStore } from "@/lib/einkauf/listMigration";
import { einsortiertText, ohneLaden, sortiertText, sortierVorschlaege } from "@/lib/einkauf/einsortieren";
import { ladenMerken } from "@/lib/einkauf/meineLaeden";
import { at, fakeWindow } from "../helpers";

const KEY = "wasgibts.einkaufsliste";
const W = "2026-10-26";
let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
const item = (name: string, extra: Partial<ListItem> = {}): ListItem => ({ key: name, name, originalName: name, amount: "", section: "sonstiges", dishes: [], days: [], shop: "", checked: false, hidden: false, ...extra });
const EMPTY_WEEK = { weekStart: W, days: [] } as unknown as Parameters<typeof buildShoppingList>[0];

beforeEach(() => {
  at("2026-10-27T21:02");
  vi.resetModules();
  w = fakeWindow();
});

describe("Zwei klare Momente (seit „Einkauf neu“: Laden-Seite statt Einkaufsmodus)", () => {
  it("„Noch ohne Laden“: Antippen öffnet „Wo kaufst du das?“ und ändert nie den gekauft-Status", () => {
    const src = readFileSync("src/components/einkauf/EinkaufSeite.tsx", "utf8");
    expect(src).toMatch(/onTap=\{\(item\) => !zeigBeispiel && setSorting\(item\)\}/);
    expect(src).not.toMatch(/toggleChecked/);
  });

  it("Laden-Seite: der Kreis = gekauft, zu Hause wie im Laden", () => {
    const src = readFileSync("src/components/einkauf/LadenSeite.tsx", "utf8");
    expect(src).toMatch(/onTick=\{\(\) => tick\(item\)\}/);
    expect(src).toMatch(/toggleChecked\(weekStart, item, todayIso\)/);
    expect(src).toMatch(/role="checkbox"/);
  });
});

describe("Laden · Egal wo · noch ohne Laden", () => {
  it("bisher Gespeichertes ohne Laden gilt als „noch ohne Laden“, nicht als „Egal wo“", () => {
    // v6 hat nie einen leeren Laden gespeichert (Leeren hat gelöscht) – kein Formatwechsel nötig
    const old = migrateStore({ version: 6, weeks: { [W]: { manual: [{ id: "1", name: "Spinat", amount: "", section: "obst-gemuese", done: false }, { id: "2", name: "Milch", amount: "", section: "kuehlregal", done: false }], checked: [], have: [] } }, products: {}, shops: [], itemShops: { milch: "Rewe" }, staples: [], myShops: ["Rewe"], shopsAsked: true });
    const list = buildShoppingList(EMPTY_WEEK, {}, old!.weeks[W], old!);
    const by = (n: string) => list.items.find((i) => i.name === n)!;
    expect(by("Milch").shop).toBe("Rewe");
    expect(ohneLaden(by("Spinat"))).toBe(true);
    expect(by("Spinat").anywhere).toBeUndefined();
  });

  it("leerer gemerkter Laden = bewusst „Egal wo“; eine Regel für einen ähnlichen Namen zieht dann nicht", () => {
    const week = { manual: [{ id: "1", name: "Cherrytomaten", amount: "", section: "obst-gemuese" as const, done: false }, { id: "2", name: "Brot", amount: "", section: "brot" as const, done: false }], checked: [], have: [] };
    const list = buildShoppingList(EMPTY_WEEK, {}, week, { products: {}, itemShops: { cherrytomaten: "" }, shopRules: { tomaten: "Rewe" } });
    const tomaten = list.items.find((i) => i.name === "Cherrytomaten")!;
    expect(tomaten).toMatchObject({ shop: "", anywhere: true });
    expect(ohneLaden(tomaten)).toBe(false);
    expect(ohneLaden(list.items.find((i) => i.name === "Brot")!)).toBe(true);
  });

  it("Neue Artikel: bekannter Laden direkt dort, sonst noch ohne Laden; „Egal wo“ nur bewusst gewählt", () => {
    const itemShops = { milch: "Rewe", salz: "" };
    // nichts gewählt → nichts merken (noch ohne Laden bzw. wie gemerkt)
    expect(ladenMerken({ name: "Spinat", shop: "", picked: false, itemShops })).toBe(false);
    expect(ladenMerken({ name: "Milch", shop: "Rewe", picked: false, itemShops })).toBe(false);
    // bewusst „Egal wo“ für Neues → merken; für schon „Egal wo“ nicht nochmal
    expect(ladenMerken({ name: "Spinat", shop: "", picked: true, itemShops })).toBe(true);
    expect(ladenMerken({ name: "Salz", shop: "", picked: true, itemShops })).toBe(false);
    // anderer Laden → merken
    expect(ladenMerken({ name: "Milch", shop: "Lidl", picked: false, itemShops })).toBe(true);
  });
});

describe("Laden wählen", () => {
  it("ein Tipp: Artikel wandert in den Laden, „immer bei“ = feste Regel; Rückgängig stellt alles wieder her", async () => {
    const { einsortieren } = await import("@/lib/einkauf/einsortieren");
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Edeka", "Rewe"]);
    const undo = einsortieren("Spinat", "Rewe", true);
    expect(saved().itemShops.spinat).toBe("Rewe");
    expect(saved().shopRules.spinat).toBe("Rewe");
    expect(einsortiertText("Spinat", "Rewe", true)).toBe("Spinat → Rewe. Merk ich mir.");
    undo();
    expect(saved().itemShops.spinat).toBeUndefined();
    expect(saved().shopRules.spinat).toBeUndefined();
    expect(saved().myShops).toEqual(["Edeka", "Rewe"]);
  });

  it("ohne Häkchen nur gemerkt; „Egal wo“ wird bewusst gemerkt; ein neuer Laden kommt zu Meine Läden und Rückgängig nimmt ihn wieder mit", async () => {
    const { einsortieren } = await import("@/lib/einkauf/einsortieren");
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Edeka"]);
    einsortieren("Brot", "Edeka", false);
    expect(saved().itemShops.brot).toBe("Edeka");
    expect(saved().shopRules.brot).toBeUndefined();
    einsortieren("Salz", "", false);
    expect(saved().itemShops.salz).toBe("");
    expect(einsortiertText("Salz", "", false)).toBe("Salz → Egal wo.");
    const undo = einsortieren("Tofu", "Asia Laden", false);
    expect(saved().myShops).toEqual(["Edeka", "Asia Laden"]);
    undo();
    expect(saved().myShops).toEqual(["Edeka"]);
    expect(saved().shops).not.toContain("Asia Laden");
    expect(saved().itemShops.brot).toBe("Edeka");
  });

  it("Mia „egal wo“ (Werkzeug laden_regel ohne Laden) = Regel weg, Artikel bewusst Egal wo; Regel entfernen = wieder noch ohne Laden", async () => {
    const { setShopRule, removeShopRule, applyShopRule } = await import("@/lib/einkauf/shopRules");
    setShopRule("Milch", "Rewe");
    setShopRule("Milch", "");
    expect(saved().shopRules.milch).toBeUndefined();
    expect(saved().itemShops.milch).toBe("");
    const undo = applyShopRule("Milch", "Lidl");
    undo();
    expect(saved().itemShops.milch).toBe("");
    setShopRule("Butter", "Lidl");
    removeShopRule("Butter");
    expect(saved().itemShops.butter).toBeUndefined();
  });
});

describe("Mia sortiert", () => {
  it("ordnet ein, was sie kennt (Gelerntes, ähnlicher gemerkter Name); Unbekanntes bleibt; Rückgängig", async () => {
    const { miaSortiert } = await import("@/lib/einkauf/einsortieren");
    const { update } = await import("@/lib/einkauf/listStore");
    const { chooseMyShops } = await import("@/lib/einkauf/meineLaeden");
    chooseMyShops(["Edeka", "Rewe"]);
    update((s) => ({ ...s, itemShops: { ...s.itemShops, tomaten: "Rewe" }, learned: { spinat: { shop: "Edeka", n: 1 } } }));
    const zone = [item("Spinat"), item("Cherrytomaten"), item("Kürbiskerne"), item("Milch", { shop: "Rewe" }), item("Salz", { anywhere: true })];
    expect(sortierVorschlaege(zone, saved())).toEqual([
      { name: "Spinat", shop: "Edeka" },
      { name: "Cherrytomaten", shop: "Rewe" },
    ]);
    const { count, undo } = miaSortiert(zone);
    expect(count).toBe(2);
    expect(sortiertText(count)).toBe("2 einsortiert");
    expect(saved().itemShops).toMatchObject({ spinat: "Edeka", cherrytomaten: "Rewe" });
    expect(saved().itemShops.kürbiskerne).toBeUndefined();
    undo();
    expect(saved().itemShops).toEqual({ tomaten: "Rewe" });
    expect(saved().learned.spinat).toEqual({ shop: "Edeka", n: 1 });
  });

  it("nie raten: zwei passende Läden = nichts", () => {
    expect(sortierVorschlaege([item("Bio Cherrytomaten")], { itemShops: { tomaten: "Rewe", cherrytomaten: "Lidl" } })).toEqual([]);
  });

});

describe("Oberfläche", () => {
  it("„Noch ohne Laden“ unter den Läden, „Mia sortiert“ nur, wenn sie etwas kennt; Fenster über ui/Sheet", () => {
    expect(readFileSync("src/components/einkauf/Einsortieren.tsx", "utf8")).toMatch(/import \{ Sheet \} from "@\/components\/ui\/Sheet"/);
    const zone = readFileSync("src/components/einkauf/seite/OhneLaden.tsx", "utf8");
    expect(zone).toMatch(/\{sortierer && \(/);
    expect(zone).toMatch(/\{sortierer\} sortiert/);
    expect(zone).toContain('id="ohne-laden"');
    const view = readFileSync("src/components/einkauf/EinkaufSeite.tsx", "utf8");
    expect(view.indexOf("<LadenKarteView")).toBeLessThan(view.indexOf("<OhneLadenZone"));
    expect(view).toMatch(/sortierer=\{kennt && !zeigBeispiel \? helperName\(profile\) : null\}/);
  });

  it("Startseiten-Kachel: „n ohne Laden“ öffnet „Einkauf“ bei „Noch ohne Laden“", () => {
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(src).toContain('href="/einkaufsliste#ohne-laden"');
    expect(src).toContain("Sortieren ›");
  });
});
