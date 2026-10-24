// Einwilligungen (Platz 23): KI nur mit OK, Widerruf wirkt sofort, neue
// Textfassung = einmal neu fragen, Fremdes wird verworfen, mit Konto geht
// jede Änderung an den Server; „Auf diesem Gerät löschen“ leert alles.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { at, fakeWindow } from "../helpers";

beforeEach(() => {
  vi.resetModules();
  at("2026-10-24T09:00");
});

describe("Einwilligungen", () => {
  it("KI nur mit OK; Widerruf wirkt sofort", async () => {
    fakeWindow();
    const e = await import("@/lib/datenschutz/einwilligung");
    expect(e.einwilligungErteilt("ki")).toBe(false);
    e.setEinwilligung("ki", true);
    expect(e.einwilligungErteilt("ki")).toBe(true);
    e.setEinwilligung("ki", false);
    expect(e.einwilligungErteilt("ki")).toBe(false);
  });

  it("neue Textfassung: einmal neu fragen; ein Nein zur aktuellen Fassung gilt als beantwortet", async () => {
    const e = await import("@/lib/datenschutz/einwilligung");
    const alt = { version: 1 as const, arten: { ki: { ja: true, version: 0, at: "2026-01-01T00:00:00Z" } } };
    expect(e.erteilt(alt, "ki")).toBe(false);
    expect(e.offenGefragt(alt, "ki")).toBe(true);
    const nein = { version: 1 as const, arten: { ki: { ja: false, version: e.TEXT_VERSION.ki, at: "2026-10-01T00:00:00Z" } } };
    expect(e.offenGefragt(nein, "ki")).toBe(false);
    expect(e.offenGefragt({ version: 1, arten: {} }, "bedingungen")).toBe(true);
  });

  it("Fremdes wird verworfen", async () => {
    const { migrateEinwilligungen } = await import("@/lib/datenschutz/einwilligung");
    expect(migrateEinwilligungen(null)).toBeNull();
    expect(migrateEinwilligungen({ version: 2 })).toBeNull();
    expect(migrateEinwilligungen({ version: 1, arten: { ki: { ja: "ja" }, bedingungen: { ja: true, version: 1, at: "x" }, fremd: { ja: true, version: 1, at: "x" } } })).toEqual({ version: 1, arten: { bedingungen: { ja: true, version: 1, at: "x" } } });
  });

  it("jede Änderung geht an die Abnehmer (Server-Nachweis mit Konto)", async () => {
    fakeWindow();
    const e = await import("@/lib/datenschutz/einwilligung");
    const seen: string[] = [];
    const stop = e.onEinwilligung((art, x) => seen.push(`${art}:${x.ja}:${x.version}`));
    e.setEinwilligung("bedingungen", true);
    e.setEinwilligung("mails", false);
    stop();
    e.setEinwilligung("ki", true);
    expect(seen).toEqual(["bedingungen:true:1", "mails:false:1"]);
    expect(e.alleEinwilligungen().map(([a]) => a).sort()).toEqual(["bedingungen", "ki", "mails"]);
  });
});

describe("Auf diesem Gerät löschen", () => {
  it("leert Web Storage und entfernt die eigenen Datenbanken", async () => {
    const win = fakeWindow({ "wasgibts.eintraege": "{}", "wasgibts.einwilligungen": "{}" }, { "wasgibts.verlauf": "[]" });
    const deleted: string[] = [];
    (win as unknown as { indexedDB: unknown }).indexedDB = {
      deleteDatabase: (name: string) => {
        deleted.push(name);
        const req: { onsuccess?: () => void } = {};
        setTimeout(() => req.onsuccess?.(), 0);
        return req;
      },
    };
    const { wipeDevice } = await import("@/lib/core/localStore");
    await wipeDevice();
    expect(win.localStorage.length).toBe(0);
    expect(win.sessionStorage.length).toBe(0);
    expect(deleted).toEqual(["wasgibts-memos"]);
  });
});
