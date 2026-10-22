import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.useRealTimers();
  noBrowser();
});

describe("Rückgängig (Sitzung)", () => {
  it("nimmt die letzte noch gültige Änderung zurück – jede nur einmal", async () => {
    const { pushUndo, undoLast } = await import("@/lib/core/undo");
    const log: string[] = [];
    pushUndo("Milch auf die Liste", () => log.push("milch"));
    const brot = pushUndo("Brot auf die Liste", () => log.push("brot"));
    brot(); // Knopf im Toast
    brot(); // zweimal tippen wirkt nicht doppelt
    expect(log).toEqual(["brot"]);
    expect(undoLast()).toBe("Milch auf die Liste");
    expect(undoLast()).toBeNull();
    expect(log).toEqual(["brot", "milch"]);
  });

  it("dasselbe Zurücknehmen wird nicht zweimal gemerkt", async () => {
    const { pushUndo, isRegisteredUndo, undoLast } = await import("@/lib/core/undo");
    const run = vi.fn();
    expect(isRegisteredUndo(run)).toBe(false);
    const once = pushUndo("A", run);
    expect(isRegisteredUndo(run)).toBe(true);
    expect(isRegisteredUndo(once)).toBe(true);
    expect(pushUndo("A nochmal", run)).toBe(run);
    expect(pushUndo("A eingepackt", once)).toBe(once);
    expect(undoLast()).toBe("A");
    expect(undoLast()).toBeNull();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("merkt höchstens 20 Änderungen", async () => {
    const { pushUndo, undoLast } = await import("@/lib/core/undo");
    for (let i = 1; i <= 25; i++) pushUndo(`Nr. ${i}`, () => {});
    const labels: string[] = [];
    for (let l = undoLast(); l; l = undoLast()) labels.push(l);
    expect(labels).toHaveLength(20);
    expect(labels[0]).toBe("Nr. 25");
    expect(labels.at(-1)).toBe("Nr. 6");
  });
});

describe("Meldung mit Rückgängig", () => {
  it("Gelöscht: 3 Sekunden, klein, mit Wiederhergestellt", async () => {
    vi.useFakeTimers();
    const toast = await import("@/lib/core/toast");
    const undo = vi.fn();
    toast.showDeleted(undo);
    // Kein React hier: den Zustand über einen Abonnenten lesen geht nicht, also über die Zeit prüfen
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2999);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("neue Meldung ersetzt die alte samt Zeit", async () => {
    vi.useFakeTimers();
    const toast = await import("@/lib/core/toast");
    toast.showDone(() => {});
    vi.advanceTimersByTime(3000);
    toast.showToast({ text: "Hallo" });
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(toast.TOAST_SECONDS * 1000 - 1);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1);
    expect(vi.getTimerCount()).toBe(0);
    toast.showDeleted(() => {}, "Notiz gelöscht");
    toast.hideToast();
  });
});

describe("Avatar und Feier", () => {
  it("Feier löst 'freuen' aus und endet wieder", async () => {
    vi.useFakeTimers();
    const avatar = await import("@/lib/core/avatarState");
    const { celebrate, endCelebration } = await import("@/lib/core/celebrate");
    celebrate("Wochenziel geschafft");
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1400);
    expect(vi.getTimerCount()).toBe(0);
    endCelebration();
    avatar.resetAvatarForTests();
  });

  it("laufende Zustände zählen mehrere Quellen, nie unter null", async () => {
    vi.useFakeTimers();
    const a = await import("@/lib/core/avatarState");
    a.setAvatarFlag("denken", false);
    a.setAvatarFlag("zuhoeren", true);
    a.setAvatarFlag("zuhoeren", true);
    a.setAvatarFlag("zuhoeren", false);
    a.setAvatarFlag("sprechen", true);
    a.setAvatarFlag("sprechen", false);
    a.triggerAvatar("verwirrt");
    a.triggerAvatar("freuen"); // ersetzt die alte Zeit
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1400);
    a.resetAvatarForTests();
  });

  it("schlafen, aufwecken, wieder schlafen", async () => {
    const a = await import("@/lib/core/avatarState");
    a.wakeAvatar(); // schläft nicht → nichts
    a.setAvatarSleeping(true);
    a.setAvatarSleeping(true); // keine Änderung
    a.wakeAvatar();
    a.wakeAvatar(); // schon wach
    a.setAvatarSleeping(false);
    a.resetAvatarForTests();
  });

  it("begrüßt einmal am Tag", async () => {
    vi.useFakeTimers();
    const win = fakeWindow();
    const a = await import("@/lib/core/avatarState");
    expect(a.greetOncePerDay("2026-10-22")).toBe(true);
    expect(win.localStorage.getItem("wasgibts.avatargruss")).toBe("2026-10-22");
    expect(a.greetOncePerDay("2026-10-22")).toBe(false);
    expect(a.greetOncePerDay("2026-10-23")).toBe(true);
    a.resetAvatarForTests();
  });
});
