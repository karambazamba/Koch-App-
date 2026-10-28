// Nachtrag A-018, Punkt 1 und 2: Laden ohne Einträge (Vorschläge „Oft bei
// Edeka“, Tippen landet bei Edeka) und Abhaken im Laden („Schon im Wagen“,
// Rückgängig durch nochmal tippen, „Einkauf fertig“ → Im Haus).
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GLEITEN_MS, STEHEN_MS, leerVorschlaege, wagenTeilen } from "@/lib/einkauf/wagen/wagen";
import { buildShoppingList } from "@/lib/einkauf/buildList";
import type { ListItem, ShoppingListStore } from "@/lib/einkauf/listModel";
import type { Verlauf } from "@/lib/einkauf/aussuchen/abschnitte";
import type { PlanWeek } from "@/lib/essen/mealPlan";
import { at, atFresh, fakeWindow } from "../helpers";

const W = "2026-10-19";
const T = "2026-10-20";
const KEY = "wasgibts.einkaufsliste";
const laden = readFileSync("src/components/einkauf/LadenSeite.tsx", "utf8");
const item = (name: string, over: Partial<ListItem> = {}): ListItem => ({ key: `m:${name}`, name, originalName: name, amount: "", section: "kuehlregal", dishes: [], days: [], shop: "Edeka", checked: false, hidden: false, manualId: name, ...over });
const verlauf = (over: Partial<Verlauf> = {}): Verlauf => ({ itemShops: {}, shopRules: {}, learned: {}, staples: [], gekauft: [], ...over });
const EMPTY_WEEK = { weekStart: W, days: [] } as unknown as PlanWeek;

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem(KEY)!) as ShoppingListStore;
beforeEach(async () => {
  at(`${T}T17:00`);
  vi.resetModules();
  await atFresh(`${T}T17:00`);
  w = fakeWindow();
});

