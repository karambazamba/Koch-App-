import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow, noBrowser } from "../helpers";

afterEach(() => noBrowser());

const WEEK = "2026-10-19";

// Fehler (gefunden beim Aufräumen, Etappe 8): Löschen auf der Einkaufsliste,
// in der Stammliste und im Vorrat-Fenster ging still – ohne „Gelöscht ·
// Rückgängig“. Die Speicher liefern jetzt das Zurücknehmen.
describe("Löschen mit Rückgängig", () => {
  it("eigener Artikel kommt an dieselbe Stelle zurück", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-22T10:00");
    const { addManualItem, removeManualItem } = await import("@/lib/einkauf/listEdits");
    const { store } = await import("@/lib/einkauf/listStore");
    const names = () => store.load()!.weeks[WEEK].manual.map((m) => m.name);
    addManualItem(WEEK, { name: "Milch", amount: "", section: "kuehlregal" });
    const brot = addManualItem(WEEK, { name: "Brot", amount: "", section: "brot" });
    addManualItem(WEEK, { name: "Äpfel", amount: "", section: "obst-gemuese" });
    const undo = removeManualItem(WEEK, brot);
    expect(names()).toEqual(["Milch", "Äpfel"]);
    undo();
    expect(names()).toEqual(["Milch", "Brot", "Äpfel"]);
    undo();
    expect(names()).toEqual(["Milch", "Brot", "Äpfel"]);
  });

  it("Stammartikel ist nach dem Zurücknehmen wieder aktiv, mit Rhythmus", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-22T10:00");
    const { addStaple, removeStaple } = await import("@/lib/einkauf/staples");
    const { loadShoppingSettings } = await import("@/lib/einkauf/listStore");
    addStaple("Hafermilch", "", 14);
    const st = () => loadShoppingSettings().staples.find((s) => s.name === "Hafermilch")!;
    const undo = removeStaple(st().id);
    expect(st().active).toBe(false);
    undo();
    expect(st()).toMatchObject({ active: true, intervalDays: 14 });
  });
});
