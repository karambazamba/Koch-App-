// Die React-Abfragen (use…) der Core-Module ohne React: `useExternalStore`
// wird durch eine Funktion ersetzt, die einmal an- und abmeldet und den
// aktuellen Stand liefert – so prüfen wir, was die Oberfläche sehen würde.
import { afterEach, describe, expect, it, vi } from "vitest";
import { atFresh, fakeBrowser, noBrowser } from "./fakeBrowser";

vi.mock("@/lib/core/useExternalStore", () => ({
  useExternalStore: <T,>(subscribe: (fn: () => void) => () => void, get: () => T) => {
    subscribe(() => {})();
    return get();
  },
}));

afterEach(() => {
  vi.useRealTimers();
  noBrowser();
  vi.resetModules();
});

describe("Meldungen und Feier, wie die Oberfläche sie sieht", () => {
  it("Gelöscht · Rückgängig, dann weg", async () => {
    vi.useFakeTimers();
    const t = await import("@/lib/core/toast");
    expect(t.useToast()).toBeNull();
    const undo = vi.fn();
    t.showDeleted(undo, "Notiz gelöscht");
    expect(t.useToast()).toMatchObject({ text: "Notiz gelöscht", undo, undoneText: "Wiederhergestellt", seconds: 3, small: true });
    vi.advanceTimersByTime(3000);
    expect(t.useToast()).toBeNull();
    t.showDone(undo);
    expect(t.useToast()).toMatchObject({ text: "Erledigt", undoneText: "Wieder da", seconds: 4 });
    t.hideToast();
    expect(t.useToast()).toBeNull();
  });

  it("Feier mit Text, Avatar freut sich", async () => {
    vi.useFakeTimers();
    const c = await import("@/lib/core/celebrate");
    const a = await import("@/lib/core/avatarState");
    expect(c.useCelebration()).toBeNull();
    c.celebrate("Stark!");
    expect(c.useCelebration()).toMatchObject({ text: "Stark!" });
    expect(a.useAvatarZustand().zustand).toBe("freuen");
    vi.advanceTimersByTime(1400);
    expect(a.useAvatarZustand()).toEqual({ zustand: "ruhig", nonce: 0 });
    c.endCelebration();
    expect(c.useCelebration()).toBeNull();
  });

  it("Avatar: zuhören > sprechen > denken > einmalig > schlafen > ruhig", async () => {
    vi.useFakeTimers();
    const a = await import("@/lib/core/avatarState");
    const z = () => a.useAvatarZustand().zustand;
    a.setAvatarSleeping(true);
    expect(z()).toBe("schlafen");
    a.triggerAvatar("verwirrt");
    expect(z()).toBe("verwirrt");
    a.setAvatarFlag("denken", true);
    expect(z()).toBe("denken");
    a.setAvatarFlag("sprechen", true);
    expect(z()).toBe("sprechen");
    a.setAvatarFlag("zuhoeren", true);
    expect(z()).toBe("zuhoeren");
    a.setAvatarFlag("zuhoeren", false);
    a.setAvatarFlag("sprechen", false);
    a.setAvatarFlag("denken", false);
    vi.advanceTimersByTime(3500);
    // Mikrofon hat ihn geweckt
    expect(z()).toBe("ruhig");
    a.setAvatarSleeping(false);
    a.setAvatarSleeping(true);
    expect(z()).toBe("schlafen");
    a.wakeAvatar();
    expect(z()).toBe("ruhig");
    a.resetAvatarForTests();
  });
});

describe("Gespeicherte Merker, wie die Oberfläche sie sieht", () => {
  it("Hinweis, Dunkel-Tipp, Beispiel-Tag", async () => {
    fakeBrowser();
    const hints = await import("@/lib/core/hints");
    const dark = await import("@/lib/core/darkTip");
    const demo = await import("@/lib/core/demo");
    expect(hints.useHintSeen("kachel-hinzufuegen")).toBe(false);
    hints.markHintSeen("kachel-hinzufuegen");
    expect(hints.useHintSeen("kachel-hinzufuegen")).toBe(true);
    expect(dark.useDarkTip()).toBeNull();
    dark.noteDarkTipStart("2026-10-20");
    expect(dark.useDarkTip()).toEqual({ version: 1, since: "2026-10-20", done: false });
    expect(demo.useDemo()).toBeNull();
    demo.startDemo();
    expect(demo.useDemo()?.done).toEqual(["beispiel:a1"]);
  });

  it("Bausteine und Startseite", async () => {
    fakeBrowser();
    const f = await import("@/lib/core/features");
    const home = await import("@/lib/core/homeLayout");
    expect(f.useBausteine()).toEqual([]);
    expect(f.useFeature("ideen")).toBe(false);
    f.setFeature("spontan", true);
    expect(f.useBausteine()).toEqual(["spontan"]);
    expect(f.useFeature("ideen")).toBe(true);
    expect(home.useHomeTiles()).toEqual(home.DEFAULT_HOME);
    expect(home.useHomeTipSeen()).toBe(false);
    home.markHomeTipSeen();
    expect(home.useHomeTipSeen()).toBe(true);
    expect(home.useHomeTiles()).toEqual(home.DEFAULT_HOME);
  });

  it("heutiges Datum und Minuten", async () => {
    fakeBrowser();
    await atFresh("2026-10-21T18:30");
    const t = await import("@/lib/core/now");
    expect(t.toIsoDate(t.useToday()!)).toBe("2026-10-21");
    expect(t.useMinutes()).toBe(1110);
  });
});
