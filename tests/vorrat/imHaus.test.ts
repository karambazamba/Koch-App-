// „Im Haus“ statt Vorrat (Tafel 78/79): Orte, Ablauf je Sorte, Grundsachen,
// „vermutlich“, Migration ohne Mengen, Kreislauf Einkauf ↔ Im Haus,
// Seite und Kachel, Mia-Sätze, ehrliche Zutaten-Zeile.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GRUNDSACHEN, HALTBAR_TAGE, cleanPantryItem, isFood, isGone, isGrundsache, isSoon, isUnsure, placeFor, soonBadge, sorteFor } from "@/lib/vorrat/haltbar";
import { ingredientStem, sameIngredient, type PantryItem } from "@/lib/vorrat/pantry";
import { aufgebrauchtZeile, houseGroups, houseTile } from "@/lib/vorrat/imHaus";
import { pantrySentence } from "@/lib/vorrat/kreislauf";
import { matchStock, soonToUse, stockLine } from "@/lib/essen/dishIdeas";
import { ADAPTERS, stableJson } from "@/lib/konten/sync/docs";
import { at, atFresh, fakeWindow } from "../helpers";

const T = "2026-10-20";
const day = (d: number) => new Date(Date.parse(`${T}T12:00:00Z`) - d * 86_400_000).toISOString().slice(0, 10);
const item = (name: string, daysAgo = 0, extra: Partial<PantryItem> = {}): PantryItem => ({ id: name, name, addedAt: day(daysAgo), place: placeFor(name), usedAt: null, ...extra });

let w: ReturnType<typeof fakeWindow>;
beforeEach(async () => {
  at(`${T}T08:00`);
  vi.resetModules();
  await atFresh(`${T}T08:00`);
  w = fakeWindow();
});

describe("Orte und Sorten (an einer Stelle)", () => {
  it("Gruppen Kühlschrank / Vorrat / Obst & Gemüse / Brot / Tiefkühl (Tafel 102)", () => {
    expect(["Milch", "Käse", "Sahne", "Hähnchen"].map((n) => placeFor(n))).toEqual(["kuehlschrank", "kuehlschrank", "kuehlschrank", "kuehlschrank"]);
    expect(["Nudeln", "Reis", "Kidneybohnen aus der Dose", "Honig", "Apfelsaft"].map((n) => placeFor(n))).toEqual(["schrank", "schrank", "schrank", "schrank", "schrank"]);
    expect(["Paprika", "Zucchini", "Kartoffeln", "Zwiebeln", "Äpfel", "Tomaten"].map((n) => placeFor(n))).toEqual(["obstgemuese", "obstgemuese", "obstgemuese", "obstgemuese", "obstgemuese", "obstgemuese"]);
    expect(["Brot", "Brötchen", "Kuchen", "Toast"].map((n) => placeFor(n))).toEqual(["brot", "brot", "brot", "brot"]);
    expect(["TK-Erbsen", "Fischstäbchen", "Eis"].map((n) => placeFor(n))).toEqual(["tiefkuehler", "tiefkuehler", "tiefkuehler"]);
    expect(placeFor("Milch", { milch: "schrank" })).toBe("schrank");
  });

  it("Ablauf je Sorte: Fleisch 3, Frisches 7, Knollen 21, Trockenes 42, Tiefkühler 90 Tage", () => {
    expect(sorteFor("Hähnchen", "kuehlschrank")).toBe("fleisch");
    expect(sorteFor("Joghurt", "kuehlschrank")).toBe("frisch");
    expect(sorteFor("Brot", "schrank")).toBe("frisch");
    expect(sorteFor("Kartoffeln", "schrank")).toBe("knolle");
    expect(sorteFor("Nudeln", "schrank")).toBe("trocken");
    expect(sorteFor("Hähnchen", "tiefkuehler")).toBe("tk");
    expect(HALTBAR_TAGE).toEqual({ fleisch: 3, frisch: 7, knolle: 21, trocken: 42, tk: 90 });
    expect(isGone(item("Hähnchen", 3), T)).toBe(false);
    expect(isGone(item("Hähnchen", 4), T)).toBe(true);
    expect(isGone(item("Joghurt", 8), T)).toBe(true);
    expect(isGone(item("Kartoffeln", 21), T)).toBe(false);
    expect(isGone(item("Nudeln", 43), T)).toBe(true);
    expect(isGone(item("Fischstäbchen", 80), T)).toBe(false);
    expect(isGone({ ...item("Joghurt"), addedAt: "" }, T)).toBe(false);
  });

  it("vermutlich ab der zweiten Hälfte, „Bald aufbrauchen“ nur Frisches im letzten Drittel", () => {
    expect(isUnsure(item("Joghurt", 3), T)).toBe(false);
    expect(isUnsure(item("Joghurt", 4), T)).toBe(true);
    expect(isSoon(item("Joghurt", 4), T)).toBe(false);
    expect(isSoon(item("Joghurt", 5), T)).toBe(true);
    expect(isSoon(item("Nudeln", 40), T)).toBe(false);
    expect(soonBadge(item("Joghurt", 6), T)).toEqual({ text: "morgen", tone: "orange" });
    expect(soonBadge(item("Joghurt", 7), T)).toEqual({ text: "heute", tone: "orange" });
    expect(soonBadge(item("Joghurt", 5), T)).toEqual({ text: "bis Do", tone: "gelb" });
    expect(soonBadge(item("Hähnchen", 2), T)).toEqual({ text: "morgen", tone: "orange" });
    expect(soonBadge(item("Joghurt", 1), T)).toBeNull();
  });

  it("Grundsachen immer da, Drogerie ist kein Essen", () => {
    expect(["Salz", "Pfeffer", "Olivenöl", "Zucker", "Mehl", "Essig", "Gewürze"].every(isGrundsache)).toBe(true);
    expect(isGrundsache("Milch")).toBe(false);
    expect(GRUNDSACHEN.test("Zwiebeln")).toBe(false);
    expect(["Klopapier", "Shampoo", "Spülmittel", "Windeln"].some(isFood)).toBe(false);
    expect(isFood("Brot")).toBe(true);
  });

  it("gleiche Zutat: Mehrzahl, Synonyme, nicht Gewürzpulver", () => {
    expect(ingredientStem("rote Zwiebeln")).toBe("zwiebel");
    expect(sameIngredient("Karotte", "Möhren")).toBe(true);
    expect(sameIngredient("Paprika", "Paprikapulver")).toBe(false);
    expect(sameIngredient("Reis", "Mais")).toBe(false);
  });
});

