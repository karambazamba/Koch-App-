// Mias Stimme und Ohr in der App: ohne Einwilligung oder Server-Stimme
// sofort die Stimme des Handys, Zuhören: Fehler einmal still nochmal, „aus“ →
// bis zum Neuladen der Browser, Sekunden landen im Verbrauch.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KI_ERLAUBT, atFresh, fakeWindow, noBrowser } from "../helpers";

const status = (stimme?: { sprechen: boolean; hoeren: boolean; v: string }) => Response.json({ configured: true, mock: false, needsCode: false, ...(stimme ? { stimme } : {}) });

beforeEach(async () => {
  vi.resetModules();
  await atFresh("2026-10-21T10:00");
});
afterEach(() => {
  vi.unstubAllGlobals();
  noBrowser();
});

describe("Vorlesen mit Mias Stimme", () => {
  it("ohne KI-Einwilligung: gleich die Stimme des Handys, kein Abruf", async () => {
    fakeWindow();
    const abruf = vi.fn(async () => status({ sprechen: true, hoeren: true, v: "x" }));
    vi.stubGlobal("fetch", abruf);
    const { mitMiasStimme } = await import("@/lib/begleitung/stimmeClient");
    const ersatz = vi.fn();
    await mitMiasStimme("Moin.", { anfang: vi.fn(), ende: vi.fn(), ersatz });
    expect(ersatz).toHaveBeenCalledWith("Moin.");
    expect(abruf).not.toHaveBeenCalled();
  });

  it("Server ohne Stimme: Stimme des Handys mit dem ganzen Text", async () => {
    fakeWindow(KI_ERLAUBT);
    vi.stubGlobal("fetch", vi.fn(async () => status()));
    const { mitMiasStimme } = await import("@/lib/begleitung/stimmeClient");
    const ersatz = vi.fn();
    await mitMiasStimme("Steht drin. Und morgen Pizza.", { anfang: vi.fn(), ende: vi.fn(), ersatz });
    expect(ersatz).toHaveBeenCalledWith("Steht drin. Und morgen Pizza.");
  });
});

describe("Zuhören mit Mias Ohr", () => {
  it("Fehler: einmal still nochmal, dann der Text; Sekunden im Verbrauch", async () => {
    const w = fakeWindow(KI_ERLAUBT);
    let n = 0;
    const abruf = vi.fn(async () => (++n === 1 ? new Response("", { status: 502 }) : Response.json({ text: "Milch auf die Liste", sekunden: 4 })));
    vi.stubGlobal("fetch", abruf);
    const { aufnahmeVerstehen } = await import("@/lib/begleitung/stimmeClient");
    expect(await aufnahmeVerstehen(new Blob([new Uint8Array(10)], { type: "audio/webm" }), 4200)).toBe("Milch auf die Liste");
    expect(abruf).toHaveBeenCalledTimes(2);
    const [url, init] = abruf.mock.calls[1] as unknown as [string, RequestInit];
    expect(url).toBe("/api/hoeren");
    expect((init.headers as Record<string, string>)["content-type"]).toBe("audio/webm");
    expect((init.headers as Record<string, string>)["x-mia-dauer"]).toBe("4200");
    expect(JSON.parse(w.localStorage.getItem("wasgibts.verbrauch") ?? "{}").days["2026-10-21"]).toMatchObject({ sekunden: 4 });
  });

  it("zweimal Fehler: null (App sagt „Hat grad nicht geklappt. Nochmal?“)", async () => {
    fakeWindow(KI_ERLAUBT);
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const { aufnahmeVerstehen } = await import("@/lib/begleitung/stimmeClient");
    expect(await aufnahmeVerstehen(new Blob([new Uint8Array(10)]), 1000)).toBeNull();
  });

  it("„aus“ vom Server: bis zum Neuladen wieder der Browser", async () => {
    fakeWindow(KI_ERLAUBT);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "aus" }, { status: 503 })));
    vi.stubGlobal("MediaRecorder", class {});
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: () => Promise.reject(new Error("x")) } });
    const { aufnahmeVerstehen, serverOhr } = await import("@/lib/begleitung/stimmeClient");
    expect(serverOhr({ hoeren: true })).toBe(true);
    expect(serverOhr(null)).toBe(false);
    expect(await aufnahmeVerstehen(new Blob([new Uint8Array(10)]), 1000)).toBeNull();
    expect(serverOhr({ hoeren: true })).toBe(false);
  });
});
