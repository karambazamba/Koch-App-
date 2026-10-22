// Speicher von Tagesablauf, Zeit-Vorschau und Jetzt-Karte – die React-Abfragen
// ohne React (useExternalStore liefert direkt den aktuellen Stand).
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser, type FakeWindow } from "../helpers";

vi.mock("@/lib/core/useExternalStore", () => ({
  useExternalStore: <T,>(subscribe: (fn: () => void) => () => void, get: () => T) => {
    subscribe(() => {})();
    return get();
  },
}));

let win: FakeWindow;
async function load<T>(path: () => Promise<T>, local: Record<string, string> = {}, session: Record<string, string> = {}): Promise<T> {
  win = fakeWindow(local, session);
  vi.resetModules();
  return path();
}
const tagesablauf = () => import("@/lib/heute/tagesablauf");
const jetzt = () => import("@/lib/heute/jetztStore");

afterEach(() => noBrowser());

describe("Tagesablauf", () => {
  it("ohne Daten = Standard (Ruhe an, Morgens bis 10, Feierabend 20 Uhr)", async () => {
    const t = await load(tagesablauf);
    expect(t.loadRoutine()).toEqual(t.DEFAULT_ROUTINE);
    expect(t.useRoutine()).toEqual(t.DEFAULT_ROUTINE);
  });

  it("Teil ändern und zurücknehmen", async () => {
    const t = await load(tagesablauf);
    const undo = t.changeRoutine({ feierabendAb: "18:30", ruhe: false });
    expect(t.loadRoutine()).toMatchObject({ feierabendAb: "18:30", ruhe: false });
    expect(JSON.parse(win.localStorage.getItem("wasgibts.tagesablauf")!).version).toBe(1);
    undo();
    expect(t.loadRoutine()).toEqual(t.DEFAULT_ROUTINE);
  });

  it("prüft Werte: falsche Uhrzeiten, Tage und Kochzeiten → Standard; Tage sortiert ohne Doppel", async () => {
    const t = await load(tagesablauf);
    t.changeRoutine({ morgenBis: "25:00", feierabendAb: "8 Uhr", arbeitstage: [4, 1, 1, 9, 2.5, 0], kochenMin: 200 });
    expect(t.loadRoutine()).toMatchObject({ morgenBis: "10:00", feierabendAb: "20:00", arbeitstage: [0, 1, 4], kochenMin: 20 });
    t.changeRoutine({ kochenMin: 12.6 });
    expect(t.loadRoutine().kochenMin).toBe(13);
  });

  it("alter Modus wird still übergangen, fremde Version ignoriert", async () => {
    const t = await load(tagesablauf, { "wasgibts.tagesablauf": JSON.stringify({ version: 1, routine: { mode: "gleich", ruhe: false, arbeitstage: "mo" } }) });
    expect(t.loadRoutine()).toEqual({ ...t.DEFAULT_ROUTINE, ruhe: false });
    const t2 = await load(tagesablauf, { "wasgibts.tagesablauf": JSON.stringify({ version: 2, routine: { ruhe: false } }) });
    expect(t2.loadRoutine()).toEqual(t2.DEFAULT_ROUTINE);
    const t3 = await load(tagesablauf, { "wasgibts.tagesablauf": JSON.stringify({ version: 1 }) });
    expect(t3.useRoutine()).toEqual(t3.DEFAULT_ROUTINE);
  });
});

describe("Zeit-Vorschau („So tun, als wäre es …“)", () => {
  it("gilt nur in dieser Sitzung und lässt sich beenden", async () => {
    const t = await load(tagesablauf);
    expect(t.usePreview()).toBeNull();
    t.setPreview({ clock: "18:20", weekday: 5 });
    expect(win.sessionStorage.getItem("wasgibts.zeitvorschau")).toBe(JSON.stringify({ clock: "18:20", weekday: 5 }));
    expect(win.localStorage.getItem("wasgibts.zeitvorschau")).toBeNull();
    const first = t.usePreview();
    expect(first).toEqual({ clock: "18:20", weekday: 5 });
    expect(t.usePreview()).toBe(first);
    t.setPreview(null);
    expect(t.usePreview()).toBeNull();
  });

  it("kaputte oder falsche Vorschau wird nicht benutzt; falscher Wochentag = ohne", async () => {
    const t = await load(tagesablauf, {}, { "wasgibts.zeitvorschau": JSON.stringify({ clock: "18:20", weekday: 9 }) });
    expect(t.usePreview()).toEqual({ clock: "18:20", weekday: null });
    const t2 = await load(tagesablauf, {}, { "wasgibts.zeitvorschau": "{kaputt" });
    expect(t2.usePreview()).toBeNull();
    const t3 = await load(tagesablauf, {}, { "wasgibts.zeitvorschau": JSON.stringify({ clock: "abends" }) });
    expect(t3.usePreview()).toBeNull();
  });
});

