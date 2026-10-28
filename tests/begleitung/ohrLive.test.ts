// Auftrag A-026: Mia hört live über ElevenLabs – Text beim Sprechen, Ende von
// selbst. Geprüft: Einmal-Schlüssel nur mit Zugangscode (der echte Schlüssel
// bleibt auf dem Server), das Protokoll (Adresse, Ton-Stücke, Nachrichten,
// 16 kHz), eine Zuhör-Runde mit nachgestelltem Websocket (Live-Text, Ring,
// VAD-Ende, Antippen, 20 s ohne neue Wörter, nichts gesagt, Mikro belegt),
// die Ersatz-Kette (Schlüssel/Verbindung → Browser → Aufnahme) und das
// Pegel-Ende im Café.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_COMMIT_WARTEN_MS, LIVE_RATE, LIVE_RING_MS, LIVE_VERBINDEN_MS, Umrechner, liesNachricht, liveAdresse, tonNachricht, zuBase64 } from "@/lib/begleitung/echtzeitProtokoll";
import { LIVE_WACHE_MS, ohrLiveStarten, type LiveDeps, type LiveRueck, type LiveSocket } from "@/lib/begleitung/ohrLive";
import { ohrWeg, spracheMoeglich } from "@/lib/begleitung/ohrWeg";
import { LAUT_MAX_MS, lauschSchritt, neuesLauschen, type LauschAktion } from "@/lib/begleitung/lauschen";
import { ohrTokenHolen, stimmeStatus } from "@/lib/begleitung/stimmeServer";
import { ACCESS_HEADER } from "@/lib/begleitung/protocol";
import { NICHTS_MS } from "@/lib/begleitung/mitschrift";
import { KI_ERLAUBT, atFresh, fakeWindow, noBrowser } from "../helpers";

// --- Server: Einmal-Schlüssel ----------------------------------------------------------

const echt = () => {
  vi.stubEnv("KUECHENHELFER_MOCK", "");
  vi.stubEnv("STIMME_MOCK", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-ki");
  vi.stubEnv("APP_ACCESS_CODE", "sonne");
  vi.stubEnv("ELEVENLABS_API_KEY", "test-geheim");
  vi.stubEnv("MIA_VOICE_ID", "stimme123");
  vi.stubEnv("ELEVENLABS_LIVE_MODEL", "");
};
let n = 0;
const tokenAnfrage = (headers: Record<string, string> = { [ACCESS_HEADER]: "sonne" }, geraet: unknown = `geraet-live-${++n}`) =>
  new Request("http://localhost/api/stimme/ohr-token", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ geraet }) });

function anbieter(antwort: () => Response = () => Response.json({ token: "einmal-123" })) {
  const calls: { url: string; init: RequestInit }[] = [];
  const abruf = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return antwort();
  }) as unknown as typeof fetch;
  return { abruf, calls };
}

