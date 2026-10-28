// Mias Stimme bleibt Mias Stimme (A-035): Status gemerkt statt neu
// abgewartet, langsamer Status und späte erste Silbe (bis 2,5 s) sprechen
// trotzdem mit Mias Stimme, ein Fehler wird still nachgeladen, erst zwei in
// Folge holen das Handy bis Gesprächsende (mit Hinweis). Jeder Ersatz steht
// mit Grund im Mikro-Protokoll, Vorwärmen spricht nichts.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KI_ERLAUBT, atFresh, fakeWindow, noBrowser } from "../helpers";
import { tidyMiaText } from "@/lib/begleitung/tidy";

const STATUS = { configured: true, mock: false, needsCode: false, stimme: { sprechen: true, hoeren: true, v: "x" } };

/** Abspieler: spielt jedes Stück in 50 ms (onplaying sofort, onended danach) */
class FakeAudio {
  src = "";
  preload = "";
  onplaying: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play() {
    if (this.src.startsWith("blob:")) {
      setTimeout(() => this.onplaying?.(), 0);
      setTimeout(() => this.onended?.(), 50);
    }
    return Promise.resolve();
  }
  pause() {}
}

const warte = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Schein-Server: Status nach `statusMs`, Ton nach `tonMs` oder Fehler-Code */
function server({ statusMs = 0, tonMs = 0, ton = [] as number[] } = {}) {
  let n = 0;
  const calls: string[] = [];
  const abruf = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push(`${init?.method ?? "GET"} ${url}`);
    if (url.startsWith("/api/lotte")) {
      await warte(statusMs);
      return Response.json(STATUS);
    }
    if (url.includes("warm=1")) return new Response(null, { status: 204 });
    await warte(tonMs);
    const code = ton[n++] ?? 200;
    return code === 200 ? new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } }) : Response.json({ error: "fehler" }, { status: code });
  });
  vi.stubGlobal("fetch", abruf);
  return { abruf, calls };
}

async function laden() {
  const w = fakeWindow(KI_ERLAUBT);
  vi.stubGlobal("Audio", FakeAudio);
  const m = await import("@/lib/begleitung/stimmeClient");
  m.audioFreischalten();
  return { w, ...m };
}

const protokoll = (w: ReturnType<typeof fakeWindow>) => (JSON.parse(w.localStorage.getItem("wasgibts.mikroprotokoll") ?? "{}").entries ?? []).map((e: { text: string }) => e.text) as string[];

function vorlesen(m: Awaited<ReturnType<typeof laden>>, text = "Pizza steht für Freitag drin.") {
  const cb = { anfang: vi.fn(), ende: vi.fn(), ersatz: vi.fn() };
  const fertig = m.mitMiasStimme(text, cb);
  return { cb, fertig };
}

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  await atFresh("2026-10-21T10:00");
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  noBrowser();
});

