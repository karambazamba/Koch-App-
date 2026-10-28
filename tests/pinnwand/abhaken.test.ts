// Pinnwand-Zettel abhaken wie Aufgaben und Einkauf (A-024, v0.145): Häkchen
// orange, 1 s stehen (nochmal tippen = zurück), dann 0,8 s weich weg ins
// Archiv „Ältere“ – nie durchgestrichen. Archiv 30 Tage bleibt. Seite und
// Kachel gleich.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at, fakeWindow, noBrowser } from "../helpers";

vi.mock("@/lib/core/toast", async (orig) => ({ ...(await orig<typeof import("@/lib/core/toast")>()), showToast: vi.fn() }));

import { now } from "@/lib/core/now";
import { showToast } from "@/lib/core/toast";
import { GLEITEN_MS, STEHEN_MS } from "@/lib/core/abhaken";
import { GLEITEN_MS as WAGEN_GLEITEN, STEHEN_MS as WAGEN_STEHEN } from "@/lib/einkauf/wagen/wagen";
import { ABHAK_MS, GLEIT_MS, VERGESSEN_MS, archivedPins, changePins, createPin, faecherOf, isForgotten, leavesIn, loadPins, visiblePins, type PinMessage } from "@/lib/pinnwand";
import { toggleDone } from "@/components/pinnwand/boardActions";
import type { BoardItem } from "@/components/pinnwand/useBoard";

const ms = () => now().getTime();
const read = (p: string) => readFileSync(p, "utf8");
const itemOf = (pin: PinMessage): BoardItem => ({ kind: "pin", id: pin.id, at: pin.erstellt, pinned: pin.data.pinned, pin });
const current = (id: string) => itemOf(loadPins().find((p) => p.id === id)!);
const toast = vi.mocked(showToast);

beforeEach(() => {
  vi.useFakeTimers();
  toast.mockClear();
  at("2026-10-28T12:10");
  fakeWindow();
});
afterEach(() => {
  vi.useRealTimers();
  noBrowser();
});

/** Ein Zettel von Lisa an der Tür */
function hang(text = "Brötchen holen?"): PinMessage {
  const p = createPin(text, "Lisa", null)!;
  changePins((all) => [...all, p]);
  return p;
}

describe("Zeiten wie beim Einkauf: 1 s stehen, 0,8 s weich weg", () => {
  it("eine gemeinsame Stelle für Einkauf und Pinnwand", () => {
    expect(STEHEN_MS).toBe(1000);
    expect(GLEITEN_MS).toBe(800);
    expect(WAGEN_STEHEN).toBe(STEHEN_MS);
    expect(WAGEN_GLEITEN).toBe(GLEITEN_MS);
    expect(ABHAK_MS).toBe(1800);
    expect(GLEIT_MS).toBe(800);
  });

  it("abgehakt: 1 s steht er (mit Häkchen), gleitet dann 0,8 s und liegt danach im Archiv", () => {
    const p = hang();
    toggleDone(itemOf(p), "Felix");
    const done = loadPins();
    expect(done[0].data.erledigt).toEqual({ von: "Felix", am: now().toISOString() });
    expect(leavesIn(done[0], ms())).toBe(1800);
    // Weggleiten beginnt nach 1 s
    expect(leavesIn(done[0], ms() + STEHEN_MS)).toBe(GLEIT_MS);
    expect(visiblePins(done, ms() + 999).map((x) => x.id)).toEqual([p.id]);
    expect(visiblePins(done, ms() + 1799).map((x) => x.id)).toEqual([p.id]);
    expect(visiblePins(done, ms() + 1800)).toHaveLength(0);
    expect(archivedPins(done, ms() + 1800).map((x) => x.id)).toEqual([p.id]);
  });
});

describe("Nochmal tippen = zurück", () => {
  it("innerhalb 1 s nochmal getippt: wieder offen an der Tür, kein Toast, nichts im Archiv", () => {
    const p = hang();
    toggleDone(itemOf(p), "Felix");
    vi.advanceTimersByTime(600);
    toggleDone(current(p.id), "Felix");
    expect(loadPins()[0].data.erledigt).toBeNull();
    vi.advanceTimersByTime(5000);
    expect(toast).not.toHaveBeenCalled();
    expect(archivedPins(loadPins(), ms() + 5000)).toHaveLength(0);
    expect(visiblePins(loadPins(), ms() + 5000).map((x) => x.id)).toEqual([p.id]);
  });

  it("zurück und wieder abgehakt: nur das neue Abhaken zählt (ein Toast)", () => {
    const p = hang();
    toggleDone(itemOf(p), "Felix");
    toggleDone(current(p.id), "Felix");
    at("2026-10-28T12:11");
    toggleDone(current(p.id), "Felix");
    vi.advanceTimersByTime(ABHAK_MS);
    expect(toast).toHaveBeenCalledTimes(1);
  });
});

