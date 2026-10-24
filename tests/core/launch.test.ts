// Launch „Mia 1.0“: ausgeblendete Bausteine (nicht gelöscht), wer etwas schon
// nutzt, behält es; Mia schaltet nichts frei; nur Anmelden per E-Mail-Code.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { DEFAULT_HOME } from "@/lib/core/homeLayout";
import type { ChangeOp } from "@/lib/begleitung/ops";

beforeEach(() => vi.resetModules());
afterEach(() => noBrowser());

describe("Launch-Schnitt", () => {
  it("ausgeblendet: Mails, Tipps aus der Region, Im Haus, Wochenplan, Sport, Notizen, Spendentopf", async () => {
    const { LAUNCH_AUS, launchSichtbar } = await import("@/lib/core/features");
    expect([...LAUNCH_AUS].sort()).toEqual(["mails", "notizen", "regiontipps", "spendentopf", "sport", "vorrat", "wochenplan"]);
    expect(launchSichtbar("sport", [])).toBe(false);
    expect(launchSichtbar("sport", ["sport"])).toBe(true);
    expect(launchSichtbar("rezepte", [])).toBe(true);
  });

  it("neue Startseite ohne Spendentopf", () => {
    expect(DEFAULT_HOME.filter((t) => t.visible).map((t) => t.id)).toEqual(["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "vorrat"]);
  });

  it("Mia schaltet Ausgeblendetes nicht frei, anderes schon", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    expect(f.unlockFeature("vorrat")).toBe(false);
    expect(f.featureOn("vorrat")).toBe(false);
    expect(f.unlockFeature("rezepte")).toBe(true);
  });

  it("wer Sport, Notizen oder den Spendentopf schon nutzt, behält sie (einmalig)", async () => {
    const w = fakeWindow({
      "wasgibts.startseite": JSON.stringify({ version: 4, tiles: [{ id: "spendentopf", visible: true, size: "M" }, { id: "sport", visible: false, size: "M" }], tipSeen: true }),
      "wasgibts.sport": JSON.stringify({ version: 1, goal: 3, trainings: [{ id: "x" }], packs: {} }),
    });
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(["sport", "notizen", "spendentopf"].filter((x) => f.featureOn(x as never))).toEqual(["sport", "spendentopf"]);
    // nur einmal: später Ausgeschaltetes bleibt aus
    f.setFeature("sport", false);
    f.launchUebernahme();
    expect(f.featureOn("sport")).toBe(false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!)).toMatchObject({ version: 3, launch: true });
  });

  it("neue Nutzer starten ohne die ausgeblendeten Bausteine", async () => {
    fakeWindow();
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(f.featureOn("sport") || f.featureOn("notizen") || f.featureOn("spendentopf")).toBe(false);
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
      { id: "1", type: "add_training", training: { sport: "laufen", minutes: 30, date: "2026-10-21" } },
      { id: "2", type: "add_shopping", items: [] },
      { id: "3", type: "set_feature", feature: "sport", on: true },
      { id: "4", type: "set_feature", feature: "sport", on: false },
    ] as unknown as ChangeOp[];
    const aus = launchFilter(ops, () => false);
    expect(aus.ops.map((o) => o.id)).toEqual(["2", "4"]);
    expect(aus.gesperrt).toBe(true);
    expect(launchFilter(ops, () => true).gesperrt).toBe(false);
  });

  it("Prompt: Ausgeblendetes nicht anbieten", async () => {
    const { launchLine } = await import("@/lib/begleitung/prompt");
    expect(launchLine([])).toMatch(/noch nicht.*Sport.*Notizen.*Spendentopf/);
    expect(launchLine(["sport"])).not.toMatch(/Sport,/);
  });

  it("Anmelden für 1.0 nur per E-Mail-Code", async () => {
    const { oauthProviders, LAUNCH_NUR_EMAIL } = await import("@/lib/konten/oauth");
    expect(LAUNCH_NUR_EMAIL).toBe(true);
    expect(oauthProviders({ apple: "1", google: "1" })).toEqual([]);
  });
});
