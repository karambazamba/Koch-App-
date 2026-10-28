import { describe, expect, it } from "vitest";
import { MEMO_IDLE, discardNeedsUndo, holdsMic, memoReducer, timeAnnouncement, timeWarns, type MemoEvent, type MemoState } from "@/lib/pinnwand/recorderState";

const run = (...events: MemoEvent[]): MemoState => events.reduce(memoReducer, MEMO_IDLE);

describe("Sprachnachricht: antippen statt halten", () => {
  it("antippen → nimmt auf (läuft frei) → senden", () => {
    const s = run({ type: "start", mode: "tippen" }, { type: "ready" }, { type: "tick", ms: 3000 });
    expect(s).toMatchObject({ phase: "nimmt_auf", mode: "tippen", ms: 3000 });
    expect(memoReducer(s, { type: "send" })).toEqual({ ...MEMO_IDLE, outcome: "gesendet" });
  });

  it("antippen → verwerfen", () => {
    expect(run({ type: "start", mode: "tippen" }, { type: "ready" }, { type: "discard" }).outcome).toBe("verworfen");
  });

  it("halten → loslassen = senden; kurz gedrückt = frei weiter; hochschieben = frei weiter", () => {
    const holding = run({ type: "start", mode: "halten" }, { type: "ready" });
    expect(memoReducer(holding, { type: "release", pressMs: 2000, slideUp: false }).outcome).toBe("gesendet");
    expect(memoReducer(holding, { type: "release", pressMs: 120, slideUp: false })).toMatchObject({ phase: "nimmt_auf", mode: "tippen" });
    expect(memoReducer(holding, { type: "release", pressMs: 2000, slideUp: true })).toMatchObject({ phase: "nimmt_auf", mode: "tippen" });
    // Freigabe dauert noch: kurz antippen bleibt trotzdem eine Aufnahme
    expect(memoReducer(run({ type: "start", mode: "halten" }), { type: "release", pressMs: 100, slideUp: false })).toMatchObject({ phase: "fragt", mode: "tippen" });
  });

  it("Halten: das Mikro bleibt unter dem Finger, bis losgelassen wird (Neuer Zettel, v0.138.0)", () => {
    const fragt = run({ type: "start", mode: "halten" });
    const nimmt = run({ type: "start", mode: "halten" }, { type: "ready" });
    expect(holdsMic(fragt)).toBe(true);
    expect(holdsMic(nimmt)).toBe(true);
    // losgelassen (frei weiter) oder angetippt: die Aufnahme-Leiste übernimmt
    expect(holdsMic(memoReducer(nimmt, { type: "release", pressMs: 2000, slideUp: true }))).toBe(false);
    expect(holdsMic(run({ type: "start", mode: "tippen" }, { type: "ready" }))).toBe(false);
    expect(holdsMic(MEMO_IDLE)).toBe(false);
    expect(holdsMic(memoReducer(nimmt, { type: "hidden" }))).toBe(false);
  });

  it("60-s-Grenze: hält an und wartet (nie automatisch senden)", () => {
    const s = run({ type: "start", mode: "tippen" }, { type: "ready" }, { type: "tick", ms: 59_900 }, { type: "tick", ms: 60_100 });
    expect(s).toMatchObject({ phase: "gestoppt", ms: 60_000, outcome: null });
    expect(memoReducer(s, { type: "tick", ms: 70_000 })).toBe(s);
    expect(memoReducer(s, { type: "send" }).outcome).toBe("gesendet");
    expect([timeWarns(49_999), timeWarns(50_000)]).toEqual([false, true]);
  });

  it("Seite/App verlassen hält an; Verwerfen mit Rückgängig ab 3 s", () => {
    const s = run({ type: "start", mode: "halten" }, { type: "ready" }, { type: "tick", ms: 7000 }, { type: "hidden" });
    expect(s).toMatchObject({ phase: "gestoppt", mode: "tippen" });
    const gone = memoReducer(s, { type: "discard" });
    expect(memoReducer(gone, { type: "undo", ms: 7000 })).toMatchObject({ phase: "gestoppt", ms: 7000 });
    expect([discardNeedsUndo(2999), discardNeedsUndo(3000)]).toEqual([false, true]);
  });

  it("Mikrofon abgelehnt → bereit; nichts doppelt starten", () => {
    expect(run({ type: "start", mode: "tippen" }, { type: "denied" })).toEqual(MEMO_IDLE);
    const s = run({ type: "start", mode: "tippen" }, { type: "ready" });
    expect(memoReducer(s, { type: "start", mode: "halten" })).toBe(s);
  });

  it("VoiceOver: Zeit alle 10 s", () => {
    expect([timeAnnouncement(9_900), timeAnnouncement(10_000), timeAnnouncement(20_400)]).toEqual([null, "10 Sekunden", "20 Sekunden"]);
  });
});
