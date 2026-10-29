// Launch „Mia 1.0“: ausgeblendete Bausteine (nicht gelöscht), wer etwas schon
// nutzt, behält es; Mia schaltet nichts frei; nur Anmelden per E-Mail-Code.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";
import type { ChangeOp } from "@/lib/begleitung/ops";

beforeEach(() => vi.resetModules());
afterEach(() => noBrowser());

describe("Launch-Schnitt", () => {
  it("ausgeblendet: Mails, Tipps aus der Region, Spendentopf – Notizen, Sport, Wochenplan und Im Haus gehören zu 1.0", async () => {
    const { LAUNCH_AUS, launchSichtbar } = await import("@/lib/core/features");
    expect([...LAUNCH_AUS].sort()).toEqual(["mails", "regiontipps", "spendentopf"]);
    expect(launchSichtbar("notizen", [])).toBe(true);
    expect(launchSichtbar("sport", [])).toBe(true);
    expect(launchSichtbar("wochenplan", [])).toBe(true);
    expect(launchSichtbar("vorrat", [])).toBe(true);
    expect(launchSichtbar("spendentopf", [])).toBe(false);
    expect(launchSichtbar("spendentopf", ["spendentopf"])).toBe(true);
    expect(launchSichtbar("rezepte", [])).toBe(true);
  });

  it("neue Startseite ohne Spendentopf und Im Haus (nur über die Auswahl), mit Notizen", () => {
    expect(DEFAULT_HOME.filter((t) => t.visible).map((t) => t.id)).toEqual(["pinnwand", "wetter", "notizen", "termine", "aufgaben", "essen", "einkauf"]);
  });

  it("Mia schaltet Ausgeblendetes nicht frei, anderes schon", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    expect(f.unlockFeature("spendentopf")).toBe(false);
    expect(f.featureOn("spendentopf")).toBe(false);
    expect(f.unlockFeature("rezepte")).toBe(true);
    // Im Haus: für neue Nutzer an; abgeschaltet schaltet Mia es wieder frei
    expect(f.featureOn("vorrat")).toBe(true);
    f.setFeature("vorrat", false);
    expect(f.unlockFeature("vorrat")).toBe(true);
  });

  it("wer Sport oder den Spendentopf schon nutzt, behält sie (einmalig); Notizen sind für alle an", async () => {
    const w = fakeWindow({
      "wasgibts.startseite": JSON.stringify({ version: 4, tiles: [{ id: "spendentopf", visible: true, size: "M" }, { id: "sport", visible: false, size: "M" }], tipSeen: true }),
      "wasgibts.sport": JSON.stringify({ version: 1, goal: 3, trainings: [{ id: "x" }], packs: {} }),
    });
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(["sport", "notizen", "spendentopf"].filter((x) => f.featureOn(x as never))).toEqual(["sport", "notizen", "spendentopf"]);
    // nur einmal: später Ausgeschaltetes bleibt aus
    f.setFeature("sport", false);
    f.launchUebernahme();
    expect(f.featureOn("sport")).toBe(false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toMatchObject({ version: 7, launch: true, imHaus: true });
  });

  it("neue Nutzer starten ohne die ausgeblendeten Bausteine, mit Notizen", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    expect(f.featureOn("notizen")).toBe(true);
    f.launchUebernahme();
    expect(f.featureOn("sport") || f.featureOn("spendentopf")).toBe(false);
    expect(f.featureOn("notizen")).toBe(true);
    // selbst abschaltbar – und bleibt aus
    f.setFeature("notizen", false);
    expect(f.featureOn("notizen")).toBe(false);
  });

  it("Update v3 → v7: Notizen (und die Pinnwand) einmal an, wer sie danach abschaltet, behält das", async () => {
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 3, on: ["rezepte"], launch: true }) });
    const f = await import("@/lib/core/features");
    expect(f.featureOn("notizen") && f.featureOn("rezepte")).toBe(true);
    f.setFeature("notizen", false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toEqual({ version: 7, on: ["rezepte", "pinnwand", "durchatmen"], launch: true, imHaus: false });
    vi.resetModules();
    const again = await import("@/lib/core/features");
    expect(again.featureOn("notizen")).toBe(false);
  });

  it("Update: Im Haus für alle an, die Kachel kommt dabei nicht auf die Startseite (stand nur unsichtbar im alten Standard)", async () => {
    const home = { version: 6, tiles: [{ id: "termine", visible: true, size: "M" }, { id: "vorrat", visible: true, size: "S" }], tipSeen: true };
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 4, on: ["notizen"], launch: true }), "wasgibts.startseite": JSON.stringify(home) });
    const f = await import("@/lib/core/features");
    expect(f.featureOn("vorrat")).toBe(false);
    f.launchUebernahme();
    expect(f.featureOn("vorrat")).toBe(true);
    const tiles = JSON.parse(w.localStorage.getItem("wasgibts.startseite")!).tiles as { id: string; visible: boolean }[];
    expect(tiles.find((t) => t.id === "vorrat")?.visible).toBe(false);
    expect(tiles.find((t) => t.id === "termine")?.visible).toBe(true);
    // nur einmal: wer es danach abschaltet, behält das
    f.setFeature("vorrat", false);
    f.launchUebernahme();
    expect(f.featureOn("vorrat")).toBe(false);
  });

  it("Update: wer Im Haus schon hatte, behält seine Kachel", async () => {
    const home = { version: 6, tiles: [{ id: "vorrat", visible: true, size: "M" }], tipSeen: true };
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 4, on: ["notizen", "vorrat"], launch: true }), "wasgibts.startseite": JSON.stringify(home) });
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(JSON.parse(w.localStorage.getItem("wasgibts.startseite")!).tiles[0]).toMatchObject({ id: "vorrat", visible: true, size: "M" });
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toEqual({ version: 7, on: ["notizen", "vorrat", "pinnwand", "durchatmen"], launch: true, imHaus: true });
  });

  it("alte Bausteine (v2) bleiben erhalten", async () => {
    fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 2, on: ["rezepte", "vorrat"] }) });
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(f.featureOn("rezepte") && f.featureOn("vorrat")).toBe(true);
  });

  it("Mias Änderungen an Ausgeblendetem werden weggelassen („Kann ich noch nicht.“) – Im Haus gehört zu 1.0", async () => {
    const { launchFilter } = await import("@/lib/begleitung/client");
    const ops = [
      { id: "1", type: "add_pantry", items: [] },
      { id: "2", type: "add_shopping", items: [] },
      { id: "3", type: "set_feature", feature: "spendentopf", on: true },
      { id: "4", type: "set_feature", feature: "spendentopf", on: false },
      { id: "5", type: "set_feature", feature: "sport", on: true },
      { id: "6", type: "add_training", training: { sport: "laufen", minutes: 30, date: "2026-10-21" } },
      { id: "7", type: "set_feature", feature: "vorrat", on: true },
    ] as unknown as ChangeOp[];
    const aus = launchFilter(ops, () => false);
    expect(aus.ops.map((o) => o.id)).toEqual(["1", "2", "4", "5", "6", "7"]);
    expect(aus.gesperrt).toBe(true);
    expect(launchFilter(ops, () => true).gesperrt).toBe(false);
  });

  it("Prompt: Ausgeblendetes nicht anbieten", async () => {
    const { launchLine } = await import("@/lib/begleitung/prompt");
    expect(launchLine([])).toMatch(/noch nicht.*Spendentopf/);
    expect(launchLine([])).not.toMatch(/Notizen|Sport|Wochenplan|Im Haus/);
    expect(launchLine(["spendentopf"])).not.toMatch(/Spendentopf/);
  });

  it("Anmelden für 1.0 nur per E-Mail-Code", async () => {
    const { oauthProviders, LAUNCH_NUR_EMAIL } = await import("@/lib/konten/oauth");
    expect(LAUNCH_NUR_EMAIL).toBe(true);
    expect(oauthProviders({ apple: "1", google: "1" })).toEqual([]);
  });
});
