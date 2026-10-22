import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";

const KEY = "wasgibts.einmalhinweise";

async function load(local: Record<string, string> = {}) {
  const win = fakeWindow(local);
  vi.resetModules();
  const mod = await import("@/lib/core/hints");
  return { win, ...mod };
}

afterEach(() => {
  vi.unstubAllGlobals();
  noBrowser();
});

describe("Einmal-Hinweise", () => {
  it("zeigt den Tipp einmal und merkt sich „gesehen“", async () => {
    const { win, hintSeen, markHintSeen } = await load();
    expect(hintSeen("kachel-tipp")).toBe(false);
    markHintSeen("kachel-tipp");
    markHintSeen("kachel-tipp");
    expect(hintSeen("kachel-tipp")).toBe(true);
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 1, seen: ["kachel-tipp"] });
  });

  it("wer die alte Sprechblase gesehen hat, bekommt den neuen Tipp trotzdem", async () => {
    const { hintSeen } = await load({ [KEY]: JSON.stringify({ version: 1, seen: ["kachel-hinzufuegen"] }) });
    expect(hintSeen("kachel-hinzufuegen")).toBe(true);
    expect(hintSeen("kachel-tipp")).toBe(false);
  });

  it("„Einmal-Hinweise zurücksetzen“ setzt alle zurück", async () => {
    const { win, hintSeen, resetHints } = await load({ [KEY]: JSON.stringify({ version: 1, seen: ["kachel-hinzufuegen", "kachel-tipp"] }) });
    resetHints();
    expect(hintSeen("kachel-tipp")).toBe(false);
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 1, seen: [] });
  });
});