describe("Laden ohne Einträge (Edeka 0)", () => {
  it("oben „Für Edeka steht nichts drauf.“, kein alter Satz „Antippen: Laden wählen. Abhaken im Laden.“", () => {
    expect(laden).toMatch(/`Für \$\{shop\} steht nichts drauf\.`/);
    for (const f of ["src/components/einkauf/LadenSeite.tsx", "src/components/einkauf/EinkaufSeite.tsx", "src/components/einkauf/seite/OhneLaden.tsx"]) expect(readFileSync(f, "utf8")).not.toContain("Abhaken im Laden");
  });

  it("Vorschläge: „Oft bei Edeka“ (hier gekauft, gemerkt, gelernt), sonst „Zuletzt gekauft“, sonst „Beliebt“", () => {
    const v = verlauf({ learned: { quark: { shop: "Edeka", n: 2 } }, shopRules: { butter: "Edeka" }, gekauft: [item("Milch", { checked: true }), item("Brot", { checked: true, shop: "Rewe" })] });
    expect(leerVorschlaege("Edeka", v)).toEqual({ titel: "Oft bei Edeka", namen: ["Butter", "Quark", "Milch"] });
    expect(leerVorschlaege("Lidl", v)).toEqual({ titel: "Zuletzt gekauft", namen: ["Milch", "Brot"] });
    expect(leerVorschlaege("Lidl", verlauf()).titel).toBe("Beliebt");
    expect(leerVorschlaege("Rossmann", verlauf()).namen[0]).toBe("Klopapier");
    // was schon draufsteht, wird nicht nochmal vorgeschlagen
    expect(leerVorschlaege("Edeka", v, ["butter"]).namen).toEqual(["Quark", "Milch"]);
  });

  it("Antippen = direkt auf die Liste für Edeka (feste Regel, kein Laden-Wählen), kurz „Steht drin.“", async () => {
    expect(laden).toMatch(/onClick=\{\(\) => \{\s*buzz\(\);\s*if \(add\(v\)\) showToast\(\{ text: "Steht drin\.", seconds: 2, small: true \}\);/);
    expect(laden).toMatch(/if \(shop\) einsortieren\(n, shop, true\)/);
    // was add() auf der Edeka-Seite tut: in die Woche und als Regel nach Edeka
    const { addManualItem, sectionFor } = await import("@/lib/einkauf/shoppingList");
    const { einsortieren } = await import("@/lib/einkauf/einsortieren");
    addManualItem(W, { name: "Quark", amount: "", section: sectionFor("Quark") });
    einsortieren("Quark", "Edeka", true);
    const s = saved();
    const list = buildShoppingList(EMPTY_WEEK, {}, s.weeks[W], s);
    expect(list.items.find((i) => i.name === "Quark")?.shop).toBe("Edeka");
  });

  it("die Vorschläge bleiben stehen, solange die Seite offen ist (aus dem Stand beim Öffnen)", () => {
    expect(laden).toMatch(/if \(leerStand === undefined\) setLeerStand\(leer \?/);
    expect(laden).toMatch(/data-oft-bei/);
  });
});

describe("Im Laden abhaken: „Schon im Wagen“", () => {
  it("Abgehakt bleibt 1 s oben, gleitet 0,8 s nach unten, dann im Wagen", () => {
    expect(STEHEN_MS).toBe(1000);
    expect(GLEITEN_MS).toBe(800);
    const items = [item("Milch"), item("Brot", { checked: true }), item("Käse", { checked: true }), item("Eier", { checked: true, fertig: true })];
    const { hier, wagen } = wagenTeilen(items, ["m:Brot"]);
    expect(hier.map((i) => i.name)).toEqual(["Milch", "Brot"]);
    expect(wagen.map((i) => i.name)).toEqual(["Käse"]);
  });

  it("Abhaken legt noch nichts nach „Im Haus“; nochmal tippen = Rückgängig", async () => {
    const { addManualItem, toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    const id = addManualItem(W, { name: "Brot", amount: "", section: "brot" });
    const brot = item("Brot", { key: `m:${id}`, manualId: id, section: "brot" });
    toggleChecked(W, brot, T, { imHaus: false });
    expect(saved().weeks[W].manual[0].done).toBe(true);
    expect(loadPantry()).toEqual([]);
    toggleChecked(W, { ...brot, checked: true }, T, { imHaus: false });
    expect(saved().weeks[W].manual[0].done).toBe(false);
  });

  it("„Einkauf fertig“: Wagen → Im Haus (Baustein an), „Fertig. Liegt jetzt bei Im Haus.“, Rückgängig", async () => {
    const { addManualItem, toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { einkaufFertig } = await import("@/lib/einkauf/wagen/wagen");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    const ids = ["Brot", "Milch", "Klopapier"].map((n) => addManualItem(W, { name: n, amount: "", section: "sonstiges" }));
    const items = () => buildShoppingList(EMPTY_WEEK, {}, saved().weeks[W], saved()).items;
    for (const i of items()) toggleChecked(W, i, T, { imHaus: false });
    const r = einkaufFertig(W, items().filter((i) => i.checked && !i.fertig), T, true);
    expect(r.text).toBe("Fertig. Liegt jetzt bei Im Haus.");
    expect(loadPantry().map((p) => p.name).sort()).toEqual(["Brot", "Milch"]);
    // raus aus „Schon im Wagen“
    expect(wagenTeilen(items(), []).wagen).toEqual([]);
    expect(saved().weeks[W].fertig).toEqual(ids.map((id) => `m:${id}`));
    r.undo();
    expect(loadPantry()).toEqual([]);
    expect(wagenTeilen(items(), []).wagen).toHaveLength(3);
  });

  it("ohne Baustein „Im Haus“ nur „Fertig.“; Haken weg nach „fertig“ = wieder offen", async () => {
    const { addManualItem, toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { einkaufFertig } = await import("@/lib/einkauf/wagen/wagen");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    addManualItem(W, { name: "Brot", amount: "", section: "brot" });
    const items = () => buildShoppingList(EMPTY_WEEK, {}, saved().weeks[W], saved()).items;
    toggleChecked(W, items()[0], T, { imHaus: false });
    expect(einkaufFertig(W, items(), T, false).text).toBe("Fertig.");
    expect(loadPantry()).toEqual([]);
    expect(items()[0].fertig).toBe(true);
    toggleChecked(W, items()[0]);
    expect(items()[0]).toMatchObject({ checked: false });
    expect(items()[0].fertig).toBeUndefined();
  });

  it("Seite: zugeklappt ohne Zahl, großer Knopf „Einkauf fertig“, dann zurück zur Übersicht; Familie Bescheid bleibt", () => {
    expect(laden).toMatch(/Schon im Wagen\n/);
    expect(laden).not.toMatch(/Schon im Wagen[^"\n]*\{/);
    expect(laden).toMatch(/\{wagenOffen && <ul/);
    expect(laden).toMatch(/einkaufFertig\(weekStart, imWagen, todayIso, imHausAn\)/);
    expect(laden).toMatch(/undoneText: "Wieder im Wagen"/);
    expect(laden).toMatch(/goBack\("\/einkaufsliste"\);\n  \};/);
    expect(laden).toMatch(/changeTrips\(\(t\) => finishTrip\(t, id, nowIso\(\), count\)\)/);
    expect(laden).toMatch(/useFeature\("vorrat"\) === true/);
    // „Steh grad davor“ und „Neu von …“ bleiben
    expect(laden).toContain("Steh grad davor");
    expect(readFileSync("src/components/einkauf/seite/LadenZeile.tsx", "utf8")).toMatch(/Neu von \$\{neuVon\}/);
  });
});
