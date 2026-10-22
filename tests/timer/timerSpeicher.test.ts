// Timer-Speicher, Starten/Stoppen aus Oberfläche und Lotte, Ton (Web Audio)
import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeBrowser, noBrowser, type FakeWindow } from "../core/fakeBrowser";

vi.mock("@/lib/core/useExternalStore", () => ({
  useExternalStore: <T,>(subscribe: (fn: () => void) => () => void, get: () => T) => {
    subscribe(() => {})();
    return get();
  },
}));

const MIN = 60_000;
let win: FakeWindow;

/** Kleines Web-Audio zum Mitschreiben */
function fakeAudio(state: "running" | "suspended" = "suspended") {
  const log = { created: 0, resumed: 0, oscillators: [] as number[], started: 0 };
  class Ctx {
    state = state;
    currentTime = 1;
    destination = {};
    constructor() {
      log.created++;
    }
    resume() {
      log.resumed++;
      return Promise.resolve();
    }
    createOscillator() {
      const o = { type: "", frequency: { value: 0 }, connect: (g: unknown) => g, start: () => log.started++, stop: () => {} };
      return new Proxy(o, {
        set(target, key, value) {
          (target as Record<string | symbol, unknown>)[key] = value;
          return true;
        },
        get(target, key) {
          if (key === "frequency") return { set value(v: number) { log.oscillators.push(v); } };
          return (target as Record<string | symbol, unknown>)[key];
        },
      });
    }
    createGain() {
      return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect: (d: unknown) => d };
    }
  }
  return { Ctx, log };
}

async function load(local: Record<string, string> = {}, audio?: unknown) {
  win = fakeBrowser(local);
  if (audio) (win as unknown as { AudioContext: unknown }).AudioContext = audio;
  vi.resetModules();
  await atFresh("2026-10-21T18:00");
  const store = await import("@/lib/timer/store");
  const actions = await import("@/lib/timer/actions");
  const toast = await import("@/lib/core/toast");
  const nudge = await import("@/lib/heute/nudge");
  return { store, actions, toast, nudge };
}

afterEach(() => {
  vi.useRealTimers();
  noBrowser();
});

describe("Timer-Speicher", () => {
  it("leer ohne Daten; Änderung speichern mit Endzeit und zurücknehmen", async () => {
    const { store } = await load();
    expect(store.loadTimers().timers).toEqual([]);
    expect(store.useTimers()).toEqual(store.loadTimers());
    const { addTimer } = await import("@/lib/timer/model");
    const undo = store.changeTimers((s, now) => addTimer(s, { minutes: 10, name: "Reis" }, now)!.state);
    const saved = JSON.parse(win.localStorage.getItem("wasgibts.timer")!);
    expect(saved.version).toBe(1);
    expect(saved.timers[0]).toMatchObject({ name: "Reis", endsAt: Date.parse("2026-10-21T16:10:00Z") });
    undo();
    expect(store.loadTimers().timers).toEqual([]);
  });

  it("räumt beim Speichern lange vergessene Timer weg; fremde Version = leer", async () => {
    const old = { id: "alt", name: "Alt", endsAt: Date.parse("2026-10-20T10:00:00Z") };
    const fresh = { id: "neu", name: "Neu", endsAt: Date.parse("2026-10-21T16:05:00Z") };
    const { store } = await load({ "wasgibts.timer": JSON.stringify({ version: 1, timers: [old, fresh] }) });
    expect(store.loadTimers().timers.map((t) => t.id)).toEqual(["alt", "neu"]);
    store.changeTimers((s) => s);
    expect(store.loadTimers().timers.map((t) => t.id)).toEqual(["neu"]);
    const other = await load({ "wasgibts.timer": JSON.stringify({ version: 2, timers: [fresh] }) });
    expect(other.store.loadTimers().timers).toEqual([]);
  });
});

