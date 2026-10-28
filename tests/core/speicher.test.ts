import { describe, expect, it, vi } from "vitest";
import { backupSummary, createBackup, parseBackup, restoreBackup } from "@/lib/core/backup";
import { STORAGE, removeRetiredKeys } from "@/lib/core/storage";
import { migrateHelper, migrateProfile } from "@/lib/einstellungen/profileStore";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { fakeWindow, memoryStorage, noBrowser } from "../helpers";

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
    // Die Hinweis-Warteschlange ist ein lebender Schlüssel (A-027)
    expect(local.getItem("wasgibts.hinweise")).toBe("{}");
    expect(local.getItem("wasgibts.eintraege")).toBe("{}");
    expect(session.getItem("wasgibts.entwicklung")).toBeNull();
  });
});

describe("Ausmustern löscht nie einen lebenden Schlüssel (A-027)", () => {
  it("kein Schlüssel aus dem Verzeichnis wird beim Start gelöscht", () => {
    const alle = Object.fromEntries(STORAGE.filter((s) => s.area !== "indexeddb").map((s) => [s.key, "{}"]));
    const local = memoryStorage(alle);
    const session = memoryStorage(alle);
    removeRetiredKeys(local, session);
    const weg = Object.keys(alle).filter((k) => local.getItem(k) === null || session.getItem(k) === null);
    expect(weg).toEqual([]);
  });

  it("Hinweis-Warteschlange übersteht den Start: jeder Hinweis nur einmal", async () => {
    const win = fakeWindow({ "wasgibts.hinweise": JSON.stringify({ version: 1, gezeigt: { einladen: "2026-10-04" } }) });
    removeRetiredKeys(win.localStorage, win.sessionStorage);
    vi.resetModules();
    const h = await import("@/lib/core/hinweise");
    const gezeigt = JSON.parse(win.localStorage.getItem("wasgibts.hinweise")!).gezeigt;
    expect(gezeigt).toEqual({ einladen: "2026-10-04" });
    expect(h.abgelaufen(gezeigt, "einladen", "2026-10-05")).toBe(true);
    noBrowser();
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
    expect(p?.version).toBe(22);
    expect(p?.persons.map((x) => x.name)).toEqual(["Lisa", "Ella"]);
    expect(p?.householdType).toBe("familie");
    expect(p?.warmMeal.weekday).toBe("abends");
  });

  it("Begleitung (v22): immer Mia – Lotte, Theo und eigene Namen werden Mia, einmal Bescheid sagen", () => {
    expect(migrateHelper()).toEqual({ name: "Mia", art: "assistentin", voice: "weiblich", farbe: "orange" });
    const lisa = { adults: 1, kids: 0, persons: [{ id: "a", role: "erwachsen", name: "Lisa" }] };
    expect(migrateProfile({ version: 6, ...lisa })).toMatchObject({ helper: { name: "Mia" }, miaNotice: true });
    expect(migrateProfile({ version: 19, ...lisa, helper: { name: "" } })).toMatchObject({ helper: { name: "Mia" }, miaNotice: false });
    expect(migrateProfile({ version: 21, ...lisa, helper: { name: "Theo", art: "assistent" } })).toMatchObject({ helper: { name: "Mia", art: "assistentin", voice: "weiblich" }, miaNotice: true });
    expect(migrateProfile({ version: 21, ...lisa, helper: { name: "mia" } })!.miaNotice).toBe(false);
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
