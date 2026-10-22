// Erkennung in der App (recognizer.ts): fragt /api/kennenlernen nur, wenn die
// KI nutzbar ist – hier immer mit Ersatz für fetch und den Begleitungs-Client.
import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({
  usable: true,
  slot: true,
  forgot: 0,
}));

vi.mock("@/lib/begleitung/client", () => ({
  aiUsable: async () => client.usable,
  takeAiSlot: () => client.slot,
  accessHeaders: () => ({ "x-lotte-code": "code" }),
  deviceId: () => "geraet-1",
  forgetAccessCode: () => {
    client.forgot++;
  },
}));

async function load() {
  vi.resetModules();
  return (await import("@/lib/einstellungen/onboarding/recognizer")).recognizeAnswer;
}

function stubFetch(status: number, body: unknown = {}) {
  const fetch = vi.fn(async () => ({ status, ok: status >= 200 && status < 300, json: async () => body }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

beforeEach(() => {
  client.usable = true;
  client.slot = true;
  client.forgot = 0;
  vi.unstubAllGlobals();
});

describe("Erkennung in der App", () => {
  it("schickt Art, Text, Namen und Gerät und liefert die Antwort", async () => {
    const recognizeAnswer = await load();
    const fetch = stubFetch(200, { names: [{ name: "Rosi" }] });
    const r = await recognizeAnswer("names", "Oma Rosi", ["Lisa"], "Rosi");
    expect(r).toEqual({ names: [{ name: "Rosi" }] });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/kennenlernen");
    expect(init.headers).toMatchObject({ "x-lotte-code": "code", "content-type": "application/json" });
    expect(JSON.parse(String(init.body))).toEqual({ deviceId: "geraet-1", kind: "names", text: "Oma Rosi", names: ["Lisa"], person: "Rosi" });
  });

  it("fragt gar nicht ohne Art, ohne Text, ohne KI oder ohne Tageskontingent", async () => {
    const recognizeAnswer = await load();
    const fetch = stubFetch(200);
    expect(await recognizeAnswer(null, "x", [])).toBeUndefined();
    expect(await recognizeAnswer("names", "  ", [])).toBeUndefined();
    client.usable = false;
    expect(await recognizeAnswer("names", "x", [])).toBeUndefined();
    client.usable = true;
    client.slot = false;
    expect(await recognizeAnswer("names", "x", [])).toBeUndefined();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falscher Zugangscode wird vergessen, Fehler → Regeln", async () => {
    const recognizeAnswer = await load();
    stubFetch(401);
    expect(await recognizeAnswer("person", "7 Jahre", [])).toBeUndefined();
    expect(client.forgot).toBe(1);
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await recognizeAnswer("person", "7 Jahre", [])).toBeUndefined();
  });

  it("nach 503 (keine KI eingerichtet) fragt sie nicht mehr", async () => {
    const recognizeAnswer = await load();
    const fetch = stubFetch(503);
    expect(await recognizeAnswer("names", "Rosi", [])).toBeUndefined();
    expect(await recognizeAnswer("names", "Rosi", [])).toBeUndefined();
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
