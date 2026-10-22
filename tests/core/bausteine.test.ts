import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";

const KEY = "wasgibts.funktionen";

async function load(local: Record<string, string> = {}) {
  const win = fakeWindow(local);
  vi.resetModules();
  const mod = await import("@/lib/core/features");
  return { win, ...mod };
}

afterEach(() => {
  vi.unstubAllGlobals();
  noBrowser();
});

describe("Bausteine an und aus", () => {
  it("startet alles aus und schaltet einzeln", async () => {
    const { win, featureOn, setFeature } = await load();
    expect(featureOn("vorrat")).toBe(false);
    expect(setFeature("vorrat", true)).toBe(true);
    expect(setFeature("vorrat", true)).toBe(false);
    expect(featureOn("vorrat")).toBe(true);
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 2, on: ["vorrat"] });
    expect(setFeature("vorrat", false)).toBe(true);
    expect(featureOn("vorrat")).toBe(false);
    expect(setFeature("vorrat", false)).toBe(false);
  });

  it("Spontan-Ideen bringen die Ideen-Seite mit", async () => {
    const { featureOn, setFeature } = await load();
    expect(featureOn("ideen")).toBe(false);
    setFeature("spontan", true);
    expect(featureOn("ideen")).toBe(true);
  });

  it("Freischalten durch Lotte nur, wenn vorher aus", async () => {
    const { unlockFeature, featureOn } = await load();
    expect(unlockFeature("rezepte")).toBe(true);
    expect(featureOn("rezepte")).toBe(true);
    expect(unlockFeature("rezepte")).toBe(false);
  });

  it("jeder Baustein hat Name, Satz und Ort; Tipps aus der Region nicht in der Liste", async () => {
    const { BAUSTEINE, bausteinOf, TIPS_BAUSTEIN } = await load();
    for (const b of BAUSTEINE) {
      expect(b.name && b.text && b.where && b.icon).toBeTruthy();
      expect(bausteinOf(b.feature)).toBe(b);
    }
    expect(bausteinOf("regiontipps")).toBeUndefined();
    expect(TIPS_BAUSTEIN.feature).toBe("regiontipps");
    expect(bausteinOf("modi")).toBeUndefined();
  });
});

describe("Bausteine: Migration", () => {
  it("v2: Unbekanntes fliegt raus", async () => {
    const { featureOn } = await load({ [KEY]: JSON.stringify({ version: 2, on: ["vorrat", "quatsch", 3] }) });
    expect(featureOn("vorrat")).toBe(true);
    const { featureOn: on2 } = await load({ [KEY]: JSON.stringify({ version: 2, on: "vorrat" }) });
    expect(on2("vorrat")).toBe(false);
  });

  it("unbekannte Version oder kaputt = alles aus", async () => {
    expect((await load({ [KEY]: JSON.stringify({ version: 9, on: ["vorrat"] }) })).featureOn("vorrat")).toBe(false);
    expect((await load({ [KEY]: "null" })).featureOn("vorrat")).toBe(false);
    expect((await load({ [KEY]: "{kaputt" })).featureOn("vorrat")).toBe(false);
  });

  it("v1 ohne alten Test-Schalter: freigeschaltete bleiben, wird als v2 zurückgeschrieben", async () => {
    const { win, featureOn } = await load({ [KEY]: JSON.stringify({ version: 1, legacy: false, unlocked: ["wochenplan", "nix"] }) });
    expect(featureOn("wochenplan")).toBe(true);
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 2, on: ["wochenplan"] });
    const { featureOn: on2 } = await load({ [KEY]: JSON.stringify({ version: 1 }) });
    expect(on2("wochenplan")).toBe(false);
  });

  it("v1 mit altem Test-Schalter: Genutztes wird als Baustein übernommen", async () => {
    const local = {
      [KEY]: JSON.stringify({ version: 1, legacy: true, unlocked: ["tipps"] }),
      "wasgibts.wochenplan": JSON.stringify({ weeks: { "2026-10-19": { Mo: { kind: "recipe" }, Di: null } } }),
      "wasgibts.vorrat": JSON.stringify({ items: [{ name: "Milch" }] }),
      "wasgibts.kochbuch": JSON.stringify({ recipes: { a: { kind: "kochen" }, b: { kind: "backen" } } }),
      "wasgibts.tippkarten": JSON.stringify({ seen: [] }),
      "wasgibts.wuensche": JSON.stringify({ list: [] }),
      "familienkueche.haushaltsprofil": JSON.stringify({ likes: { Käse: 3 }, helperMode: "locker" }),
    };
    const win = fakeWindow(local);
    vi.stubGlobal("localStorage", win.localStorage);
    vi.resetModules();
    const { featureOn } = await import("@/lib/core/features");
    for (const f of ["tipps", "wochenplan", "vorrat", "rezepte", "backen", "spontan", "ideen", "kochstil", "modi"] as const) expect(featureOn(f), f).toBe(true);
    expect(featureOn("wochenendIdeen")).toBe(false);
  });

  it("v1 mit Test-Schalter, aber nichts genutzt (und kaputte Daten) = nichts übernommen", async () => {
    const local = {
      [KEY]: JSON.stringify({ version: 1, legacy: true }),
      "wasgibts.wochenplan": "{kaputt",
      "wasgibts.kochbuch": JSON.stringify({ recipes: {} }),
      "familienkueche.haushaltsprofil": JSON.stringify({ neverAgain: [], helperMode: "normal" }),
    };
    const win = fakeWindow(local);
    vi.stubGlobal("localStorage", win.localStorage);
    vi.resetModules();
    const { featureOn } = await import("@/lib/core/features");
    for (const f of ["wochenplan", "vorrat", "rezepte", "kochstil", "modi", "spontan"] as const) expect(featureOn(f), f).toBe(false);
  });

  it("v1 mit Test-Schalter: 'Nie wieder' zählt als Kochstil", async () => {
    const win = fakeWindow({
      [KEY]: JSON.stringify({ version: 1, legacy: true }),
      "familienkueche.haushaltsprofil": JSON.stringify({ neverAgain: ["Leber"] }),
      "wasgibts.ideen": JSON.stringify({ day: "x" }),
    });
    vi.stubGlobal("localStorage", win.localStorage);
    vi.resetModules();
    const { featureOn } = await import("@/lib/core/features");
    expect(featureOn("kochstil")).toBe(true);
    expect(featureOn("spontan")).toBe(true);
  });
});