describe("Einmal-Schlüssel fürs Live-Zuhören (Server)", () => {
  let log: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    log = vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("ohne Zugangscode abgelehnt, ohne gültiges Gerät auch – kein Abruf beim Anbieter", async () => {
    echt();
    const { abruf, calls } = anbieter();
    expect((await ohrTokenHolen(tokenAnfrage({}), abruf)).status).toBe(401);
    expect((await ohrTokenHolen(tokenAnfrage({ [ACCESS_HEADER]: "falsch" }), abruf)).status).toBe(401);
    expect((await ohrTokenHolen(tokenAnfrage(undefined, "x"), abruf)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("mit Code: Typ realtime_scribe, echter Schlüssel nur im Kopf zum Anbieter, App bekommt nur den Einmal-Schlüssel", async () => {
    echt();
    const { abruf, calls } = anbieter();
    const r = await ohrTokenHolen(tokenAnfrage(), abruf);
    expect(r.status).toBe(200);
    expect(r.headers.get("cache-control")).toBe("no-store");
    const body = (await r.json()) as Record<string, unknown>;
    expect(body).toEqual({ token: "einmal-123", modell: "scribe_v2_realtime", giltMs: 15 * 60_000 });
    expect(JSON.stringify(body)).not.toContain("test-geheim");
    expect(calls[0].url).toBe("https://api.elevenlabs.io/v1/single-use-token/realtime_scribe");
    expect(calls[0].init.method).toBe("POST");
    expect((calls[0].init.headers as Record<string, string>)["xi-api-key"]).toBe("test-geheim");
  });

  it("ohne Schlüssel, im Testmodus oder mit „aus“: 503 (App hört über den Browser)", async () => {
    echt();
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    const { abruf, calls } = anbieter();
    expect((await ohrTokenHolen(tokenAnfrage(), abruf)).status).toBe(503);
    echt();
    vi.stubEnv("ELEVENLABS_LIVE_MODEL", "aus");
    expect((await ohrTokenHolen(tokenAnfrage(), abruf)).status).toBe(503);
    expect(stimmeStatus().live).toBe(false);
    echt();
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    vi.stubEnv("STIMME_MOCK", "1");
    expect(stimmeStatus()).toMatchObject({ hoeren: true, live: false });
    expect(calls).toHaveLength(0);
    echt();
    expect(stimmeStatus().live).toBe(true);
  });

  it("Anbieter-Fehler: 502, ins Log nur der Status – nie Schlüssel oder Token", async () => {
    echt();
    const { abruf } = anbieter(() => new Response("kaputt", { status: 500 }));
    expect((await ohrTokenHolen(tokenAnfrage(), abruf)).status).toBe(502);
    const ohneToken = anbieter(() => Response.json({}));
    expect((await ohrTokenHolen(tokenAnfrage(), ohneToken.abruf)).status).toBe(502);
    expect(JSON.stringify(log.mock.calls)).not.toMatch(/test-geheim|einmal/);
    expect((await ohrTokenHolen(new Request("http://localhost/api/stimme/ohr-token", { method: "POST", headers: { [ACCESS_HEADER]: "sonne" }, body: "{kaputt" }), abruf)).status).toBe(400);
  });

  it("Server in Frankfurt, Route dünn", () => {
    expect(JSON.parse(readFileSync("vercel.json", "utf8")).regions).toEqual(["fra1"]);
    expect(readFileSync("src/app/api/stimme/ohr-token/route.ts", "utf8")).toContain("ohrTokenHolen(request)");
  });
});

// --- Protokoll -----------------------------------------------------------------------

describe("Protokoll (eine Datei)", () => {
  it("Adresse: Modell, Einmal-Schlüssel, Deutsch fest, PCM 16 kHz, VAD mit 1,2 s Stille", () => {
    const u = new URL(liveAdresse("tok", "scribe_v2_realtime"));
    expect(`${u.protocol}//${u.host}${u.pathname}`).toBe("wss://api.elevenlabs.io/v1/speech-to-text/realtime");
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ model_id: "scribe_v2_realtime", token: "tok", language_code: "de", audio_format: "pcm_16000", commit_strategy: "vad", vad_silence_threshold_secs: "1.2" });
  });

  it("Ton-Stück: PCM 16 Bit little endian als Base64, Commit beim Antippen", () => {
    const m = JSON.parse(tonNachricht(new Int16Array([1, -1, 256]))) as Record<string, unknown>;
    expect(m).toMatchObject({ message_type: "input_audio_chunk", commit: false, sample_rate: LIVE_RATE });
    expect(Buffer.from(String(m.audio_base_64), "base64")).toEqual(Buffer.from([1, 0, 0xff, 0xff, 0, 1]));
    expect(JSON.parse(tonNachricht(new Int16Array(0), true))).toMatchObject({ audio_base_64: "", commit: true });
    expect(zuBase64(new Uint8Array(70_000).fill(65))).toBe(Buffer.alloc(70_000, 65).toString("base64"));
  });

  it("Nachrichten einordnen", () => {
    expect(liesNachricht('{"message_type":"session_started","session_id":"x"}')).toEqual({ art: "bereit" });
    expect(liesNachricht('{"message_type":"partial_transcript","text":"  Milch  auf "}')).toEqual({ art: "teil", text: "Milch auf" });
    expect(liesNachricht('{"message_type":"committed_transcript","text":"Milch auf die Liste."}')).toEqual({ art: "satz", text: "Milch auf die Liste." });
    expect(liesNachricht('{"message_type":"committed_transcript_with_timestamps","text":"Ja."}')).toEqual({ art: "satz", text: "Ja." });
    expect(liesNachricht('{"message_type":"auth_error","error":"Token abgelaufen"}')).toEqual({ art: "fehler", grund: "auth_error" });
    expect(liesNachricht('{"message_type":"quota_exceeded"}')).toEqual({ art: "fehler", grund: "quota_exceeded" });
    expect(liesNachricht('{"message_type":"irgendwas_neues"}')).toEqual({ art: "egal" });
    expect(liesNachricht("kein json")).toEqual({ art: "egal" });
    expect(liesNachricht(new ArrayBuffer(2))).toEqual({ art: "egal" });
  });

  it("48 kHz → 16 kHz ohne Lücken zwischen den Stücken, Werte begrenzt", () => {
    const u = new Umrechner(48_000);
    let gesamt = 0;
    for (let i = 0; i < 10; i++) gesamt += u.push(new Float32Array(4800).fill(0.5)).length;
    expect(Math.abs(gesamt - 16_000)).toBeLessThanOrEqual(1);
    const laut = new Umrechner(16_000).push(new Float32Array([2, -2, 0]));
    expect([...laut]).toEqual([32767, -32768]);
    expect(new Umrechner(44_100).push(new Float32Array(0)).length).toBe(0);
  });
});

// --- Eine Zuhör-Runde mit nachgestelltem Websocket ------------------------------------------

class FakeSocket implements LiveSocket {
  readyState = 0;
  gesendet: Record<string, unknown>[] = [];
  geschlossen = false;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(readonly url: string) {}
  send(d: string) {
    this.gesendet.push(JSON.parse(d) as Record<string, unknown>);
  }
  close() {
    this.geschlossen = true;
    this.readyState = 3;
  }
  oeffnen() {
    this.readyState = 1;
    this.onopen?.();
    this.sag({ message_type: "session_started" });
  }
  sag(m: Record<string, unknown>) {
    this.onmessage?.({ data: JSON.stringify(m) });
  }
}

function runde(o: { token?: { token: string; modell: string } | null; mikroFehler?: string; ohneTon?: boolean; angehalten?: boolean } = {}) {
  let ton: ((w: Float32Array, rate: number) => void) | null = null;
  const sockets: FakeSocket[] = [];
  const logs: string[] = [];
  const mikroAus = vi.fn();
  const deps: LiveDeps = {
    token: async () => (o.token === undefined ? { token: "einmal-xyz", modell: "scribe_v2_realtime" } : o.token),
    mikro: async (t) => {
      if (o.mikroFehler) throw Object.assign(new Error("nein"), { name: o.mikroFehler });
      ton = t;
      // Ein erstes Stück Ton kommt sofort (sonst greift der Mikro-Wachhund)
      if (!o.ohneTon) t(new Float32Array(4800).fill(0.1), 48_000);
      return { stoppen: mikroAus, laeuft: () => !o.angehalten };
    },
    socket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
    log: (t) => logs.push(t),
    uhr: () => Date.now(),
  };
  const ev: { text: string[]; wartet: boolean[]; fertig: { text: string; ende: string; sekunden: number }[]; fehler: string[] } = { text: [], wartet: [], fertig: [], fehler: [] };
  const rueck: LiveRueck = {
    text: (g) => ev.text.push(g),
    wartet: (an) => ev.wartet.push(an),
    fertig: (text, info) => ev.fertig.push({ text, ...info }),
    fehler: (art, name) => ev.fehler.push(`${art}:${name}`),
  };
  const r = ohrLiveStarten(rueck, deps);
  /** 100 ms Ton bei 48 kHz */
  const sprich = () => ton?.(new Float32Array(4800).fill(0.1), 48_000);
  return { r, ev, sockets, logs, mikroAus, sprich, sock: () => sockets[0] };
}

const warte = async (ms: number) => {
  await vi.advanceTimersByTimeAsync(ms);
};

describe("Zuhören live (nachgestellter Websocket)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Live-Text erscheint, Ring nach 0,6 s ohne neue Wörter, VAD-Satzende schickt sofort ab", async () => {
    const t = runde();
    await warte(0);
    t.sprich(); // vor der Verbindung: wird gepuffert
    expect(t.sock().gesendet).toHaveLength(0);
    t.sock().oeffnen();
    expect(t.sock().gesendet.length).toBe(1);
    expect(t.sock().gesendet[0]).toMatchObject({ message_type: "input_audio_chunk", commit: false });
    t.sprich();
    expect(t.sock().gesendet.length).toBe(2);
    t.sock().sag({ message_type: "partial_transcript", text: "Milch" });
    t.sock().sag({ message_type: "partial_transcript", text: "Milch auf die" });
    expect(t.ev.text).toEqual(["Milch", "Milch auf die"]);
    await warte(LIVE_RING_MS - 50);
    expect(t.ev.wartet).toEqual([]);
    await warte(100);
    expect(t.ev.wartet).toEqual([true]);
    t.sock().sag({ message_type: "partial_transcript", text: "Milch auf die Liste" });
    expect(t.ev.wartet).toEqual([true, false]);
    t.sock().sag({ message_type: "committed_transcript", text: "Milch auf die Liste." });
    expect(t.ev.fertig).toEqual([{ text: "Milch auf die Liste.", ende: "satz", sekunden: 0.3 }]);
    expect(t.sock().geschlossen).toBe(true);
    expect(t.mikroAus).toHaveBeenCalled();
    expect(t.sock().url).toContain("token=einmal-xyz");
    // Protokoll: nur Technik – nie Text, nie Schlüssel
    expect(t.logs.join(" ")).not.toMatch(/Milch|einmal-xyz/);
  });

  it("Geräusch ohne Worte (leerer Satz) schickt nichts ab, Mia hört weiter", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    t.sock().sag({ message_type: "committed_transcript", text: "" });
    expect(t.ev.fertig).toEqual([]);
    expect(t.sock().geschlossen).toBe(false);
    t.r.abbrechen();
    expect(t.sock().geschlossen).toBe(true);
    expect(t.ev.fertig).toEqual([]);
  });

  it("Antippen beendet sofort: Commit raus, der fertige Satz zählt", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    t.sock().sag({ message_type: "partial_transcript", text: "Was steht" });
    t.r.stoppen();
    expect(t.sock().gesendet.at(-1)).toMatchObject({ commit: true, audio_base_64: "" });
    t.sock().sag({ message_type: "committed_transcript", text: "Was steht heute an?" });
    expect(t.ev.fertig).toEqual([{ text: "Was steht heute an?", ende: "tippen", sekunden: 0.1 }]);
  });

  it("Antippen ohne Antwort: nach 1,5 s zählt der vorläufige Text", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    t.sock().sag({ message_type: "partial_transcript", text: "Was steht" });
    t.r.stoppen();
    await warte(LIVE_COMMIT_WARTEN_MS);
    expect(t.ev.fertig).toEqual([{ text: "Was steht", ende: "tippen", sekunden: 0.1 }]);
  });

  it("Antippen vor der Verbindung: leise vorbei, nichts hängt", async () => {
    const t = runde();
    t.r.stoppen();
    expect(t.ev.fertig).toEqual([{ text: "", ende: "tippen", sekunden: 0 }]);
    await warte(LIVE_VERBINDEN_MS + 100);
    expect(t.ev.fehler).toEqual([]);
  });

  it("höchstens 20 s ohne neue Wörter, dann abgeschickt (Geräusch hält den Satz nie offen)", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    t.sock().sag({ message_type: "partial_transcript", text: "Und dann noch" });
    await warte(19_000);
    expect(t.sock().gesendet.some((m) => m.commit === true)).toBe(false);
    await warte(1100);
    expect(t.sock().gesendet.some((m) => m.commit === true)).toBe(true);
    await warte(LIVE_COMMIT_WARTEN_MS);
    expect(t.ev.fertig[0]).toMatchObject({ text: "Und dann noch", ende: "tippen" });
  });

  it("niemand sagt etwas: nach 8 s leise aus", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    for (let i = 0; i < 70; i++) {
      t.sprich();
      await warte(100);
    }
    expect(t.ev.fertig).toEqual([]);
    await warte(NICHTS_MS - 7000);
    expect(t.ev.fertig[0]).toMatchObject({ text: "", ende: "nichts" });
  });

  it("Verbindung abgebrochen mit Text: das Gesagte zählt", async () => {
    const t = runde();
    await warte(0);
    t.sock().oeffnen();
    t.sock().sag({ message_type: "partial_transcript", text: "Brot" });
    t.sock().onclose?.();
    expect(t.ev.fertig[0]).toMatchObject({ text: "Brot", ende: "abbruch" });
  });
});

