import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KI_ERLAUBT, memoryStorage } from "../helpers";
import { codeScreenNoetig } from "@/lib/begleitung/codeAbfrage";

type Abfrage = typeof import("@/lib/begleitung/codeAbfrage");
let local: Storage;
let abfrage: Abfrage;

/** App öffnen: Speicher bleibt (Neustart), die Sitzung (Module) ist frisch */
async function oeffnen(storage = memoryStorage({ ...KI_ERLAUBT })) {
  local = storage;
  (globalThis as { window?: unknown }).window = {
    localStorage: local,
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    location: { search: "", pathname: "/", href: "http://localhost/" },
  };
  vi.resetModules();
  abfrage = await import("@/lib/begleitung/codeAbfrage");
}

/** Steht der Bildschirm? Gleiche Rechnung wie `CodeGate` (askCode = KI braucht Code, er fehlt bzw. passt nicht) */
function steht(askCode: boolean, ready = true) {
  const s = abfrage.codeScreenState();
  return codeScreenNoetig({ askCode, later: s.later, requested: s.open, ready });
}

beforeEach(async () => {
  await oeffnen();
});
afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
});

describe("Testcode gleich am Anfang", () => {
  it("rein: nie vor Hallo/Zustimmung; sonst wenn der Code fehlt und nicht „Später“ – oder angefordert", () => {
    expect(codeScreenNoetig({ askCode: true, later: false, requested: false, ready: false })).toBe(false);
    expect(codeScreenNoetig({ askCode: true, later: false, requested: true, ready: false })).toBe(false);
    expect(codeScreenNoetig({ askCode: true, later: false, requested: false, ready: true })).toBe(true);
    expect(codeScreenNoetig({ askCode: true, later: true, requested: false, ready: true })).toBe(false);
    expect(codeScreenNoetig({ askCode: false, later: false, requested: false, ready: true })).toBe(false);
    expect(codeScreenNoetig({ askCode: true, later: true, requested: true, ready: true })).toBe(true);
  });

  it("neuer Nutzer: erst nach Hallo/Zustimmung, dann steht der Bildschirm", () => {
    expect(steht(true, false)).toBe(false);
    expect(steht(true)).toBe(true);
  });

  it("Bestandsnutzer ohne Code: beim nächsten Öffnen; mit gültigem Code nicht", async () => {
    await oeffnen(memoryStorage({ ...KI_ERLAUBT, "wasgibts.profil": "{}" }));
    expect(steht(true)).toBe(true);
    expect(steht(false)).toBe(false);
  });

  it("„Später“: gemerkt, auch nach Neustart; erster KI-Versuch holt den Bildschirm einmal je Sitzung", async () => {
    abfrage.setCodeLater(true);
    expect(steht(true)).toBe(false);
    await oeffnen(local);
    expect(local.getItem("wasgibts.zugangscode.spaeter")).toBe("1");
    expect(steht(true)).toBe(false);
    abfrage.onKiVersuchOhneCode();
    expect(abfrage.codeScreenState()).toMatchObject({ open: true, change: false, later: true });
    expect(steht(true)).toBe(true);
    // wieder „Später“ → in dieser Sitzung nicht noch einmal von selbst
    abfrage.closeCodeScreen();
    abfrage.onKiVersuchOhneCode();
    expect(steht(true)).toBe(false);
    // neue Sitzung: wieder einmal
    await oeffnen(local);
    abfrage.onKiVersuchOhneCode();
    expect(steht(true)).toBe(true);
  });

  it("richtiger Code setzt „Später“ zurück; „Testcode ändern“ öffnet mit change", () => {
    abfrage.setCodeLater(true);
    abfrage.setCodeLater(false);
    expect(local.getItem("wasgibts.zugangscode.spaeter")).toBeNull();
    abfrage.requestCodeScreen(true);
    expect(abfrage.codeScreenState()).toMatchObject({ open: true, change: true });
    const a = abfrage.codeScreenState();
    expect(abfrage.codeScreenState()).toBe(a);
    abfrage.resetCodeAbfrageForTests();
    expect(abfrage.codeScreenState().open).toBe(false);
  });

  it("ohne Speicher gilt nichts als „Später“", async () => {
    delete (globalThis as { window?: unknown }).window;
    expect(abfrage.codeLater()).toBe(false);
    abfrage.setCodeLater(true);
  });
});
