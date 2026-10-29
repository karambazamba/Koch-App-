import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fensterVerlauf, type FensterWin } from "@/lib/core/fensterVerlauf";

/** Verlauf wie im Browser: `back()` ist asynchron, das `popstate` kommt erst später (`browser()`) */
function fakeWin() {
  const entries: unknown[] = [null];
  let index = 0;
  const listeners = new Set<() => void>();
  const traversals: (() => void)[] = [];
  let t = 10_000;
  const history = {
    get state() {
      return entries[index];
    },
    pushState(state: unknown) {
      entries.splice(index + 1, Infinity, state);
      index++;
    },
    replaceState(state: unknown) {
      entries[index] = state;
    },
    back() {
      traversals.push(() => {
        if (index === 0) return;
        index--;
        for (const l of [...listeners]) l();
      });
    },
  };
  const win: FensterWin = {
    history: history as unknown as FensterWin["history"],
    location: { href: "https://mia.test/" },
    addEventListener: (_t, l) => listeners.add(l),
    removeEventListener: (_t, l) => listeners.delete(l),
    setTimeout: (f, ms) => setTimeout(f, ms),
    clearTimeout: (x) => clearTimeout(x),
    now: () => (t += 1),
  };
  const ids = () => ((history.state as { sheets?: number[] } | null)?.sheets ?? []);
  /** Der Browser holt nach, was ansteht (Zurück → popstate) */
  const browser = () => {
    while (traversals.length) traversals.shift()?.();
  };
  /** Alles, was ansteht: Zeitgeber und Browser, bis nichts mehr kommt */
  const fertig = () => {
    for (let i = 0; i < 5; i++) {
      browser();
      vi.runAllTimers();
    }
  };
  return { win, history, ids, depth: () => index, fertig };
}

describe("Fenster im Verlauf", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("Zurück schließt nur das oberste Fenster", () => {
    const { win, history, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    const a = vi.fn();
    const b = vi.fn();
    v.oeffne(a);
    v.oeffne(b);
    history.back();
    fertig();
    expect(b).toHaveBeenCalledOnce();
    expect(a).not.toHaveBeenCalled();
  });

  it("anders geschlossen: Eintrag wird nach kurzer Zeit entfernt", () => {
    const { win, depth, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    const zu = v.oeffne(() => {});
    expect(depth()).toBe(1);
    zu();
    vi.advanceTimersByTime(300);
    fertig();
    expect(depth()).toBe(0);
  });

  it("gleich das nächste Fenster übernimmt den Eintrag", () => {
    const { win, ids, depth, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    v.oeffne(() => {})();
    vi.advanceTimersByTime(100);
    const b = vi.fn();
    v.oeffne(b);
    fertig();
    expect(depth()).toBe(1);
    expect(ids()).toHaveLength(1);
    expect(b).not.toHaveBeenCalled();
  });

  // Fehler: Mias Frage „Soll ich dich erinnern?“ (per next/dynamic geladen) kam
  // genau, als die Schnelleingabe ihren Eintrag entfernte – das popstate
  // dieses Zurück schloss die Frage sofort wieder (Durchklick erinnerungFrage)
  it("Fenster, das öffnet, während das Entfernen unterwegs ist, bleibt offen", () => {
    const { win, ids, depth, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    v.oeffne(() => {})();
    vi.advanceTimersByTime(300); // Schnelleingabe-Eintrag: history.back() läuft, popstate noch nicht da
    const frage = vi.fn();
    v.oeffne(frage);
    fertig();
    expect(frage).not.toHaveBeenCalled();
    expect(depth()).toBe(1);
    expect(ids()).toHaveLength(1);
  });

  it("das wartende Fenster lässt sich danach per Zurück schließen", () => {
    const { win, history, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    v.oeffne(() => {})();
    vi.advanceTimersByTime(300);
    const frage = vi.fn();
    v.oeffne(frage);
    fertig();
    history.back();
    fertig();
    expect(frage).toHaveBeenCalledOnce();
  });

  it("schon wieder zu, bevor es angemeldet war: kein Eintrag", () => {
    const { win, depth, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    v.oeffne(() => {})();
    vi.advanceTimersByTime(300);
    v.oeffne(() => {})();
    fertig();
    expect(depth()).toBe(0);
  });

  it("kommt nach dem Zurück kein popstate, öffnet das Fenster trotzdem", () => {
    const { win, history, depth } = fakeWin();
    const v = fensterVerlauf(win);
    v.oeffne(() => {})();
    history.back = () => {}; // Browser ohne Verlauf: nichts passiert
    vi.advanceTimersByTime(300);
    v.oeffne(() => {});
    expect(depth()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(depth()).toBe(2);
  });

  // Fehler A-059: Kaltstart → „•••“ → „Einstellungen“ blieb beim ersten Tippen
  // auf der Startseite. Die Seite lud länger als 300 ms, das verspätete
  // Entfernen des Menü-Eintrags (history.back) brach die Navigation ab.
  it("danach: erst der Eintrag des Menüs weg, dann die neue Seite – nichts nimmt sie wieder weg", () => {
    const { win, history, depth, ids, fertig } = fakeWin();
    const v = fensterVerlauf(win);
    const zu = v.oeffne(() => {});
    expect(depth()).toBe(1);
    zu();
    const weiter = vi.fn(() => history.pushState({ seite: "/profil" }));
    v.danach(weiter);
    expect(weiter).not.toHaveBeenCalled(); // wartet auf das popstate des Entfernens
    fertig();
    expect(weiter).toHaveBeenCalledOnce();
    expect(depth()).toBe(1);
    expect(history.state).toEqual({ seite: "/profil" });
    expect(ids()).toHaveLength(0);
    vi.advanceTimersByTime(5000);
    fertig();
    expect(depth()).toBe(1);
  });

  it("danach ohne offenes Fenster: gleich weiter", () => {
    const { win } = fakeWin();
    const v = fensterVerlauf(win);
    const weiter = vi.fn();
    v.danach(weiter);
    expect(weiter).toHaveBeenCalledOnce();
  });
});
