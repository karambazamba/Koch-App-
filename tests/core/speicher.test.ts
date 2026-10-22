import { describe, expect, it } from "vitest";
import { backupSummary, createBackup, parseBackup, restoreBackup } from "@/lib/core/backup";
import { STORAGE, removeRetiredKeys } from "@/lib/core/storage";
import { migrateHelper, migrateProfile } from "@/lib/einstellungen/profileStore";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { memoryStorage } from "../helpers";

describe("Verzeichnis der gespeicherten Daten", () => {
  it("jeder Schlüssel steht genau einmal drin", () => {
    const keys = STORAGE.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("alte Schlüssel werden gelöscht, alles andere bleibt", () => {
    const local = memoryStorage({ "wasgibts.bewertungen": "{}", "wasgibts.hinweise": "{}", "wasgibts.eintraege": "{}" });
    const session = memoryStorage({ "wasgibts.entwicklung": "1" });
    removeRetiredKeys(local, session);
    expect(local.getItem("wasgibts.bewertungen")).toBeNull();
    expect(local.getItem("wasgibts.hinweise")).toBeNull();
    expect(local.getItem("wasgibts.eintraege")).toBe("{}");
    expect(session.getItem("wasgibts.entwicklung")).toBeNull();
  });
});

describe("Daten sichern und wiederherstellen", () => {
  const entries = JSON.stringify({ version: 2, entries: [{ typ: "termin" }, { typ: "aufgabe" }, { typ: "aufgabe" }] });

  it("sichert Familien-Daten, aber nicht Zugangscode und Zähler", () => {
    const store = memoryStorage({ "wasgibts.eintraege": entries, "wasgibts.zugangscode": "geheim", "wasgibts.lotte.anfragen": "{}" });
    const backup = createBackup(store);
    expect(Object.keys(backup.data)).toEqual(["wasgibts.eintraege"]);
  });

  it("Vorschau: was in der Datei steckt", () => {
    const backup = parseBackup(JSON.stringify({ app: "was-gibts", version: "0.25.0", exportedAt: "", data: { "wasgibts.eintraege": entries } }));
    expect(backup && backupSummary(backup)).toBe("1 Termin, 2 Aufgaben");
  });

  it("fremde Dateien und Geräte-Daten werden nicht übernommen", () => {
    expect(parseBackup("{}")).toBeNull();
    const backup = parseBackup(JSON.stringify({ app: "was-gibts", data: { "wasgibts.zugangscode": "x", "fremd.key": "1", "wasgibts.notizen": "{}" } }));
    expect(Object.keys(backup!.data)).toEqual(["wasgibts.notizen"]);
  });

  it("Wiederherstellen ersetzt die Daten, Zugangscode bleibt", () => {
    const store = memoryStorage({ "wasgibts.notizen": "alt", "wasgibts.pinnwand": "alt", "wasgibts.zugangscode": "geheim" });
    restoreBackup({ app: "was-gibts", version: "", exportedAt: "", data: { "wasgibts.notizen": "neu" } }, store);
    expect(store.getItem("wasgibts.notizen")).toBe("neu");
    expect(store.getItem("wasgibts.pinnwand")).toBeNull();
    expect(store.getItem("wasgibts.zugangscode")).toBe("geheim");
  });
});

describe("Profil-Migration", () => {
  it("altes Profil (v1) wird zur aktuellen Version, Familie bleibt", () => {
    const p = migrateProfile({ version: 1, adults: 1, kids: 1, persons: [{ id: "a", role: "erwachsen", name: "Lisa" }, { id: "k", role: "kind", name: "Ella" }], warmMeal: "abends" });
    expect(p?.version).toBe(20);
    expect(p?.persons.map((x) => x.name)).toEqual(["Lisa", "Ella"]);
    expect(p?.householdType).toBe("familie");
    expect(p?.warmMeal.weekday).toBe("abends");
  });

  it("Begleitung: ohne Namen Mia (alte Profile bis v6 Lotte), Theo wird Assistent in Nachtblau", () => {
    expect(migrateHelper({}).name).toBe("Mia");
    expect(migrateHelper({}, "Lotte").name).toBe("Lotte");
    expect(migrateProfile({ version: 6, adults: 1, kids: 0, persons: [{ id: "a", role: "erwachsen", name: "Lisa" }] })?.helper.name).toBe("Lotte");
    expect(migrateProfile({ version: 19, adults: 1, kids: 0, persons: [{ id: "a", role: "erwachsen", name: "Lisa" }], helper: { name: "" } })?.helper.name).toBe("Mia");
    expect(migrateHelper({ name: "Theo" })).toMatchObject({ art: "assistent", farbe: "nachtblau", voice: "maennlich" });
  });

  it("Ansicht (v20): ohne eigene Wahl Hell, Dunkel bleibt, neue Profile Hell", () => {
    const base = { adults: 1, kids: 0, persons: [{ id: "a", role: "erwachsen", name: "Lisa" }] };
    expect(migrateProfile({ ...base, version: 19, theme: "auto" })).toMatchObject({ theme: "warm", themeSet: false });
    expect(migrateProfile({ ...base, version: 19, theme: "nacht" })).toMatchObject({ theme: "nacht", themeSet: true });
    expect(migrateProfile({ ...base, version: 20, theme: "auto", themeSet: true })).toMatchObject({ theme: "auto", themeSet: true });
    expect(createEmptyProfile().theme).toBe("warm");
  });

  it("unbekannte Daten ergeben kein Profil", () => {
    expect(migrateProfile({ version: 999 })).toBeNull();
    expect(migrateProfile("kaputt")).toBeNull();
  });
});
