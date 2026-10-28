import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { KI_ERLAUBT, at, memoryStorage } from "../helpers";
import type { AssistantData, ChangeOp } from "@/lib/begleitung/ops";
import type { StreamEvent } from "@/lib/begleitung/protocol";
import { daten, HEUTE, rezept, termin, WOCHEN } from "./werkzeugKontext";

type Client = typeof import("@/lib/begleitung/client");
let local: Storage;
let client: Client;

/** Kleiner Browser-Ersatz; Module danach frisch laden (eigene Zwischenspeicher) */
async function frisch(initial: Record<string, string> = {}) {
  local = memoryStorage({ ...KI_ERLAUBT, ...initial });
  (globalThis as { window?: unknown }).window = {
    localStorage: local,
    sessionStorage: memoryStorage(),
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => true,
    location: { search: "", pathname: "/", href: "http://localhost/" },
  };
  vi.resetModules();
  // Frisch geladene Module haben ihre eigene Uhr – auch dort die feste Zeit setzen
  (await import("@/lib/core/now")).setNowForTests(new Date("2026-10-21T09:00:00+02:00"));
  client = await import("@/lib/begleitung/client");
}

const json = (body: unknown, init: ResponseInit = {}) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
function ndjson(events: (StreamEvent | string)[], opts: { split?: boolean; failAfter?: boolean } = {}) {
  const enc = new TextEncoder();
  const lines = events.map((e) => (typeof e === "string" ? e : JSON.stringify(e))).join("\n") + "\n";
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      if (opts.split) {
        const mid = Math.floor(lines.length / 2);
        c.enqueue(enc.encode(lines.slice(0, mid)));
        c.enqueue(enc.encode(lines.slice(mid)));
      } else c.enqueue(enc.encode(lines));
      if (opts.failAfter) c.error(new Error("weg"));
      else c.close();
    },
  });
  return new Response(body, { status: 200, headers: { "content-type": "application/x-ndjson" } });
}

beforeEach(async () => {
  at("2026-10-21T09:00");
  await frisch();
});
afterEach(() => {
  vi.unstubAllGlobals();
  delete (globalThis as { window?: unknown }).window;
});

const ask = (data: AssistantData = daten(), opts = {}) => client.askAssistant([{ role: "user", text: "Hallo" }], [], data, HEUTE, WOCHEN.aktuell, 0, opts);

describe("Gerät, Tageslimit, Zugangscode", () => {
  it("deviceId wird einmal erzeugt und gemerkt", () => {
    const id = client.deviceId();
    expect(id).toMatch(/^[\w-]{8,64}$/);
    expect(client.deviceId()).toBe(id);
    expect(local.getItem("wasgibts.geraet")).toBe(id);
  });

  it("takeAiSlot zählt bis zum Tageslimit, ein neuer Tag beginnt bei null", async () => {
    await frisch({ "wasgibts.lotte.anfragen": JSON.stringify({ day: HEUTE, n: 99 }) });
    expect(client.takeAiSlot()).toBe(true);
    expect(client.takeAiSlot()).toBe(false);
    await expect(ask()).rejects.toMatchObject({ reason: "limit" });
    await frisch({ "wasgibts.lotte.anfragen": JSON.stringify({ day: "2026-10-20", n: 100 }) });
    expect(client.takeAiSlot()).toBe(true);
    expect(JSON.parse(local.getItem("wasgibts.lotte.anfragen")!)).toEqual({ day: HEUTE, n: 1 });
    await frisch({ "wasgibts.lotte.anfragen": "kaputt" });
    expect(client.takeAiSlot()).toBe(true);
  });

  it("saveAccessCode prüft beim Server und merkt nur richtige Codes", async () => {
    expect(await client.saveAccessCode("  ")).toBe("falsch");
    const fetchMock = vi.fn(async () => json({ configured: true, mock: false, needsCode: true, access: "falsch" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await client.saveAccessCode("mond")).toBe("falsch");
    expect(client.accessHeaders()).toEqual({});
    fetchMock.mockImplementation(async () => json({ configured: true, mock: false, needsCode: true, access: "ok" }));
    fetchMock.mockImplementation(async () => json({ configured: true, mock: false, needsCode: true, access: "pause" }));
    expect(await client.saveAccessCode("mond")).toBe("pause");
    fetchMock.mockImplementation(async () => json({ configured: true, mock: false, needsCode: true, access: "ok" }));
    expect(await client.saveAccessCode(" sonne ")).toBe("ok");
    // nur im Header, nie in der Adresse
    const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
    expect(url).not.toContain("sonne");
    expect(init.headers).toEqual({ "x-lotte-code": "sonne" });
    expect(client.accessHeaders()).toEqual({ "x-lotte-code": "sonne" });
    fetchMock.mockImplementation(async () => {
      throw new Error("offline");
    });
    expect(await client.saveAccessCode("stern")).toBe("offline");
    client.forgetAccessCode();
    expect(client.accessHeaders()).toEqual({});
  });

  it("aiUsable: eingerichtet und Code ok; falscher gemerkter Code wird vergessen; offline = aus", async () => {
    await frisch({ "wasgibts.zugangscode": "alt" });
    const fetchMock = vi.fn(async () => json({ configured: true, mock: false, needsCode: true, access: "falsch" }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await client.aiUsable()).toBe(false);
    expect(local.getItem("wasgibts.zugangscode")).toBeNull();
    // Ergebnis wird geteilt
    expect(await client.aiUsable()).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await frisch();
    vi.stubGlobal("fetch", vi.fn(async () => json({ configured: true, mock: true, needsCode: false })));
    expect(await client.aiUsable()).toBe(true);

    await frisch();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500 })));
    expect(await client.aiUsable()).toBe(false);

    await frisch();
    const offline = vi.fn(async () => {
      throw new Error("offline");
    });
    vi.stubGlobal("fetch", offline);
    expect(await client.aiUsable()).toBe(false);
    expect(await client.aiUsable()).toBe(false);
    expect(offline).toHaveBeenCalledTimes(2); // offline: beim nächsten Mal neu prüfen
  });

  it("unavailableText: nie „nicht verstanden“ – offline, Limit, sonst „Nochmal?“", () => {
    expect(client.unavailableText()).toBe("Hat grad nicht geklappt. Nochmal?");
    expect(client.unavailableText("limit")).toBe("Für heute hab ich genug geredet. Listen und Termine gehen natürlich weiter.");
    vi.stubGlobal("navigator", { onLine: false });
    expect(client.unavailableText()).toBe("Bin grad offline. Ich mach’s, sobald wieder Netz da ist.");
  });
});