describe("Speicher", () => {
  it("v1/v2 → v4: Mengen fallen weg, Namen ohne Zahl, Obst/Brot in ihre Gruppen, nichts Gültiges geht verloren", async () => {
    w = fakeWindow({
      "wasgibts.vorrat": JSON.stringify({
        version: 2,
        items: [
          { id: "1", name: "3 Karotten", amount: 3, unit: "", addedAt: T, place: "kuehlschrank" },
          { id: "2", name: "Reis", amount: 2, unit: "Packung", addedAt: "2026-10-01" },
          { id: "3", name: "½ Brot", amount: 0.5, unit: "", addedAt: T, place: "schrank" },
          null,
          { name: "ohne id" },
        ],
      }),
    });
    const { loadPantryAll } = await import("@/lib/vorrat/pantry");
    expect(loadPantryAll()).toEqual([
      { id: "1", name: "Karotten", addedAt: T, place: "obstgemuese", usedAt: null },
      { id: "2", name: "Reis", addedAt: "2026-10-01", place: "schrank", usedAt: null },
      { id: "3", name: "Brot", addedAt: T, place: "brot", usedAt: null },
    ]);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.vorrat")!).version).toBe(4);
    expect(cleanPantryItem({ id: "x", name: "  " })).toBeNull();
  });

  it("unbekannte Version wird nicht gelesen", async () => {
    fakeWindow({ "wasgibts.vorrat": JSON.stringify({ version: 7, items: [] }) });
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    expect(loadPantry()).toEqual([]);
  });

  it("rein: Gleiches wird frisch statt doppelt, Grundsachen und Drogerie bleiben draußen", async () => {
    const p = await import("@/lib/vorrat/pantry");
    expect(p.addPantryItems([{ name: "Karotten" }, { name: "Salz" }, { name: "Klopapier" }], day(3))).toEqual(["Karotten"]);
    expect(p.addPantryItems([{ name: "Karotte" }], T)).toEqual(["Karotte"]);
    expect(p.loadPantry().map((i) => [i.name, i.addedAt])).toEqual([["Karotten", T]]);
  });

  it("Ort ändern merkt es sich für die Sorte", async () => {
    const p = await import("@/lib/vorrat/pantry");
    p.addPantryItems([{ name: "Tomaten" }], T);
    expect(p.loadPantry()[0].place).toBe("obstgemuese");
    p.setPantryPlace(p.loadPantry()[0].id, "kuehlschrank");
    expect(p.loadPantry()[0].place).toBe("kuehlschrank");
    p.removePantryItem(p.loadPantry()[0].id);
    p.addPantryItems([{ name: "Tomaten" }], T);
    expect(p.loadPantry()[0].place).toBe("kuehlschrank");
  });

  it("aufgebraucht bleibt 3 Tage blass, Abgelaufenes verschwindet still", async () => {
    const p = await import("@/lib/vorrat/pantry");
    p.addPantryItems([{ name: "Milch" }, { name: "Hähnchen" }], T);
    expect(p.consumePantry(["Milch"], T)).toEqual(["Milch"]);
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Hähnchen"]);
    expect(p.usedPantry(p.loadPantryAll(), T).map((i) => i.name)).toEqual(["Milch"]);
    expect(p.usedPantry(p.loadPantryAll(), "2026-10-23")).toEqual([]);
    expect(p.tidyPantry(p.loadPantryAll(), "2026-10-23").map((i) => i.name)).toEqual(["Hähnchen"]);
    expect(p.tidyPantry(p.loadPantryAll(), "2026-10-24")).toEqual([]);
  });
});