describe("Timer starten und stoppen", () => {
  it("erster Timer: Hinweis zum Ton (einmal), Phase wechselt sofort", async () => {
    const { store, actions, toast, nudge } = await load();
    const first = actions.startTimer({ name: "Nudeln", minutes: 10 })!;
    expect(first.timer.name).toBe("Nudeln");
    expect(toast.useToast()?.text).toContain("Der Ton kommt");
    expect(store.loadTimers().hintSeen).toBe(true);
    expect(nudge.usePhaseNudge()).toBe(1);
    toast.hideToast();
    actions.startTimer({ minutes: 5 });
    expect(toast.useToast()).toBeNull();
    first.undo();
    expect(store.loadTimers().timers).toHaveLength(0);
  });

  it("schon fünf: freundlicher Hinweis (außer leise)", async () => {
    const { actions, toast } = await load();
    for (let i = 0; i < 5; i++) actions.startTimer({ minutes: 5 + i }, { quiet: true });
    toast.hideToast();
    expect(actions.startTimer({ minutes: 3 }, { quiet: true })).toBeNull();
    expect(toast.useToast()).toBeNull();
    expect(actions.startTimer({ minutes: 3 })).toBeNull();
    expect(toast.useToast()?.text).toContain("Fünf Timer laufen schon");
  });

  it("stoppen nach Namen – nur laufende", async () => {
    const { store, actions } = await load();
    actions.startTimer({ name: "Nudeln", minutes: 10 }, { quiet: true });
    actions.startTimer({ name: "Eier", minutes: 7 }, { quiet: true });
    expect(actions.stopTimerByName("Nudel")?.name).toBe("Nudeln");
    expect(store.loadTimers().timers.map((t) => t.name)).toEqual(["Eier"]);
    expect(actions.stopTimerByName("Reis")).toBeNull();
    await atFresh("2026-10-21T19:00");
    expect(actions.stopTimerByName("Eier")).toBeNull();
  });

  it("Stoppuhr starten und anhalten", async () => {
    const { store, actions } = await load();
    actions.stopwatch("start");
    expect(store.loadTimers().stopwatch).toEqual({ startedAt: Date.parse("2026-10-21T16:00:00Z"), elapsedMs: 0 });
    await atFresh("2026-10-21T18:02");
    actions.stopwatch("stop");
    expect(store.loadTimers().stopwatch).toEqual({ startedAt: null, elapsedMs: 2 * MIN });
  });
});

describe("Ton", () => {
  it("Starten schaltet den Ton frei (iPhone), Klingeln spielt drei Töne", async () => {
    const { Ctx, log } = fakeAudio();
    const { actions } = await load({}, Ctx);
    actions.startTimer({ minutes: 1 }, { quiet: true });
    actions.startTimer({ minutes: 2 }, { quiet: true });
    expect(log.created).toBe(1);
    expect(log.resumed).toBe(2);
    const sound = await import("@/lib/timer/sound");
    sound.chime();
    expect(log.oscillators).toEqual([660, 880, 660]);
    expect(log.resumed).toBe(3);
  });

  it("läuft der Ton schon, kein Fortsetzen nötig", async () => {
    const { Ctx, log } = fakeAudio("running");
    await load({}, Ctx);
    const sound = await import("@/lib/timer/sound");
    sound.unlockTimerSound();
    sound.chime();
    expect(log.resumed).toBe(0);
    expect(log.started).toBe(4);
  });

  it("ohne Web Audio oder mit Fehler: still weiter", async () => {
    await load();
    const sound = await import("@/lib/timer/sound");
    expect(() => sound.unlockTimerSound()).not.toThrow();
    expect(() => sound.chime()).not.toThrow();
    const broken = class {
      constructor() {
        throw new Error("nicht erlaubt");
      }
    };
    await load({}, broken);
    const s2 = await import("@/lib/timer/sound");
    expect(() => s2.chime()).not.toThrow();
    const failing = class {
      state = "running";
      currentTime = 0;
      createOscillator() {
        throw new Error("kaputt");
      }
    };
    await load({}, failing);
    const s3 = await import("@/lib/timer/sound");
    expect(() => s3.unlockTimerSound()).not.toThrow();
    expect(() => s3.chime()).not.toThrow();
  });
});