describe("Jetzt-Karte: an/aus, Ausblenden, Interesse", () => {
  it("Standard an; ausschalten und zurücknehmen", async () => {
    const j = await load(jetzt);
    expect(j.useJetzt()).toEqual({ version: 1, on: true, day: "", hidden: [], weights: {} });
    const undo = j.setJetztOn(false);
    expect(j.loadJetzt().on).toBe(false);
    undo();
    expect(j.loadJetzt().on).toBe(true);
  });

  it("Antippen +1, Weiterwischen −0,5, begrenzt auf ±6", async () => {
    const j = await load(jetzt);
    j.noteJetztTap("wetter");
    j.noteJetztSkip("wetter");
    expect(j.loadJetzt().weights.wetter).toBe(0.5);
    for (let i = 0; i < 10; i++) j.noteJetztTap("essen");
    expect(j.loadJetzt().weights.essen).toBe(6);
  });

  it("✕ blendet nur heute aus (−1,5) und lässt sich zurücknehmen", async () => {
    const j = await load(jetzt);
    const undo = j.hideJetztTopic("wetter:2026-10-21", "wetter", "2026-10-21");
    j.hideJetztTopic("wetter:2026-10-21", "wetter", "2026-10-21");
    const s = j.loadJetzt();
    expect(s.hidden).toEqual(["wetter:2026-10-21"]);
    expect(s.weights.wetter).toBe(-3);
    expect(j.hiddenToday(s, "2026-10-21")).toEqual(["wetter:2026-10-21"]);
    expect(j.hiddenToday(s, "2026-10-22")).toEqual([]);
    // am nächsten Tag beginnt die Liste neu
    j.hideJetztTopic("pin:p1", "pinnwand", "2026-10-22");
    expect(j.loadJetzt().hidden).toEqual(["pin:p1"]);
    undo();
    expect(j.loadJetzt()).toMatchObject({ day: "", hidden: [], weights: {} });
  });

  it("Zurücksetzen: nichts ausgeblendet, Interesse von vorn – an/aus bleibt", async () => {
    const j = await load(jetzt);
    j.setJetztOn(false);
    j.hideJetztTopic("x", "tipp", "2026-10-21");
    j.resetJetztTopics();
    expect(j.loadJetzt()).toEqual({ version: 1, on: false, day: "", hidden: [], weights: {} });
  });

  it("prüft gespeicherte Daten", async () => {
    const raw = { version: 1, on: "ja", day: 5, hidden: ["a", 3], weights: { wetter: 99, essen: "viel", tipp: -2, timer: Infinity } };
    const j = await load(jetzt, { "wasgibts.jetzt": JSON.stringify(raw) });
    expect(j.loadJetzt()).toEqual({ version: 1, on: true, day: "", hidden: ["a"], weights: { wetter: 6, tipp: -2 } });
    const j2 = await load(jetzt, { "wasgibts.jetzt": JSON.stringify({ version: 1, hidden: "x", weights: null }) });
    expect(j2.loadJetzt()).toEqual({ version: 1, on: true, day: "", hidden: [], weights: {} });
    const j3 = await load(jetzt, { "wasgibts.jetzt": JSON.stringify({ version: 2, on: false }) });
    expect(j3.loadJetzt().on).toBe(true);
  });
});

describe("Phase sofort wechseln", () => {
  it("jeder bewusste Schritt zählt hoch und benachrichtigt", async () => {
    vi.resetModules();
    const n = await import("@/lib/heute/nudge");
    expect(n.usePhaseNudge()).toBe(0);
    n.nudgePhase();
    n.nudgePhase();
    expect(n.usePhaseNudge()).toBe(2);
  });
});
