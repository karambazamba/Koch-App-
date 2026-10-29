// Stammliste: Kaufrhythmus lernen, fällige Stammartikel, anlegen/entfernen
// (staples.ts). Woche ab Mo 2026-10-19.
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ListItem, ShoppingList, ShoppingListStore, Staple } from "@/lib/einkauf/listModel";
import { at, fakeWindow } from "../helpers";

const W = "2026-10-19";
const staple = (over: Partial<Staple>): Staple => ({ id: over.name ?? "s", name: "Milch", amount: "", section: "kuehlregal", purchases: [], intervalDays: null, active: true, ...over });
const listOf = (names: string[]): ShoppingList => ({ items: names.map((name) => ({ name }) as ListItem), angebot: [], missing: [], openCount: names.length, doneCount: 0 });

let w: ReturnType<typeof fakeWindow>;
const saved = () => JSON.parse(w.localStorage.getItem("wasgibts.einkaufsliste")!) as ShoppingListStore;

beforeEach(() => {
  at("2026-10-20T08:00");
  vi.resetModules();
  w = fakeWindow();
});

describe("Kaufrhythmus", () => {
  it("fest oder gelernt (Median, Käufe in derselben Woche zählen nicht)", async () => {
    const { isStaple, rhythmLabel, stapleInterval } = await import("@/lib/einkauf/staples");
    expect(stapleInterval(staple({ intervalDays: 7 }))).toBe(7);
    expect(stapleInterval(staple({ purchases: ["2026-10-01"] }))).toBeNull();
    expect(stapleInterval(staple({ purchases: ["2026-10-01", "2026-10-02"] }))).toBeNull();
    expect(stapleInterval(staple({ purchases: ["2026-10-15", "2026-10-01", "2026-10-08", "2026-10-08", "2026-10-29"] }))).toBe(7);
    expect(isStaple(staple({ intervalDays: 7, active: false }))).toBe(false);
    expect(isStaple(staple({ purchases: ["2026-10-01", "2026-10-15"] }))).toBe(true);
    expect(rhythmLabel(7)).toBe("jede Woche");
    expect(rhythmLabel(10)).toBe("jede Woche");
    expect(rhythmLabel(14)).toBe("alle 2 Wochen");
    expect(rhythmLabel(30)).toBe("alle 4 Wochen");
  });
});

describe("Fällige Stammartikel", () => {
  it("nie gekauft, Rhythmus erreicht – nicht wenn auf der Liste, übersprungen, inaktiv oder diese Woche gekauft", async () => {
    const { dueStaples } = await import("@/lib/einkauf/staples");
    const staples = [
      staple({ id: "neu", name: "Brot", intervalDays: 7 }),
      staple({ id: "faellig", name: "Milch", intervalDays: 7, purchases: ["2026-10-12"] }),
      staple({ id: "frisch", name: "Butter", intervalDays: 14, purchases: ["2026-10-12"] }),
      staple({ id: "woche", name: "Eier", intervalDays: 7, purchases: ["2026-10-19"] }),
      staple({ id: "liste", name: "Käse", intervalDays: 7 }),
      staple({ id: "skip", name: "Obst", intervalDays: 7 }),
      staple({ id: "aus", name: "Joghurt", intervalDays: 7, active: false }),
      staple({ id: "unklar", name: "Saft" }),
    ];
    const due = dueStaples(staples, W, listOf([" käse "]), { manual: [], checked: [], have: [], skippedStaples: ["skip"] });
    expect(due.map((s) => s.id)).toEqual(["neu", "faellig"]);
    expect(dueStaples(staples, W, listOf([])).map((s) => s.id)).toEqual(["neu", "faellig", "liste", "skip"]);
  });
});

describe("Stammliste ändern", () => {
  it("anlegen, wieder aktivieren, entfernen", async () => {
    const { addStaple, removeStaple } = await import("@/lib/einkauf/staples");
    addStaple("  ");
    expect(w.localStorage.getItem("wasgibts.einkaufsliste")).toBeNull();
    addStaple(" Hafermilch ", " 2 ", 14);
    const neu = saved().staples.find((s) => s.name === "Hafermilch")!;
    expect(neu).toMatchObject({ amount: "2", section: "kuehlregal", intervalDays: 14, active: true, purchases: [] });
    removeStaple(neu.id);
    expect(saved().staples.find((s) => s.id === neu.id)).toMatchObject({ active: false, intervalDays: null, purchases: [] });
    addStaple("hafermilch");
    expect(saved().staples.find((s) => s.id === neu.id)).toMatchObject({ active: true, intervalDays: 7 });
    addStaple("Milch", "", 10); // Standard-Stammartikel mit festem Rhythmus bleibt bei 7
    expect(saved().staples.find((s) => s.name === "Milch")?.intervalDays).toBe(7);
  });

  it("Käufe merken: höchstens 12, nicht doppelt am selben Tag, leerer Name nichts", async () => {
    const { recordPurchase } = await import("@/lib/einkauf/staples");
    const brot = { key: "m:1", name: "Brot", originalName: "Brot", amount: "1", section: "brot", dishes: [], days: [], shop: "", checked: false, hidden: false } as ListItem;
    recordPurchase({ ...brot, name: " " }, true, "2026-10-01");
    for (let d = 1; d <= 14; d++) recordPurchase(brot, true, `2026-09-${String(d).padStart(2, "0")}`);
    recordPurchase(brot, true, "2026-09-14");
    const purchases = saved().staples.find((s) => s.name === "Brot")!.purchases;
    expect(purchases).toHaveLength(12);
    expect(purchases.at(-1)).toBe("2026-09-14");
    recordPurchase({ ...brot, name: "Unbekannt" }, false, "2026-09-14");
    expect(saved().staples.some((s) => s.name === "Unbekannt")).toBe(false);
  });
});