describe("Mias Stimme bleibt Mias Stimme", () => {
  it("langsamer Status (800 ms): trotzdem Mias Stimme, kein Handy", async () => {
    const { calls } = server({ statusMs: 800 });
    const m = await laden();
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(3000);
    await fertig;
    expect(cb.ersatz).not.toHaveBeenCalled();
    expect(cb.anfang).toHaveBeenCalled();
    expect(cb.ende).toHaveBeenCalledTimes(1);
    expect(calls).toContain("POST /api/stimme");
  });

  it("Status beim Öffnen der Bühne geholt und gemerkt: sofort ElevenLabs, kein zweiter Status-Abruf", async () => {
    const { calls } = server({ statusMs: 300 });
    const m = await laden();
    const zu = m.stimmeGespraech(true);
    await vi.advanceTimersByTimeAsync(400);
    expect(calls.filter((c) => c.includes("/api/lotte"))).toHaveLength(1);
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(0);
    expect(calls.at(-1)).toBe("POST /api/stimme");
    await vi.advanceTimersByTimeAsync(200);
    await fertig;
    expect(cb.ende).toHaveBeenCalled();
    expect(calls.filter((c) => c.includes("/api/lotte"))).toHaveLength(1);
    zu();
  });

  it("erste Silbe nach 2 s: Mias Stimme (Grenze jetzt 2,5 s)", async () => {
    server({ tonMs: 2000 });
    const m = await laden();
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(1999);
    expect(cb.anfang).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(500);
    await fertig;
    expect(cb.ersatz).not.toHaveBeenCalled();
    expect(cb.ende).toHaveBeenCalled();
  });

  it("ein Fehler: still einmal nachladen, dann Mias Stimme (kein Hinweis)", async () => {
    const { calls } = server({ ton: [502, 200] });
    const m = await laden();
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(500);
    await fertig;
    expect(cb.ersatz).not.toHaveBeenCalled();
    expect(cb.ende).toHaveBeenCalled();
    expect(calls.filter((c) => c === "POST /api/stimme")).toHaveLength(2);
    expect(m.stimmeHinweisJetzt()).toBeNull();
    expect(protokoll(m.w)).toEqual(["Stimme: still nochmal (Fehler 502)"]);
  });

  it("zwei Fehler in Folge: Handy-Stimme bis Gesprächsende, mit Hinweis; neues Gespräch = wieder Mia", async () => {
    const { calls } = server({ ton: [502, 502, 200] });
    const m = await laden();
    const zu = m.stimmeGespraech(false);
    const eins = vorlesen(m);
    await vi.advanceTimersByTimeAsync(500);
    await eins.fertig;
    expect(eins.cb.ersatz).toHaveBeenCalledWith("Pizza steht für Freitag drin.");
    expect(m.stimmeHinweisJetzt()).toBe(m.HANDY_HINWEIS);
    expect(m.HANDY_HINWEIS).toBe("Netz wackelt, ich sprech kurz mit Handy-Stimme.");
    expect(tidyMiaText(m.HANDY_HINWEIS)).toBe(m.HANDY_HINWEIS);
    expect(protokoll(m.w)).toEqual(["Stimme: still nochmal (Fehler 502)", "Stimme: Ersatz Handy-Stimme bis Gesprächsende (Fehler 502)"]);
    // Rest des Gesprächs: gleich das Handy, kein Springen zurück
    const vorher = calls.length;
    const zwei = vorlesen(m, "Und Salat dazu.");
    await zwei.fertig;
    expect(zwei.cb.ersatz).toHaveBeenCalledWith("Und Salat dazu.");
    expect(calls.length).toBe(vorher);
    // Hinweis ist klein und geht wieder
    await vi.advanceTimersByTimeAsync(7000);
    expect(m.stimmeHinweisJetzt()).toBeNull();
    // Bühne zu und wieder auf: wieder Mias Stimme
    zu();
    m.stimmeGespraech(false);
    const drei = vorlesen(m);
    await vi.advanceTimersByTimeAsync(500);
    await drei.fertig;
    expect(drei.cb.ersatz).not.toHaveBeenCalled();
    expect(drei.cb.ende).toHaveBeenCalled();
  });

  it("erste Silbe zweimal zu spät: Grund „erste Silbe zu spät“ im Protokoll, dann Handy", async () => {
    server({ tonMs: 9000 });
    const m = await laden();
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(2500);
    expect(cb.ersatz).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2500);
    await fertig;
    expect(cb.ersatz).toHaveBeenCalledTimes(1);
    expect(protokoll(m.w)).toEqual(["Stimme: still nochmal (erste Silbe zu spät)", "Stimme: Ersatz Handy-Stimme bis Gesprächsende (erste Silbe zu spät)"]);
  });

  it("Status zweimal zu spät: Grund „Status zu spät“, dann Handy", async () => {
    server({ statusMs: 9000 });
    const m = await laden();
    const { cb, fertig } = vorlesen(m);
    await vi.advanceTimersByTimeAsync(5000);
    await fertig;
    expect(cb.ersatz).toHaveBeenCalledTimes(1);
    expect(protokoll(m.w)).toEqual(["Stimme: still nochmal (Status zu spät)", "Stimme: Ersatz Handy-Stimme bis Gesprächsende (Status zu spät)"]);
  });

  it("ohne Server-Stimme: Handy ohne Hinweis, Grund einmal je Gespräch im Protokoll", async () => {
    const w = fakeWindow(KI_ERLAUBT);
    vi.stubGlobal("Audio", FakeAudio);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ configured: true, mock: false, needsCode: false })));
    const m = await import("@/lib/begleitung/stimmeClient");
    m.audioFreischalten();
    for (const t of ["Eins.", "Zwei."]) {
      const ersatz = vi.fn();
      await m.mitMiasStimme(t, { anfang: vi.fn(), ende: vi.fn(), ersatz });
      expect(ersatz).toHaveBeenCalledWith(t);
    }
    expect(m.stimmeHinweisJetzt()).toBeNull();
    expect(protokoll(w)).toEqual(["Stimme: Ersatz Handy-Stimme (nicht eingerichtet)"]);
  });

  it("Vorwärmen beim Öffnen: kleiner Abruf beim eigenen Server, kein Sprechen", async () => {
    const { calls } = server();
    const m = await laden();
    m.stimmeGespraech(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(calls).toEqual(["GET /api/lotte", "GET /api/stimme?warm=1"]);
    // gleich nochmal auf: nicht schon wieder
    m.stimmeGespraech(true);
    await vi.advanceTimersByTimeAsync(10);
    expect(calls.filter((c) => c.includes("warm"))).toHaveLength(1);
  });
});
