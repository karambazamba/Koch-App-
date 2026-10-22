// Grundregel beim Aufräumen: Eine echte Sicherungsdatei von heute (v0.47,
// über „Daten sichern“ erzeugt) lässt sich weiter einspielen, und alle
// Speicher lesen ihre Daten daraus – auch nach Umbauten.
import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { backupSummary, parseBackup, restoreBackup } from "@/lib/core/backup";
import { memoryStorage } from "../helpers";

const file = readFileSync(new URL("../fixtures/sicherung-v0.47.json", import.meta.url), "utf8");
const storage = memoryStorage();

beforeAll(() => {
  (globalThis as { window?: unknown }).window = { localStorage: storage, addEventListener() {}, removeEventListener() {} };
});

describe("Sicherung von v0.47", () => {
  it("wird erkannt und richtig zusammengefasst", () => {
    const backup = parseBackup(file);
    expect(backup?.version).toBe("0.47.0");
    expect(backupSummary(backup!)).toBe("3 Termine, 2 Aufgaben, 1 Notiz, 1 Rezept, 4 Sachen im Vorrat, 1 Sprachnachricht (nicht gesichert), 3 Personen");
  });

  it("enthält keine Tonaufnahmen, Zugangscode oder Geräte-Daten", () => {
    const backup = parseBackup(file)!;
    expect(JSON.parse(backup.data["wasgibts.pinnwand"]).memos).toEqual([]);
    expect(Object.keys(backup.data).some((k) => /zugangscode|geraet|anfragen|verbrauch/.test(k))).toBe(false);
  });

  it("lässt sich einspielen – alle Speicher lesen ihre Daten", async () => {
    restoreBackup(parseBackup(file)!, storage);
    const { loadProfile } = await import("@/lib/einstellungen/profileStore");
    const { loadEntries } = await import("@/lib/kalender/store");
    const { loadNotes } = await import("@/lib/notizen/store");
    const { loadPantry } = await import("@/lib/vorrat/pantry");
    const { loadPins, loadMemos } = await import("@/lib/pinnwand/store");
    const { loadHomeTiles } = await import("@/lib/core/homeLayout");
    const { loadShoppingSettings } = await import("@/lib/einkauf/shoppingList");
    expect(loadProfile()?.persons.map((p) => p.name)).toEqual(["Lisa", "Felix", "Mathis"]);
    expect(loadEntries().map((e) => e.data.title)).toEqual(["Zahnarzt", "Elternabend", "Fußball Mathis", "Kita-Formular abgeben", "Geschenk für Oma"]);
    expect(loadNotes().map((n) => n.data.title)).toContain("WLAN");
    expect(loadPantry().map((p) => p.name)).toEqual(["Joghurt", "Paprika", "Reis", "Erbsen"]);
    expect(loadPins()).toEqual([]);
    expect(loadMemos()).toEqual([]);
    expect(loadHomeTiles().length).toBeGreaterThan(3);
    expect(loadShoppingSettings().itemShops.milch).toBe("Rewe");
  });
});