describe("Landet im Archiv, „Erledigt · Rückgängig“ erst dann", () => {
  it("nach 1,8 s: Toast „Erledigt“ mit Rückgängig (5 s) – holt ihn aus dem Archiv zurück an die Tür", () => {
    const p = hang();
    toggleDone(itemOf(p), "Felix");
    vi.advanceTimersByTime(ABHAK_MS - 1);
    expect(toast).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(toast).toHaveBeenCalledTimes(1);
    const shown = toast.mock.calls[0][0];
    expect(shown).toMatchObject({ text: "Erledigt", undoneText: "Hängt wieder", seconds: 5, small: true });
    expect(archivedPins(loadPins(), ms() + ABHAK_MS).map((x) => x.id)).toEqual([p.id]);
    shown.undo!();
    expect(loadPins()[0].data.erledigt).toBeNull();
    expect(visiblePins(loadPins(), ms() + ABHAK_MS).map((x) => x.id)).toEqual([p.id]);
  });

  it("Archiv bleibt 30 Tage, dann still gelöscht", () => {
    const p = hang();
    toggleDone(itemOf(p), "Felix");
    const done = loadPins()[0];
    expect(isForgotten(done, ms() + ABHAK_MS + VERGESSEN_MS - 1)).toBe(false);
    expect(isForgotten(done, ms() + ABHAK_MS + VERGESSEN_MS)).toBe(true);
    expect(p.id).toBe(done.id);
  });
});

describe("Kachel (Fächer) genauso", () => {
  it("gerade Abgehaktes steht 1 s mit Häkchen im Fächer, gleitet weg, dann rückt der nächste nach", () => {
    const a = hang("Eins");
    const b = hang("Zwei");
    toggleDone(itemOf(b), "Felix");
    const list = loadPins();
    expect(faecherOf(list, ms(), 3).map((x) => x.data.text).sort()).toEqual(["Eins", "Zwei"]);
    expect(faecherOf(list, ms() + 1799, 3).map((x) => x.data.text).sort()).toEqual(["Eins", "Zwei"]);
    expect(faecherOf(list, ms() + 1800, 3).map((x) => x.id)).toEqual([a.id]);
  });

  it("Mini-Zettel: oranges Häkchen und dieselbe Bewegung wie an der Tür", () => {
    const faecher = read("src/components/pinnwand/Faecher.tsx");
    expect(faecher).toMatch(/const gehtIn = useGehtIn\(e, !demo\);/);
    expect(faecher).toMatch(/gehtIn !== null \? "zettel-geht" : ""/);
    expect(faecher).toMatch(/rounded-full bg-accent text-on-accent/);
  });
});

describe("Aussehen: Häkchen orange, nie durchgestrichen", () => {
  it("Haken-Kreis orange wie bei Aufgaben und Einkauf (nicht grün)", () => {
    const zettel = read("src/components/pinnwand/Zettel.tsx");
    expect(zettel).toMatch(/done \? "bg-accent text-on-accent"/);
    expect(zettel).not.toMatch(/bg-good/);
    expect(zettel).not.toMatch(/line-through/);
  });

  it("kein Durchstreichen, nicht blass; 0,8 s weich (transform/opacity), reduziert nur Überblenden", () => {
    const css = read("src/app/globals.css");
    const pinCss = css.slice(css.indexOf(".zettel {"), css.indexOf(".zettel-hervor {"));
    expect(pinCss).not.toMatch(/line-through/);
    expect(pinCss).not.toMatch(/\[data-erledigt\]/);
    expect(css).toMatch(/\.zettel-geht \{ animation: zettel-geht 0\.8s cubic-bezier\(\.16, 1, \.3, 1\) var\(--geht-in, 0ms\) both; \}/);
    const keyframes = css.slice(css.indexOf("@keyframes zettel-geht"), css.indexOf("@keyframes zettel-blende"));
    expect(keyframes).toMatch(/from \{ opacity: 1;/);
    expect(keyframes).not.toMatch(/(top|left|height|margin):/);
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)", css.indexOf(".zettel-geht { animation-name")));
    expect(reduced.slice(0, 200)).toContain(".zettel-geht { animation-name: zettel-blende; }");
  });
});
