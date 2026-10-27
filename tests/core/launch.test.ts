// Launch „Mia 1.0“: ausgeblendete Bausteine (nicht gelöscht), wer etwas schon
// nutzt, behält es; Mia schaltet nichts frei; nur Anmelden per E-Mail-Code.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";
import type { ChangeOp } from "@/lib/begleitung/ops";

beforeEach(() => vi.resetModules());
afterEach(() => noBrowser());

describe("Launch-Schnitt", () => {
  it("ausgeblendet: Mails, Tipps aus der Region, Im Haus, Spendentopf – Notizen, Sport und Wochenplan gehören zu 1.0", async () => {
    const { LAUNCH_AUS, launchSichtbar } = await import("@/lib/core/features");
    expect([...LAUNCH_AUS].sort()).toEqual(["mails", "regiontipps", "spendentopf", "vorrat"]);
    expect(launchSichtbar("notizen", [])).toBe(true);
    expect(launchSichtbar("sport", [])).toBe(true);
    expect(launchSichtbar("wochenplan", [])).toBe(true);
    expect(launchSichtbar("vorrat", [])).toBe(false);
    expect(launchSichtbar("vorrat", ["vorrat"])).toBe(true);
    expect(launchSichtbar("rezepte", [])).toBe(true);
  });

  it("neue Startseite ohne Spendentopf, mit Notizen", () => {
    expect(DEFAULT_HOME.filter((t) => t.visible).map((t) => t.id)).toEqual(["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "vorrat", "notizen"]);
  });

  it("Mia schaltet Ausgeblendetes nicht frei, anderes schon", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    expect(f.unlockFeature("vorrat")).toBe(false);
    expect(f.featureOn("vorrat")).toBe(false);
    expect(f.unlockFeature("rezepte")).toBe(true);
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
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toMatchObject({ version: 4, launch: true });
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

  it("Update v3 → v4: Notizen einmal an, wer sie danach abschaltet, behält das", async () => {
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 3, on: ["rezepte"], launch: true }) });
    const f = await import("@/lib/core/features");
    expect(f.featureOn("notizen") && f.featureOn("rezepte")).toBe(true);
    f.setFeature("notizen", false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toEqual({ version: 4, on: ["rezepte"], launch: true });
    vi.resetModules();
    const again = await import("@/lib/core/features");
    expect(again.featureOn("notizen")).toBe(false);
  });

  it("alte Bausteine (v2) bleiben erhalten", async () => {
    fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 2, on: ["rezepte", "vorrat"] }) });
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(f.featureOn("rezepte") && f.featureOn("vorrat")).toBe(true);
  });

  it("Mias Änderungen an Ausgeblendetem werden weggelassen („Kann ich noch nicht.“)", async () => {
    const { launchFilter } = await import("@/lib/begleitung/client");
    const ops = [
      { id: "1", type: "add_pantry", items: [] },
      { id: "2", type: "add_shopping", items: [] },
      { id: "3", type: "set_feature", feature: "vorrat", on: true },
      { id: "4", type: "set_feature", feature: "vorrat", on: false },
      { id: "5", type: "set_feature", feature: "sport", on: true },
      { id: "6", type: "add_training", training: { sport: "laufen", minutes: 30, date: "2026-10-21" } },
    ] as unknown as ChangeOp[];
    const aus = launchFilter(ops, () => false);
    expect(aus.ops.map((o) => o.id)).toEqual(["2", "4", "5", "6"]);
    expect(aus.gesperrt).toBe(true);
    expect(launchFilter(ops, () => true).gesperrt).toBe(false);
  });

  it("Prompt: Ausgeblendetes nicht anbieten", async () => {
    const { launchLine } = await import("@/lib/begleitung/prompt");
    expect(launchLine([])).toMatch(/noch nicht.*Im Haus.*Spendentopf/);
    expect(launchLine([])).not.toMatch(/Notizen|Sport|Wochenplan/);
    expect(launchLine(["vorrat"])).not.toMatch(/Im Haus,/);
  });

  it("Anmelden für 1.0 nur per E-Mail-Code", async () => {
    const { oauthProviders, LAUNCH_NUR_EMAIL } = await import("@/lib/konten/oauth");
    expect(LAUNCH_NUR_EMAIL).toBe(true);
    expect(oauthProviders({ apple: "1", google: "1" })).toEqual([]);
  });
});
