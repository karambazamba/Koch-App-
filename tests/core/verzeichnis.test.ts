// Speicher-Verzeichnis, Sicherung, Seitennamen und kleine Text-Hilfen
import { describe, expect, it } from "vitest";
import { at, memoryStorage } from "../helpers";
import { BACKUP_KEYS, OLD_TERMINE_KEY, STORAGE, removeRetiredKeys } from "@/lib/core/storage";
import { backupFileName, backupSummary, createBackup, parseBackup, restoreBackup } from "@/lib/core/backup";
import { pageLabel } from "@/lib/core/pageLabel";
import { plural, withoutEmoji } from "@/lib/core/text";
import { WEEKDAYS_MO, WEEKDAYS_SHORT_SO } from "@/lib/core/days";

describe("Speicher-Verzeichnis", () => {
  it("jeder Schlüssel genau einmal; Zugangscode und Zähler nie in der Sicherung", () => {
    const keys = STORAGE.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(BACKUP_KEYS).toContain("wasgibts.eintraege");
    expect(BACKUP_KEYS).not.toContain("wasgibts.zugangscode");
    expect(BACKUP_KEYS).not.toContain("wasgibts.timer");
    expect(BACKUP_KEYS).not.toContain("wasgibts.beispiel");
    // Daten mit Format haben eine Version und einen Ort der Migration
    for (const s of STORAGE as readonly { key: string; version?: number; migration?: string }[]) if (s.version && s.version > 1) expect(s.migration, s.key).toBeTruthy();
  });

  it("alte Schlüssel beim Start löschen – lokal und in der Sitzung, Fehler still", () => {
    const local = memoryStorage({ "wasgibts.twists": "1", "wasgibts.eintraege": "x" });
    const session = memoryStorage({ "wasgibts.alleszeigen": "1" });
    removeRetiredKeys(local, session);
    expect(local.getItem("wasgibts.twists")).toBeNull();
    expect(local.getItem("wasgibts.eintraege")).toBe("x");
    expect(session.getItem("wasgibts.alleszeigen")).toBeNull();
    expect(() =>
      removeRetiredKeys({
        removeItem: () => {
          throw new Error("gesperrt");
        },
      }),
    ).not.toThrow();
  });
});