describe("Seite und Kachel", () => {
  const all = [item("Joghurt", 5), item("Milch"), item("Nudeln"), item("Fischstäbchen"), item("Brot", 1, { usedAt: T }), item("Hack", 9)];

  it("Gruppen nur mit Inhalt, „bald“ als Punkt, Aufgebrauchtes als eine Zeile (Tafel 102)", () => {
    const { groups, used } = houseGroups(all, T);
    expect(groups.map((g) => [g.title, g.items.map((i) => `${i.item.name}${i.soon ? " •" : ""}`)])).toEqual([
      ["Kühlschrank", ["Joghurt •", "Milch"]],
      ["Vorrat", ["Nudeln"]],
      ["Tiefkühl", ["Fischstäbchen"]],
    ]);
    expect(used.map((u) => u.name)).toEqual(["Brot"]);
    expect(aufgebrauchtZeile(used)).toBe("Aufgebraucht: Brot");
    expect(aufgebrauchtZeile([item("Thunfisch"), item("Kuchen")])).toBe("Aufgebraucht: Thunfisch, Kuchen");
    expect(aufgebrauchtZeile([])).toBeNull();
    expect(houseGroups([], T)).toEqual({ groups: [], used: [] });
  });

  it("Kachel: bald zuerst mit Schild, sonst zuletzt eingekauft", () => {
    expect(houseTile(all, T)).toMatchObject({ soon: true, items: [{ item: { name: "Joghurt" }, badge: { text: "bis Do" } }] });
    const fresh = houseTile([item("Nudeln", 2), item("Milch"), item("Reis", 1)], T);
    expect(fresh.soon).toBe(false);
    expect(fresh.items.map((x) => x.item.name)).toEqual(["Milch", "Reis", "Nudeln"]);
    expect(soonToUse(all, T).map((i) => i.name)).toEqual(["Joghurt"]);
  });
});

describe("Kreislauf Einkauf ↔ Im Haus", () => {
  it("abhaken = rein (nur Essen), Haken weg = raus; Im Haus ist an (gehört zu 1.0)", async () => {
    const { boughtToHouse, unboughtFromHouse } = await import("@/lib/vorrat/kreislauf");
    const p = await import("@/lib/vorrat/pantry");
    const f = await import("@/lib/core/features");
    boughtToHouse("Brot", T);
    boughtToHouse("Äpfel", T);
    boughtToHouse("Shampoo", T);
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Brot", "Äpfel"]);
    expect(f.featureOn("vorrat")).toBe(true);
    unboughtFromHouse("Brot", T);
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Äpfel"]);
  });

  it("über die Einkaufsliste: abhaken legt es ins Haus, Meldung sammelt", async () => {
    const shown: string[] = [];
    vi.doMock("@/lib/core/toast", async (orig) => ({ ...(await orig<object>()), showToast: (t: { text: string }) => shown.push(t.text) }));
    const { toggleChecked } = await import("@/lib/einkauf/listEdits");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    toggleChecked("2026-10-19", { key: "m", name: "Brot", originalName: "Brot", amount: "", section: "brot", dishes: [], days: [], shop: "", checked: false, hidden: false, manualId: "x" }, T);
    toggleChecked("2026-10-19", { key: "n", name: "Eier", originalName: "Eier", amount: "", section: "kuehlregal", dishes: [], days: [], shop: "", checked: false, hidden: false, manualId: "y" }, T);
    expect(loadPantry().map((i) => i.name)).toEqual(["Brot", "Eier"]);
    expect(shown).toEqual(["Im Haus: Brot", "Im Haus: Brot, Eier"]);
    vi.doUnmock("@/lib/core/toast");
  });

  it("„Aufgebraucht: … · Auf die Liste“: alles auf die Liste, nichts doppelt, raus aus Im Haus (mit Rückgängig)", async () => {
    const { aufDieListe } = await import("@/lib/vorrat/kreislauf");
    const p = await import("@/lib/vorrat/pantry");
    const s = await import("@/lib/einkauf/listStore");
    p.addPantryItems([{ name: "Milch" }, { name: "Thunfisch" }], T);
    p.consumePantry(["Milch", "Thunfisch"], T);
    s.updateList("2026-10-19", (l) => ({ ...l, manual: [{ id: "t", name: "Thunfisch", amount: "", section: "vorrat", done: false }] }));
    aufDieListe(p.usedPantry(p.loadPantryAll(), T), "2026-10-19");
    expect(p.loadPantryAll()).toEqual([]);
    expect(s.store.load()?.weeks["2026-10-19"].manual.map((m) => m.name)).toEqual(["Thunfisch", "Milch"]);
    const { undoLast } = await import("@/lib/core/undo");
    undoLast();
    expect(p.loadPantryAll().map((i) => i.name)).toEqual(["Milch", "Thunfisch"]);
    expect(s.store.load()?.weeks["2026-10-19"].manual.map((m) => m.name)).toEqual(["Thunfisch"]);
  });

  it("Mia ohne KI: „Hab Hähnchen gekauft“ rein, „Die Milch ist alle“ raus", () => {
    expect(pantrySentence("Hab Hähnchen gekauft")).toEqual({ add: ["Hähnchen"] });
    expect(pantrySentence("Ich hab Brot und Eier mitgebracht.")).toEqual({ add: ["Brot", "Eier"] });
    expect(pantrySentence("Die Milch ist alle")).toEqual({ used: ["Milch"] });
    expect(pantrySentence("Eier sind aufgebraucht")).toEqual({ used: ["Eier"] });
    expect(pantrySentence("Morgen um 9 Zahnarzt")).toBeNull();
  });
});

