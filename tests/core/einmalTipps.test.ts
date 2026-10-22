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

describe("Einmal-Tipps", () => {
  it("merkt sich „gesehen“ nur einmal", async () => {
    const { win, markHintSeen } = await load();
    markHintSeen("kachel-hinzufuegen");
    markHintSeen("kachel-hinzufuegen");
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 1, seen: ["kachel-hinzufuegen"] });
  });

  it("„Tipps wieder zeigen“ setzt alles zurück", async () => {
    const { win, markHintSeen, resetHints } = await load({ [KEY]: JSON.stringify({ version: 1, seen: ["kachel-hinzufuegen"] }) });
    resetHints();
    expect(JSON.parse(win.localStorage.getItem(KEY)!)).toEqual({ version: 1, seen: [] });
    markHintSeen("kachel-hinzufuegen");
    expect(JSON.parse(win.localStorage.getItem(KEY)!).seen).toEqual(["kachel-hinzufuegen"]);
  });
});
