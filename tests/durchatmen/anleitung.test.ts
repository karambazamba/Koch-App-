// A-061: Keine Roboterstimme – Durchatmen spricht nur mit Mias Stimme (Datei),
// fehlt sie, gibt es keine Sprache (nur Klang). `speak` nachgestellt.
import { afterEach, describe, expect, it, vi } from "vitest";

const speak = vi.fn();
vi.mock("@/lib/begleitung/speech", () => ({ speak: (...a: unknown[]) => speak(...a), stopSpeaking: vi.fn() }));
vi.mock("@/lib/durchatmen/klang", () => ({ atemPhase: vi.fn(), gong: vi.fn(), klingen: vi.fn(), tonAus: vi.fn(), vibrieren: vi.fn() }));

afterEach(() => speak.mockReset());

describe("Ansagen nur mit Mias Stimme", () => {
  it("jede Ansage als Datei ohne Ersatz durch die Handy-Stimme", async () => {
    const { sage } = await import("@/lib/durchatmen/anleitung");
    sage("ferne");
    expect(speak).toHaveBeenCalledTimes(1);
    const [text, o] = speak.mock.calls[0] as [string, Record<string, unknown>];
    expect(text).toBe("Schau so weit weg, wie es geht.");
    expect(o).toMatchObject({ id: "durchatmen", ersatz: false });
    expect(String(o.datei)).toMatch(/^\/audio\/durchatmen\/ferne\.mp3\?t=/);
    expect(o).not.toHaveProperty("quelle");
  });

  it("unbekannte Ansage: nichts", async () => {
    const { sage } = await import("@/lib/durchatmen/anleitung");
    sage("gibtsnicht");
    expect(speak).not.toHaveBeenCalled();
  });

  it("„Nur Klang“ und „Still“: nie Sprache", async () => {
    const { anleiten } = await import("@/lib/durchatmen/anleitung");
    const { uebungVon } = await import("@/lib/durchatmen/uebungen");
    const u = uebungVon("kaestchen")!;
    for (const art of ["klang", "still"] as const) anleiten({ art: "phase", phase: "ein", runde: 0 }, u, { art, zaehlen: true, erstes: true });
    anleiten({ art: "ende" }, u, { art: "klang", zaehlen: false, erstes: false });
    expect(speak).not.toHaveBeenCalled();
  });
});