describe("Ehrlich in Kochidee, Rezepten, Essen", () => {
  it("„alles im Haus“ nur in der ersten Hälfte, sonst „vermutlich im Haus“", () => {
    expect(stockLine(matchStock(["Joghurt", "Salz"], [item("Joghurt", 2)], T))).toEqual({ text: "alles im Haus", tone: "gut" });
    expect(stockLine(matchStock(["Joghurt"], [item("Joghurt", 5)], T))).toEqual({ text: "vermutlich im Haus: Joghurt", tone: "grau" });
    expect(stockLine(matchStock(["Joghurt", "Lachs"], [item("Joghurt", 5)], T))).toEqual({ text: "auf die Liste: Lachs", tone: "liste" });
  });

  it("leeres „Im Haus“: nie „im Haus“, nur „auf die Liste“", () => {
    expect(stockLine(matchStock(["Hack", "Tomaten", "Salz"], [], T)).text).toBe("auf die Liste: Hack, Tomaten");
  });
});

describe("Abgleich", () => {
  it("ohne Mengen, gemerkte Orte als eigener Eintrag; alte Geräte mit Mengen werden sauber gelesen", () => {
    const a = ADAPTERS.find((x) => x.name === "vorrat")!;
    const value = { version: 4, items: [item("Milch")], places: { milch: "schrank" } };
    const docs = a.toDocs(value);
    expect(docs.map((d) => d.id)).toEqual(["vr:Milch", "vr:orte"]);
    expect(stableJson(a.fromDocs(docs, null))).toBe(stableJson(value));
    expect(a.fromDocs([{ ...docs[0], data: { id: "Milch", name: "2 Milch", amount: 2, unit: "", addedAt: T, place: "kuehlschrank" } }], null)).toEqual({
      version: 4,
      items: [{ id: "Milch", name: "Milch", addedAt: T, place: "kuehlschrank", usedAt: null }],
      places: {},
    });
  });
});

describe("Abgleich mit altem Stand", () => {
  it("Vorrat v2 (noch nicht migriert) wird bei der Übernahme mitgenommen – ohne Mengen", async () => {
    const { detectChanges, emptyState } = await import("@/lib/konten/sync/engine");
    const data = new Map<string, Record<string, unknown>>([["wasgibts.vorrat", { version: 2, items: [{ id: "p1", name: "3 Karotten", amount: 3, unit: "", addedAt: T, place: "kuehlschrank" }] }]]);
    const io = { read: (k: string) => data.get(k) ?? null, write: (k: string, v: Record<string, unknown>) => void data.set(k, v), now: () => `${T}T08:00:00.000Z` };
    const s = detectChanges({ ...emptyState("hh"), takeover: "fertig" }, io);
    const doc = s.queue.find((d) => d.id === "vr:p1");
    expect(doc?.data).toEqual({ id: "p1", name: "Karotten", addedAt: T, place: "obstgemuese", usedAt: null });
  });
});
