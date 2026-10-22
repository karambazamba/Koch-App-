// Sport-Speicher und Aktionen (eintragen, ändern, löschen, Ziel, Packliste) –
// jede mit Zurücknehmen für „Mach das rückgängig“.
import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeWindow, noBrowser, type FakeWindow } from "../helpers";

vi.mock("@/lib/core/useExternalStore", () => ({
  useExternalStore: <T,>(subscribe: (fn: () => void) => () => void, get: () => T) => {
    subscribe(() => {})();
    return get();
  },
}));

let win: FakeWindow;

async function load(local: Record<string, string> = {}) {
  win = fakeWindow(local);
  vi.resetModules();
  await atFresh("2026-10-21T18:00");
  const store = await import("@/lib/sport/store");
  const actions = await import("@/lib/sport/actions");
  const undo = await import("@/lib/core/undo");
  const index = await import("@/lib/sport");
  return { store, actions, undo, index };
}

afterEach(() => noBrowser());

describe("Sport-Speicher", () => {
  it("ohne Daten: Ziel 3, nichts eingetragen", async () => {
    const { store, index } = await load();
    expect(store.loadSport()).toEqual(index.EMPTY_SPORT);
    expect(store.useSport()).toEqual(index.EMPTY_SPORT);
    expect(index.loadSport).toBe(store.loadSport);
  });

  it("speichert geprüft mit Version; fremde Version = leer", async () => {
    const { store } = await load();
    store.saveSport({ goal: 12, trainings: [], packs: {}, celebrated: [], hidden: [] });
    expect(JSON.parse(win.localStorage.getItem("wasgibts.sport")!)).toMatchObject({ version: 1, goal: 3 });
    const other = await load({ "wasgibts.sport": JSON.stringify({ version: 2, goal: 5 }) });
    expect(other.store.loadSport().goal).toBe(3);
    const kept = await load({ "wasgibts.sport": JSON.stringify({ version: 1, goal: 5 }) });
    expect(kept.store.useSport()?.goal).toBe(5);
  });
});

describe("Sport-Aktionen", () => {
  it("eintragen – still, Zurücknehmen auch über „Mach das rückgängig“", async () => {
    const { store, actions, undo } = await load();
    const { training } = actions.addTraining({ sport: "laufen", minutes: 30, km: 5, date: "2026-10-21" });
    expect(store.loadSport().trainings.map((t) => t.id)).toEqual([training.id]);
    expect(undo.undoLast()).toBe("das Eintragen des Trainings");
    expect(store.loadSport().trainings).toEqual([]);
  });

  it("ändern: eigenes Training bekommt neue Werte", async () => {
    const { store, actions } = await load();
    const { training } = actions.addTraining({ sport: "laufen", minutes: 30, date: "2026-10-21" });
    await atFresh("2026-10-21T19:00");
    const back = actions.updateTraining(training, { minutes: 50 });
    const changed = store.loadSport().trainings[0];
    expect(changed.data.minutes).toBe(50);
    expect(changed.geaendert).toBe("2026-10-21T17:00:00.000Z");
    back();
    expect(store.loadSport().trainings[0].data.minutes).toBe(30);
  });

  it("ändern eines Termin-Trainings legt ein eigenes mit Bezug an", async () => {
    const { store, actions, index } = await load();
    const derived = { ...index.createTraining({ sport: "laufen", minutes: 60, date: "2026-10-20", terminKey: "t1@2026-10-20" }), id: "termin:t1@2026-10-20" };
    const back = actions.updateTraining(derived, { minutes: 40 });
    expect(store.loadSport().trainings.map((t) => [t.data.minutes, t.data.terminKey])).toEqual([[40, "t1@2026-10-20"]]);
    back();
    expect(store.loadSport().trainings).toEqual([]);
  });

  it("löschen: bei Sport-Terminen zählt er danach nicht mehr (Termin bleibt)", async () => {
    const { store, actions, index } = await load();
    const own = actions.addTraining({ sport: "yoga", minutes: 45, date: "2026-10-21" }).training;
    const back = actions.removeTraining(own);
    expect(store.loadSport()).toMatchObject({ trainings: [], hidden: [] });
    back();
    expect(store.loadSport().trainings).toHaveLength(1);
    const derived = { ...index.createTraining({ sport: "laufen", minutes: 60, date: "2026-10-20", terminKey: "t1@2026-10-20" }), id: "termin:t1@2026-10-20" };
    actions.removeTraining(derived);
    actions.removeTraining(derived);
    expect(store.loadSport().hidden).toEqual(["t1@2026-10-20"]);
  });

  it("Wochenziel 1–7, gerundet", async () => {
    const { store, actions } = await load();
    const back = actions.setSportGoal(9.4);
    expect(store.loadSport().goal).toBe(7);
    actions.setSportGoal(0);
    expect(store.loadSport().goal).toBe(1);
    actions.setSportGoal(4.4);
    expect(store.loadSport().goal).toBe(4);
    back();
    expect(store.loadSport().goal).toBe(3);
  });

  it("Packliste: aufgeräumt, höchstens 12", async () => {
    const { store, actions } = await load();
    actions.setPack("schwimmen", [" Brille ", "", "Handtuch", ...Array(20).fill("x")]);
    expect(store.loadSport().packs.schwimmen).toEqual(["Brille", "Handtuch", ...Array(10).fill("x")]);
  });
});