describe("Ersatz-Kette: Schlüssel/Verbindung → Browser → Aufnahme", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Schlüssel geht nicht → „verbindung“ (dann Browser)", async () => {
    const t = runde({ token: null });
    await warte(0);
    expect(t.ev.fehler).toEqual(["verbindung:schluessel"]);
    expect(t.mikroAus).toHaveBeenCalled();
  });

  it("Websocket-Fehler vor dem ersten Wort, Fehler-Nachricht oder keine Verbindung in 3 s → „verbindung“", async () => {
    const a = runde();
    await warte(0);
    a.sock().onerror?.();
    expect(a.ev.fehler).toEqual(["verbindung:socket"]);
    const b = runde();
    await warte(0);
    b.sock().oeffnen();
    b.sock().sag({ message_type: "auth_error" });
    expect(b.ev.fehler).toEqual(["verbindung:auth_error"]);
    const c = runde();
    await warte(LIVE_VERBINDEN_MS);
    expect(c.ev.fehler).toEqual(["verbindung:zeit"]);
    const d = runde();
    await warte(0);
    d.sock().onclose?.();
    expect(d.ev.fehler).toEqual(["verbindung:zu"]);
  });

  it("Mikrofon gesperrt → „mikro“ mit Fehlername; kein Ton in 1,5 s → belegt (Mikro-Wachhund)", async () => {
    const a = runde({ mikroFehler: "NotAllowedError" });
    await warte(0);
    expect(a.ev.fehler).toEqual(["mikro:NotAllowedError"]);
    const b = runde({ ohneTon: true });
    await warte(0);
    b.sock().oeffnen();
    await warte(LIVE_WACHE_MS);
    expect(b.ev.fehler).toEqual(["mikro:belegt"]);
    expect(b.sock().geschlossen).toBe(true);
    const c = runde();
    await warte(0);
    c.sock().oeffnen();
    await warte(LIVE_WACHE_MS);
    expect(c.ev.fehler).toEqual([]);
    // Vom Browser angehaltene Ton-Verarbeitung ist kein belegtes Mikro → Browser-Erkennung
    const d = runde({ ohneTon: true, angehalten: true });
    await warte(LIVE_WACHE_MS);
    expect(d.ev.fehler).toEqual(["verbindung:ton"]);
  });

  it("Reihenfolge der Wege", () => {
    const alle = { buehne: true, live: true, browser: true, aufnahme: true };
    expect(ohrWeg(alle)).toBe("live");
    // Live ging nicht (Schlüssel/Websocket) → Browser wie vor v0.98
    expect(ohrWeg({ ...alle, live: false })).toBe("browser");
    // Auch keine Spracherkennung → eigene Aufnahme mit scribe_v1
    expect(ohrWeg({ ...alle, live: false, browser: false })).toBe("aufnahme");
    expect(ohrWeg({ buehne: true, live: false, browser: false, aufnahme: false })).toBe("nichts");
    // Außerhalb der Bühne immer der Browser
    expect(ohrWeg({ ...alle, buehne: false })).toBe("browser");
  });
});