describe("Einmalige Hinweise und Dunkel-Tipp", () => {
  it("Hinweis einmal gezeigt = gemerkt (ohne Doppel)", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const { markHintSeen } = await import("@/lib/core/hints");
    markHintSeen("kachel-hinzufuegen");
    markHintSeen("kachel-hinzufuegen");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.einmalhinweise")!)).toEqual({ version: 1, seen: ["kachel-hinzufuegen"] });
  });

  it("Hinweise: kaputte Liste wird zu leer", async () => {
    const win = fakeWindow({ "wasgibts.einmalhinweise": JSON.stringify({ version: 1, seen: "x" }) });
    vi.resetModules();
    const { markHintSeen } = await import("@/lib/core/hints");
    markHintSeen("kachel-hinzufuegen");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.einmalhinweise")!).seen).toEqual(["kachel-hinzufuegen"]);
    fakeWindow({ "wasgibts.einmalhinweise": JSON.stringify({ version: 2 }) });
    vi.resetModules();
    const again = await import("@/lib/core/hints");
    expect(() => again.markHintSeen("kachel-hinzufuegen")).not.toThrow();
  });

  it("Dunkel-Tipp erst ab dem 3. Tag, nie nach eigener Wahl, Antwort = nie wieder", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const { noteDarkTipStart, finishDarkTip, showDarkTip } = await import("@/lib/core/darkTip");
    finishDarkTip(); // noch nichts gemerkt → nichts zu tun
    expect(win.localStorage.getItem("wasgibts.dunkeltipp")).toBeNull();
    noteDarkTipStart("2026-10-20");
    noteDarkTipStart("2026-10-21"); // erstes Öffnen bleibt
    const state = JSON.parse(win.localStorage.getItem("wasgibts.dunkeltipp")!);
    expect(state).toEqual({ version: 1, since: "2026-10-20", done: false });
    expect(showDarkTip(state, "2026-10-21", false)).toBe(false);
    expect(showDarkTip(state, "2026-10-22", false)).toBe(true);
    expect(showDarkTip(state, "2026-10-22", true)).toBe(false);
    expect(showDarkTip(null, "2026-10-22", false)).toBe(false);
    finishDarkTip();
    const done = JSON.parse(win.localStorage.getItem("wasgibts.dunkeltipp")!);
    expect(showDarkTip(done, "2026-11-30", false)).toBe(false);
  });

  it("Dunkel-Tipp: fremde Daten zählen nicht", async () => {
    const win = fakeWindow({ "wasgibts.dunkeltipp": JSON.stringify({ version: 1, since: 5 }) });
    vi.resetModules();
    const { noteDarkTipStart } = await import("@/lib/core/darkTip");
    noteDarkTipStart("2026-10-22");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.dunkeltipp")!).since).toBe("2026-10-22");
    fakeWindow({ "wasgibts.dunkeltipp": JSON.stringify({ version: 2 }) });
    vi.resetModules();
    const again = await import("@/lib/core/darkTip");
    again.noteDarkTipStart("2026-10-23");
  });
});
