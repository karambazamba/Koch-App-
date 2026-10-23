// Pinnwand: alles verschwindet 24 Std. nach dem Schreiben bzw. der Aufnahme
// (Tafel 72) – Text um 23:59 noch da, um 24:01 weg; ungehörte Sprachnachricht
// nach 24 Std. weg, ihr Ton gleich mit; „Dauerhaft anheften“ bleibt (nur
// Text, oben, kleine Nadel); beim Start wird Altes still weggeräumt; einmal
// im Kopf „Nachrichten verschwinden nach 24 Stunden“, kein Countdown.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { at, atFresh, fakeWindow, noBrowser } from "../helpers";
import { now } from "@/lib/core/now";
import { createMemo, createPin, memoAlive, setPinPinned, visiblePins } from "@/lib/pinnwand";

const ms = () => now().getTime();
const MIN = 60_000;

afterEach(() => {
  noBrowser();
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
});

describe("24 Stunden ab dem Schreiben", () => {
  it("Text: 23:59 Std. später noch da, 24:01 weg", () => {
    at("2026-10-22T09:00");
    const p = createPin("Bin um 6 zurück", "Felix")!;
    const t0 = ms();
    expect(visiblePins([p], t0 + 23 * 60 * MIN + 59 * MIN)).toHaveLength(1);
    expect(visiblePins([p], t0 + 24 * 60 * MIN + MIN)).toHaveLength(0);
  });

  it("dauerhaft angeheftet bleibt – und steht oben", () => {
    at("2026-10-22T09:00");
    const p = createPin("WLAN: Sonnenblume42", "Felix")!;
    const kept = setPinPinned([p], p.id, true, "s")[0];
    at("2026-10-29T09:00");
    const fresh = createPin("Neu", "Lisa")!;
    expect(visiblePins([fresh, kept], ms()).map((m) => m.data.text)).toEqual(["Neu", "WLAN: Sonnenblume42"]);
  });

  it("ungehörte Sprachnachricht: nach 24 Std. weg", () => {
    at("2026-10-22T09:00");
    const m = createMemo({ author: "Lisa", dauer: 4, mime: "audio/mp4", wave: [0.2] });
    expect(memoAlive(m, ms() + 24 * 60 * MIN - 1)).toBe(true);
    expect(memoAlive(m, ms() + 24 * 60 * MIN)).toBe(false);
  });
});

describe("Beim Start aufräumen (Übergang von der 3-Tage-Regel)", () => {
  it("Altes fliegt aus dem Speicher (außer Angeheftetem), der Ton abgelaufener Memos wird gelöscht", async () => {
    fakeWindow();
    vi.resetModules();
    await atFresh("2026-10-20T09:00");
    const pw = await import("@/lib/pinnwand");
    const old = pw.createPin("Von vorgestern", "Felix")!;
    const pinned = pw.createPin("Bleibt", "Felix")!;
    const memo = pw.createMemo({ author: "Lisa", dauer: 4, mime: "audio/mp4", wave: [0.2] });
    // gespeichert wie früher (3-Tage-Regel): direkt, ohne Aufräumen
    window.localStorage.setItem("wasgibts.pinnwand", JSON.stringify({ version: 3, messages: [old, { ...pinned, data: { ...pinned.data, pinned: true } }], memos: [memo] }));
    await atFresh("2026-10-21T12:00");
    const audio = await import("@/lib/pinnwand/memoAudio");
    (globalThis as { indexedDB?: unknown }).indexedDB = {};
    vi.spyOn(audio.memoAudio, "list").mockResolvedValue([{ id: memo.id, at: new Date("2026-10-20T09:00:00Z").getTime() }]);
    const removed = vi.spyOn(audio.memoAudio, "remove").mockResolvedValue();
    await audio.tidyPinboard();
    expect(pw.loadPins().map((m) => m.data.text)).toEqual(["Bleibt"]);
    expect(pw.loadMemos()).toEqual([]);
    expect(removed).toHaveBeenCalledWith(memo.id);
  });
});

describe("Oberfläche", () => {
  it("einmal im Kopf „Nachrichten verschwinden nach 24 Stunden“, kein Countdown; Menü „Dauerhaft anheften“; kleine Nadel", () => {
    const view = readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8");
    expect(view).toContain("Nachrichten verschwinden nach 24 Stunden");
    expect(view).toMatch(/markHintSeen\("pinnwand-24h"\)/);
    expect(view).not.toMatch(/noch \d|verbleibend|läuft ab/);
    expect(view).toMatch(/<Pin className="h-\[13px\] w-\[13px\]/);
    expect(readFileSync("src/components/pinnwand/ReactionMenu.tsx", "utf8")).toContain('"Dauerhaft anheften"');
    expect(readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8")).toMatch(/item\.pinned && <Pin/);
  });
});