describe("Live in der App: Schlüssel holen, „aus“ merken", () => {
  beforeEach(async () => {
    vi.resetModules();
    await atFresh("2026-10-28T10:00");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    noBrowser();
  });

  const technik = () => {
    const w = fakeWindow(KI_ERLAUBT) as unknown as Record<string, unknown>;
    w.AudioContext = class {};
    vi.stubGlobal("navigator", { userAgent: "test", mediaDevices: { getUserMedia: () => Promise.reject(new Error("nein")) } });
    vi.stubGlobal("WebSocket", class {});
    return w;
  };

  it("Einmal-Schlüssel mit Zugangscode und Gerät; 503 = bis zum Neuladen nicht mehr live", async () => {
    technik();
    const abruf = vi.fn(async () => Response.json({ token: "einmal-1", modell: "scribe_v2_realtime" }));
    vi.stubGlobal("fetch", abruf);
    const c = await import("@/lib/begleitung/stimmeClient");
    expect(c.liveOhr({ live: true })).toBe(true);
    expect(c.liveOhr({})).toBe(false);
    expect(await c.ohrToken()).toEqual({ token: "einmal-1", modell: "scribe_v2_realtime" });
    const [url, init] = abruf.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/stimme/ohr-token");
    expect(JSON.parse(String(init.body)).geraet).toMatch(/.{6,}/);
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ error: "aus" }, { status: 503 })));
    expect(await c.ohrToken()).toBeNull();
    expect(c.liveOhr({ live: true })).toBe(false);
  });

  it("zweimal hintereinander gescheitert = Browser bis zum Neuladen; dazwischen geklappt zählt neu", async () => {
    technik();
    const c = await import("@/lib/begleitung/stimmeClient");
    c.liveGescheitert();
    c.liveGeklappt(3.4);
    c.liveGescheitert();
    expect(c.liveOhr({ live: true })).toBe(true);
    c.liveGescheitert();
    expect(c.liveOhr({ live: true })).toBe(false);
  });

  it("Netz weg oder kaputte Antwort: null (dann Browser)", async () => {
    technik();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    const c = await import("@/lib/begleitung/stimmeClient");
    expect(await c.ohrToken()).toBeNull();
    vi.stubGlobal("fetch", vi.fn(async () => Response.json({ token: "" })));
    expect(await c.ohrToken()).toBeNull();
  });
});