describe("Datenschutz: KI nur mit Einwilligung", () => {
  it("ohne OK fragt die App die KI nie – auch nicht nach dem Status", async () => {
    await frisch({ "wasgibts.einwilligungen": "null" });
    const fetchMock = vi.fn(async () => json({ configured: true, mock: true, needsCode: false }));
    vi.stubGlobal("fetch", fetchMock);
    expect(await client.aiUsable()).toBe(false);
    await expect(ask()).rejects.toMatchObject({ reason: "einwilligung" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("askAssistant", () => {
  it("liest den Stream Stück für Stück, ersetzt Zwischenstände nach einer neuen Runde", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () =>
      ndjson([{ t: "text", d: "Ich schau" }, { t: "text", d: " mal …" }, "kein json", { t: "round" }, { t: "text", d: "Fertig." }, { t: "done", reply: "Fertig.", ops: [], chips: ["Ja"], usage: { size: "klein", upgraded: false, micro: 12 } }], { split: true }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const seen: string[] = [];
    const r = await ask(daten(), { onText: (t: string) => seen.push(t), clock: "09:00", shoppingNames: ["Milch"] });
    expect(r).toMatchObject({ reply: "Fertig.", ops: [], chips: ["Ja"] });
    expect(seen).toEqual(["Ich schau", "Ich schau mal …", "Fertig."]);
    expect(JSON.parse(local.getItem("wasgibts.verbrauch")!).days[HEUTE]).toMatchObject({ requests: 1, small: 1, micro: 12 });
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(body).toMatchObject({ today: HEUTE, stream: true, clock: "09:00", shoppingNames: ["Milch"], tipsThisWeek: 0 });
  });

  it("schickt nur das Nötige: ohne Schritte, ohne alte Wochen und Vergangenes", async () => {
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => ndjson([{ t: "done", reply: "Ok", ops: [] }]));
    vi.stubGlobal("fetch", fetchMock);
    const data = daten({
      recipes: { r: rezept("r", "Chili", ["Bohnen"]) },
      mealPlans: { "2026-10-12": {}, [WOCHEN.aktuell]: {} },
      entries: [termin({ title: "Alt", date: "2026-09-01", start: "10:00" }), termin({ title: "Neu", date: "2026-10-22", start: "10:00" }), termin({ title: "Serie", date: "2026-01-05", start: "10:00", repeat: { kind: "woechentlich" } })],
      pantry: [{ id: "b:Milch", name: "Milch", addedAt: HEUTE, place: "schrank" }],
    });
    await ask(data);
    const sent = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).data as AssistantData;
    expect(sent.recipes.r.steps).toEqual([]);
    expect(Object.keys(sent.mealPlans)).toEqual([WOCHEN.aktuell]);
    expect(sent.entries?.map((e) => e.data.title)).toEqual(["Neu", "Serie"]);
    expect(sent.pantry?.[0]).toMatchObject({ id: "gekauft", name: "Milch" });
    expect(sent.wetterOrt).toBe("Eutin");
    expect(sent.me).toBe("p-felix");
    expect(sent.timers).toEqual([]);
  });

  it("Fehler im Stream, abgebrochener Stream, Stream ohne Ende", async () => {
    await frisch({ "wasgibts.zugangscode": "alt" });
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ t: "error", error: "zugangscode" }])));
    await expect(ask()).rejects.toMatchObject({ reason: "zugangscode" });
    expect(local.getItem("wasgibts.zugangscode")).toBeNull();
    // falscher Code beim KI-Versuch → der Zugangscode-Bildschirm kommt (nicht der Chat)
    expect((await import("@/lib/begleitung/codeAbfrage")).codeScreenState().open).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ t: "error", error: "limit" }])));
    await expect(ask()).rejects.toMatchObject({ reason: "limit" });
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ t: "text", d: "a" }], { failAfter: true })));
    await expect(ask()).rejects.toMatchObject({ reason: "offline" });
    vi.stubGlobal("fetch", vi.fn(async () => ndjson([{ t: "text", d: "a" }])));
    await expect(ask()).rejects.toMatchObject({ reason: "fehler", message: "Hat grad nicht geklappt. Nochmal?" });
  });

  it("Antwort ohne Stream (JSON) und Fehlercodes", async () => {
    await frisch({ "wasgibts.zugangscode": "alt" });
    vi.stubGlobal("fetch", vi.fn(async () => json({ reply: "Direkt", ops: [], usage: { size: "gross", upgraded: false, micro: 1 } })));
    expect(await ask()).toMatchObject({ reply: "Direkt" });
    vi.stubGlobal("fetch", vi.fn(async () => json({ error: "zugangscode" }, { status: 401 })));
    await expect(ask()).rejects.toMatchObject({ reason: "zugangscode" });
    expect(local.getItem("wasgibts.zugangscode")).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => new Response("kaputt", { status: 500 })));
    await expect(ask()).rejects.toMatchObject({ reason: "fehler" });
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("kein Netz");
    }));
    await expect(ask()).rejects.toMatchObject({ reason: "offline", message: "Bin grad offline. Ich mach’s, sobald wieder Netz da ist." });
    vi.stubGlobal("navigator", { onLine: false });
    await expect(ask()).rejects.toMatchObject({ reason: "offline" });
  });
});