describe("Daten sichern und wiederherstellen", () => {
  it("Sicherung enthält nur Familien-Daten, ohne Sprachnachrichten", () => {
    at("2026-10-22T09:00");
    const local = memoryStorage({
      "wasgibts.eintraege": JSON.stringify({ version: 2, entries: [{ typ: "termin" }, { typ: "aufgabe" }, { typ: "aufgabe" }] }),
      "wasgibts.zugangscode": "geheim",
      "wasgibts.pinnwand": JSON.stringify({ version: 2, messages: [{ text: "Hallo" }], memos: [{ id: "m1" }, { id: "m2" }] }),
    });
    const backup = createBackup(local);
    expect(backup.app).toBe("was-gibts");
    expect(backup.exportedAt).toBe("2026-10-22T07:00:00.000Z");
    expect(Object.keys(backup.data).sort()).toEqual(["wasgibts.eintraege", "wasgibts.pinnwand"]);
    expect(JSON.parse(backup.data["wasgibts.pinnwand"])).toMatchObject({ memos: [], memosNichtGesichert: 2 });
    expect(backupSummary(backup)).toBe("1 Termin, 2 Aufgaben, 2 Sprachnachrichten (nicht gesichert)");
    expect(backupFileName()).toBe("was-gibts-sicherung-2026-10-22.json");
  });

  it("Pinnwand ohne Memos oder kaputt bleibt, wie sie ist", () => {
    const local = memoryStorage({ "wasgibts.pinnwand": "{kaputt", "wasgibts.notizen": JSON.stringify({ notes: [1] }) });
    const backup = createBackup(local);
    expect(backup.data["wasgibts.pinnwand"]).toBe("{kaputt");
    expect(backupSummary(backup)).toBe("1 Notiz");
  });

  it("prüft die Datei: fremde Dateien null, unbekannte und Geräte-Schlüssel raus", () => {
    expect(parseBackup("{kaputt")).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "andere", data: {} }))).toBeNull();
    expect(parseBackup(JSON.stringify({ app: "was-gibts" }))).toBeNull();
    const b = parseBackup(JSON.stringify({ app: "was-gibts", data: { "wasgibts.notizen": "{}", "wasgibts.zugangscode": "x", fremd: "y", "wasgibts.sport": 3, [OLD_TERMINE_KEY]: "[]" } }))!;
    expect(Object.keys(b.data).sort()).toEqual(["wasgibts.notizen", OLD_TERMINE_KEY].sort());
    expect(b.version).toBe("");
    expect(backupSummary(b)).toBe("Einstellungen");
  });

  it("Zusammenfassung zählt Rezepte, Vorrat, Trainings und Personen", () => {
    const b = parseBackup(
      JSON.stringify({
        app: "was-gibts",
        version: "0.47",
        data: {
          "wasgibts.kochbuch": JSON.stringify({ recipes: { a: {}, b: {} } }),
          "wasgibts.vorrat": JSON.stringify({ items: [1] }),
          "wasgibts.sport": JSON.stringify({ trainings: [1, 2, 3] }),
          "familienkueche.haushaltsprofil": JSON.stringify({ persons: [1, 2] }),
          "wasgibts.eintraege": "{kaputt",
        },
      }),
    )!;
    expect(backupSummary(b)).toBe("2 Rezepte, 1 Sache im Vorrat, 3 Trainings, 2 Personen");
  });

  it("einspielen ersetzt die Daten, Geräte-Daten und Memos dieses Geräts bleiben", () => {
    const local = memoryStorage({
      "wasgibts.notizen": "alt",
      "wasgibts.sport": "alt",
      "wasgibts.zugangscode": "geheim",
      "wasgibts.pinnwand": JSON.stringify({ version: 2, messages: [], memos: [{ id: "hier" }] }),
    });
    restoreBackup({ app: "was-gibts", version: "1", exportedAt: "", data: { "wasgibts.notizen": "neu", "wasgibts.pinnwand": JSON.stringify({ version: 2, messages: [{ text: "Hi" }], memos: [] }) } }, local);
    expect(local.getItem("wasgibts.notizen")).toBe("neu");
    expect(local.getItem("wasgibts.sport")).toBeNull();
    expect(local.getItem("wasgibts.zugangscode")).toBe("geheim");
    expect(JSON.parse(local.getItem("wasgibts.pinnwand")!)).toEqual({ version: 2, messages: [{ text: "Hi" }], memos: [{ id: "hier" }] });
  });

  it("einspielen ohne Pinnwand in der Sicherung bzw. mit kaputter: Memos bleiben trotzdem", () => {
    const local = memoryStorage({ "wasgibts.pinnwand": JSON.stringify({ memos: [{ id: "m" }] }) });
    restoreBackup({ app: "was-gibts", version: "1", exportedAt: "", data: {} }, local);
    expect(JSON.parse(local.getItem("wasgibts.pinnwand")!)).toEqual({ version: 2, messages: [], memos: [{ id: "m" }] });
    const broken = memoryStorage({ "wasgibts.pinnwand": JSON.stringify({ memos: [{ id: "m" }] }) });
    restoreBackup({ app: "was-gibts", version: "1", exportedAt: "", data: { "wasgibts.pinnwand": "{kaputt" } }, broken);
    expect(JSON.parse(broken.getItem("wasgibts.pinnwand")!)).toEqual({ version: 2, messages: [], memos: [{ id: "m" }] });
    const none = memoryStorage({ "wasgibts.pinnwand": "{kaputt" });
    restoreBackup({ app: "was-gibts", version: "1", exportedAt: "", data: {} }, none);
    expect(none.getItem("wasgibts.pinnwand")).toBeNull();
  });
});

describe("Seitennamen für den Zurück-Text", () => {
  it("kennt die Seiten, Reiter und sonst 'Zurück'", () => {
    expect(pageLabel(null)).toBe("Zurück");
    expect(pageLabel("/")).toBe("Heute");
    expect(pageLabel("/?seite=kalender")).toBe("Kalender");
    expect(pageLabel("/?seite=woche")).toBe("Kalender");
    expect(pageLabel("/?seite=essen")).toBe("Essen");
    expect(pageLabel("/?seite=quatsch")).toBe("Heute");
    expect(pageLabel("/kochbuch/rezept?id=1")).toBe("Rezept");
    expect(pageLabel("/gibtsnicht")).toBe("Zurück");
  });
});

describe("Text-Hilfen", () => {
  it("ohne Emojis, ohne doppelte Leerzeichen", () => {
    expect(withoutEmoji("☕ Kaffeepause")).toBe("Kaffeepause");
    expect(withoutEmoji("Laufen 🏃‍♀️ im  Park 🇩🇪")).toBe("Laufen im Park");
    expect(withoutEmoji("❤️ Liebling")).toBe("Liebling");
  });

  it("Einzahl und Mehrzahl, Wochentage ab Montag bzw. Sonntag", () => {
    expect(plural(1, "Person", "Personen")).toBe("1 Person");
    expect(plural(0, "Person", "Personen")).toBe("0 Personen");
    expect(WEEKDAYS_MO[0]).toBe("Montag");
    expect(WEEKDAYS_SHORT_SO[0]).toBe("So");
  });
});