// --- Pegel-Ende im Café (letzter Ersatz) -------------------------------------------------

describe("Pegel-Ende robust bei Geräusch", () => {
  function lauf(pegel: (t: number) => number, bis: number) {
    let s = neuesLauschen();
    const out: { t: number; a: LauschAktion }[] = [];
    for (let t = 0; t <= bis; t += 50) {
      const r = lauschSchritt(s, pegel(t), t);
      s = r.s;
      out.push({ t, a: r.aktion });
      if (r.aktion === "fertig" || r.aktion === "nichts") break;
    }
    return out;
  }
  /** Café: Grundpegel 0,05 mit leichtem Schwanken */
  const cafe = (t: number) => 0.05 + 0.006 * Math.sin(t / 37) + 0.004 * Math.sin(t / 11);

  it("Café-Rauschen (0,05), 2,5 s sprechen, dann wieder Café: endet von selbst nach ~1,2 s", () => {
    const o = lauf((t) => (t >= 1000 && t < 3500 ? 0.25 + 0.05 * Math.sin(t / 23) : cafe(t)), 30_000);
    const ende = o.at(-1)!;
    expect(ende.a).toBe("fertig");
    expect(ende.t).toBeGreaterThanOrEqual(3500 + 1000);
    expect(ende.t).toBeLessThanOrEqual(3500 + 1500);
    expect(o.some((x) => x.a === "wartet")).toBe(true);
  });

  it("nur Café, niemand spricht: nach 8 s leise aus (Rauschen ist kein Sprechen)", () => {
    expect(lauf(cafe, 30_000).at(-1)).toEqual({ t: NICHTS_MS, a: "nichts" });
  });

  it("lauter Geräusch-Teppich nach dem Sprechen hält nie offen: höchstens 20 s", () => {
    const o = lauf((t) => (t < 500 ? 0.01 : 0.3), 70_000);
    expect(o.at(-1)!.a).toBe("fertig");
    expect(o.at(-1)!.t).toBeLessThanOrEqual(500 + LAUT_MAX_MS);
  });

  it("wer sofort spricht, wird trotzdem erkannt", () => {
    const o = lauf((t) => (t < 1500 ? 0.15 : 0.004), 10_000);
    expect(o.at(-1)).toEqual({ t: 1450 + 1200, a: "fertig" });
  });
});