describe("Sofort ausgeführt: Timer, Stoppuhr, Kochen", () => {
  it("startet Timer, blendet die Timer-Kachel ein und gibt den Rest zurück", async () => {
    const ops: ChangeOp[] = [
      { id: "1", type: "add_timer", name: "Nudeln", minutes: 10 },
      { id: "2", type: "stopwatch", action: "start" },
      { id: "3", type: "add_pin", text: "bleibt für die Vorschau" },
    ];
    const r = client.runInstantOps(ops);
    expect(r.rest.map((o) => o.id)).toEqual(["3"]);
    expect(r.notes).toEqual(["Der Timer steht jetzt auf der Startseite."]);
    const timers = JSON.parse(local.getItem("wasgibts.timer")!);
    expect(timers.timers.map((t: { name: string }) => t.name)).toEqual(["Nudeln"]);
    expect(timers.stopwatch).toBeTruthy();
    // Zweiter Timer: Kachel ist schon da
    expect(client.runInstantOps([{ id: "4", type: "add_timer", name: "Ei", minutes: 5 }]).notes).toEqual([]);
    client.runInstantOps([{ id: "5", type: "stop_timer", name: "Nudeln" }, { id: "6", type: "stopwatch", action: "stop" }]);
    expect(JSON.parse(local.getItem("wasgibts.timer")!).timers.map((t: { name: string }) => t.name)).toEqual(["Ei"]);
  });

  it("Rückgängig nimmt alle Timer einer Antwort zurück (Fehler: der erste blieb stehen)", async () => {
    client.runInstantOps([
      { id: "1", type: "add_timer", name: "Nudeln", minutes: 10 },
      { id: "2", type: "add_timer", name: "Ei", minutes: 5 },
    ]);
    expect(JSON.parse(local.getItem("wasgibts.timer")!).timers).toHaveLength(2);
    const { undoLast } = await import("@/lib/core/undo");
    expect(undoLast()).toBe("den Timer");
    expect(JSON.parse(local.getItem("wasgibts.timer")!).timers).toEqual([]);
  });

  it("höchstens fünf Timer", () => {
    const five: ChangeOp[] = [1, 2, 3, 4, 5].map((i) => ({ id: `t${i}`, type: "add_timer", name: `T${i}`, minutes: 3 }));
    client.runInstantOps(five);
    expect(client.runInstantOps([{ id: "t6", type: "add_timer", name: "T6", minutes: 3 }]).notes).toContain("Fünf Timer laufen schon. Sobald einer fertig ist, geht der nächste.");
  });

  it("Kochen starten und Schritt abhaken", () => {
    client.runInstantOps([{ id: "1", type: "start_cooking" }, { id: "2", type: "cook_step", recipe: "r1", index: 0 }, { id: "3", type: "cook_step", recipe: "r1", index: 0 }]);
    const kochen = JSON.parse(local.getItem("wasgibts.kochen")!);
    expect(JSON.stringify(kochen)).toContain("r1");
  });
});