// --- Messen: Sprechende → Commit → erstes Wort → Ton ----------------------------------

describe("Tempo im Mikro-Protokoll", () => {
  it("Zeile nur mit Zahlen, Weg des Zuhörens, erstes Wort → Ton und gesamt", async () => {
    const { tempoZeile, tempoUebersicht, migrateTempo } = await import("@/lib/begleitung/tempo");
    const m = { weg: "ki" as const, sprache: true, ohr: "live" as const, stille: 1200, token: 600, satz: 900 };
    expect(tempoZeile(m)).toBe("Tempo (live): Ende→Commit 1,2 s · Commit→Wort 0,6 s · Wort→Ton 0,3 s · gesamt 2,1 s");
    expect(tempoZeile({ weg: "sofort", sprache: true })).toBe("Tempo (?, sofort): Ende→Commit – · Commit→Wort – · Wort→Ton –");
    const u = tempoUebersicht([m, { ...m, stille: 1150, token: 400, satz: 500 }]);
    expect(u).toMatchObject({ ton: 200, bisTon: 1875 });
    expect(migrateTempo({ version: 1, messungen: [{ ...m }, { weg: "ki", sprache: true, ohr: "quatsch" }] })?.messungen.map((x) => x.ohr)).toEqual(["live", undefined]);
  });
});

describe("Spracheingabe auf der Bühne ohne Browser-Erkennung (Fehler: „gibt’s nicht“ beim Öffnen)", () => {
  it("Status noch unterwegs: unbekannt statt „gibt’s nicht“", () => {
    expect(spracheMoeglich(false, true, null)).toBeNull();
  });
  it("Server-Ohr da: ja; Server sagt nein: nein", () => {
    expect(spracheMoeglich(false, true, true)).toBe(true);
    expect(spracheMoeglich(false, true, false)).toBe(false);
  });
  it("Browser kann es: immer ja; außerhalb der Bühne zählt nur der Browser", () => {
    expect(spracheMoeglich(true, true, null)).toBe(true);
    expect(spracheMoeglich(false, false, true)).toBe(false);
    expect(spracheMoeglich(null, true, true)).toBeNull();
  });
});
