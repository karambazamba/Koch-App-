// A-056 Teil 1: Mia hört von Anfang an. Mikrofon schon beim Antippen
// (Vorlauf mit Ringpuffer ≥ 5 s), der gepufferte Anfang geht zuerst an den
// Websocket, dann live; Zeiten Tippen → Mikro → Verbindung → erstes Wort ins
// Mikro-Protokoll; „Ich höre“-Ring erst bei echtem Ton; Schlüssel vorgewärmt
// (15 Min. gültig, vorher erneuert). „Erstes Wort nicht verloren“: ein
// Audio-Stück mit einem Wort in den ersten 500 ms, nachgestelltes Mikrofon
// und ein Websocket, der aus dem Ton „erkennt“.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LIVE_RATE } from "@/lib/begleitung/echtzeitProtokoll";
import { PUFFER_MS, Ringpuffer, VORLAUF_LIEGEN_MS, pcmZuWav, verbinden, vorlaufStarten, zeitenZeile, type Vorlauf } from "@/lib/begleitung/ohrPuffer";
import { ohrLiveStarten, type LiveDeps, type LiveMikro, type LiveSocket } from "@/lib/begleitung/ohrLive";
import { stageRing } from "@/lib/begleitung/stage";
import { KI_ERLAUBT, atFresh, fakeWindow, noBrowser } from "../helpers";

// --- Audio-Fixture: 48 kHz, Wörter als laute Stücke, dazwischen Raumrauschen ------------------

const RATE = 48_000;
/** Wort-Stücke (ms ab Tippen): das erste Wort beginnt nach 80 ms und ist vor 500 ms vorbei */
const WOERTER = [
  { wort: "Milch", von: 80, bis: 420, hz: 300 },
  { wort: "auf", von: 650, bis: 800, hz: 600 },
  { wort: "die", von: 850, bis: 950, hz: 900 },
  { wort: "Liste", von: 1000, bis: 1400, hz: 1200 },
];
/** Lautstärke zur Zeit t (ms): jedes Wort ein deutlicher Ton mit eigener Tonhöhe, sonst leises Rauschen */
const probe = (t: number, i: number) => {
  const w = WOERTER.find((x) => t >= x.von && t < x.bis);
  return w ? 0.5 * Math.sin((2 * Math.PI * w.hz * i) / RATE) : 0.002;
};

/**
 * Nachgestelltes Mikrofon: liefert ab „Mikro an“ (`anNachMs`) Stücke von
 * 2048 Werten – so, wie der ScriptProcessor im Browser. Der Ton ist der der
 * Fixture ab dem Zeitpunkt, an dem das Mikro wirklich an ist (davor: nichts).
 */
function fakeMikro(anNachMs: number) {
  let tick: ReturnType<typeof setInterval> | null = null;
  let probeNr = Math.round((anNachMs / 1000) * RATE);
  const mikro = (ton: (w: Float32Array, rate: number) => void) =>
    new Promise<LiveMikro>((resolve) => {
      setTimeout(() => {
        const stueck = () => {
          const w = new Float32Array(2048);
          for (let k = 0; k < w.length; k++, probeNr++) w[k] = probe((probeNr / RATE) * 1000, probeNr);
          ton(w, RATE);
        };
        tick = setInterval(stueck, (2048 / RATE) * 1000);
        resolve({ stoppen: () => tick && clearInterval(tick), laeuft: () => true });
      }, anNachMs);
    });
  return mikro;
}

/** Websocket, der aus dem empfangenen Ton (16 kHz) die Wörter „erkennt“: jedes laute Stück = nächstes Wort */
class ErkennenderSocket implements LiveSocket {
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  pcm: number[] = [];
  ersteStueckLaenge = 0;
  constructor(readonly url: string) {}
  send(d: string) {
    const m = JSON.parse(d) as { audio_base_64: string; commit: boolean };
    const bytes = Buffer.from(m.audio_base_64, "base64");
    const neu = new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length / 2);
    if (!this.pcm.length) this.ersteStueckLaenge = neu.length;
    this.pcm.push(...neu);
    const text = this.erkannt();
    if (m.commit) this.sag({ message_type: "committed_transcript", text });
    else if (text) this.sag({ message_type: "partial_transcript", text });
  }
  /** Laute 20-ms-Fenster zu Wörtern zusammenfassen; welches Wort, verrät die Tonhöhe (Nulldurchgänge) */
  erkannt(): string {
    const fenster = LIVE_RATE / 50;
    const woerter: string[] = [];
    let durchgaenge = 0;
    let proben = 0;
    const fertig = () => {
      if (!proben) return;
      const hz = durchgaenge / 2 / (proben / LIVE_RATE);
      woerter.push(WOERTER.reduce((a, b) => (Math.abs(b.hz - hz) < Math.abs(a.hz - hz) ? b : a)).wort);
      durchgaenge = proben = 0;
    };
    for (let i = 0; i + fenster <= this.pcm.length; i += fenster) {
      let s = 0;
      for (let k = i; k < i + fenster; k++) s += (this.pcm[k] / 32768) ** 2;
      if (Math.sqrt(s / fenster) > 0.1) {
        for (let k = i + 1; k < i + fenster; k++) {
          if (this.pcm[k - 1] < 0 !== this.pcm[k] < 0) durchgaenge++;
          if (Math.abs(this.pcm[k]) > 300) proben++;
        }
      } else fertig();
    }
    fertig();
    return woerter.join(" ");
  }
  close() {
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

/**
 * Eine Runde wie in der App: Tippen bei t=0. `vorlauf` = Mikro sofort an
 * (A-056); ohne = altes Verhalten, das Mikro startet erst mit der Runde
 * (`rundeAbMs`, z. B. nach dem Warten auf den Status).
 */
function runde(o: { vorlauf: boolean; mikroMs: number; rundeAbMs?: number; tokenMs: number; offenMs: number }) {
  const logs: string[] = [];
  const sockets: ErkennenderSocket[] = [];
  const fertig: string[] = [];
  const uhr = () => Date.now();
  const start = Date.now();
  const mikro = fakeMikro(o.mikroMs);
  const v: Vorlauf | null = o.vorlauf ? vorlaufStarten({ mikro, uhr, log: (t) => logs.push(t) }) : null;
  const deps: LiveDeps = {
    token: () => new Promise((r) => setTimeout(() => r({ token: "einmal", modell: "scribe_v2_realtime" }), o.tokenMs)),
    mikro: v ? v.nehmen : mikro,
    socket: (url) => {
      const s = new ErkennenderSocket(url);
      sockets.push(s);
      setTimeout(() => s.oeffnen(), o.offenMs);
      return s;
    },
    log: (t) => logs.push(t),
    uhr,
    tippenAm: start,
    ...(v ? { mikroAm: v.mikroAm } : {}),
  };
  let live: ReturnType<typeof ohrLiveStarten> | null = null;
  setTimeout(() => {
    live = ohrLiveStarten({ text: () => {}, wartet: () => {}, fertig: (t) => fertig.push(t), fehler: (a, n) => fertig.push(`FEHLER ${a}:${n}`) }, deps);
  }, o.rundeAbMs ?? 0);
  return { logs, sockets, fertig, v, stoppen: () => live?.stoppen() };
}

describe("Ringpuffer, WAV, Zeiten (rein)", () => {
  it("Ringpuffer hält höchstens die Grenze, Ältestes fällt zuerst raus, Reihenfolge bleibt", () => {
    const p = new Ringpuffer<Int16Array>(10);
    p.push(new Int16Array([1, 2, 3, 4]));
    p.push(new Int16Array([5, 6, 7, 8]));
    expect(p.verworfen).toBe(0);
    p.push(new Int16Array([9, 10, 11]));
    expect([...verbinden(p.alle())]).toEqual([5, 6, 7, 8, 9, 10, 11]);
    expect(p.verworfen).toBe(4);
    expect(verbinden(p.entnehmen())).toHaveLength(7);
    expect(p.laenge).toBe(0);
    expect(PUFFER_MS).toBeGreaterThanOrEqual(5000);
  });

  it("WAV: RIFF-Kopf, 16 kHz, 16 Bit mono, Werte little endian", () => {
    const wav = pcmZuWav(new Int16Array([1, -1]), 16_000);
    const v = new DataView(wav.buffer);
    expect(String.fromCharCode(...wav.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...wav.slice(8, 12))).toBe("WAVE");
    expect(v.getUint32(24, true)).toBe(16_000);
    expect(v.getUint16(34, true)).toBe(16);
    expect(v.getUint32(40, true)).toBe(4);
    expect(v.getInt16(44, true)).toBe(1);
    expect(v.getInt16(46, true)).toBe(-1);
  });

  it("Zeiten-Zeile: nur Zahlen", () => {
    expect(zeitenZeile({ mikro: 118.4, verbunden: 452, erstesWort: 901 })).toBe("Ohr (live): Tippen→Mikro 118 ms · →Verbindung 452 ms · →erstes Wort 901 ms");
    expect(zeitenZeile({ mikro: 90, verbunden: null, erstesWort: null }, "aufnahme")).toBe("Ohr (aufnahme): Tippen→Mikro 90 ms · →Verbindung – · →erstes Wort –");
  });

  it("Ring „Ich höre“ erst, wenn das Mikro wirklich aufnimmt", () => {
    expect(stageRing("zuhoeren", false, false)).toBeNull();
    expect(stageRing("zuhoeren", false, true)).toBe("wellen");
    expect(stageRing("zuhoeren", true, false)).toBe("pause");
  });
});

describe("Erstes Wort nicht verloren (Fixture, Mikro, Websocket nachgestellt)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: new Date("2026-10-29T08:00:00Z") });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("Sprechen sofort nach dem Tippen: „Milch“ (80–420 ms) steht in der Mitschrift", async () => {
    // Mikro an nach 120 ms, Schlüssel 500 ms, Verbindung weitere 400 ms – das Wort ist längst gesagt
    const r = runde({ vorlauf: true, mikroMs: 120, tokenMs: 500, offenMs: 400 });
    await vi.advanceTimersByTimeAsync(1600);
    r.stoppen();
    await vi.advanceTimersByTimeAsync(10);
    expect(r.fertig).toEqual(["Milch auf die Liste"]);
    // Der gepufferte Anfang ging als ERSTES Stück raus (alles seit „Mikro an“)
    expect(r.sockets[0].ersteStueckLaenge).toBeGreaterThan(LIVE_RATE * 0.7);
    // Nichts verloren: gestreamt ≈ Zeit seit „Mikro an“
    expect(r.sockets[0].pcm.length).toBeGreaterThan(LIVE_RATE * 1.35);
    expect(r.v!.verworfen()).toBe(0);
  });

  it("Gegenprobe: startet das Mikro erst mit der Runde (alter Weg, 600 ms Warten), fehlt das erste Wort", async () => {
    const r = runde({ vorlauf: false, mikroMs: 600, tokenMs: 300, offenMs: 300 });
    await vi.advanceTimersByTimeAsync(1600);
    r.stoppen();
    await vi.advanceTimersByTimeAsync(10);
    expect(r.fertig[0]).not.toContain("Milch");
    expect(r.fertig[0]).toContain("Liste");
  });

  it("Status kommt spät (Runde erst nach 1,5 s): der Vorlauf hat trotzdem alles", async () => {
    const r = runde({ vorlauf: true, mikroMs: 150, rundeAbMs: 1500, tokenMs: 200, offenMs: 200 });
    await vi.advanceTimersByTimeAsync(2200);
    r.stoppen();
    await vi.advanceTimersByTimeAsync(10);
    expect(r.fertig).toEqual(["Milch auf die Liste"]);
  });

  it("Zeiten im Mikro-Protokoll: Tippen → Mikro an (< 300 ms) → Verbindung → erstes Wort, nur Zahlen", async () => {
    const r = runde({ vorlauf: true, mikroMs: 120, tokenMs: 500, offenMs: 400 });
    await vi.advanceTimersByTimeAsync(1600);
    r.stoppen();
    await vi.advanceTimersByTimeAsync(10);
    const zeile = r.logs.find((l) => l.startsWith("Ohr (live): Tippen→Mikro"))!;
    const ms = [...zeile.matchAll(/(\d+) ms/g)].map((m) => Number(m[1]));
    console.log(`Gemessen (Test): ${zeile}`);
    expect(ms).toHaveLength(3);
    expect(ms[0]).toBeLessThan(300);
    expect(ms[1]).toBeGreaterThanOrEqual(ms[0]);
    expect(ms[2]).toBeGreaterThanOrEqual(ms[1]);
    expect(r.logs.join(" ")).not.toMatch(/Milch|einmal/);
  });

  it("Ring/„bereit“ erst bei echtem Ton; ungenommener Vorlauf geht nach 5 s aus", async () => {
    let an = false;
    const stopp = vi.fn();
    const v = vorlaufStarten({ mikro: (ton) => new Promise((res) => setTimeout(() => (res({ stoppen: stopp }), ton(new Float32Array(10), RATE)), 200)), uhr: () => Date.now() });
    v.beiBereit(() => (an = true));
    await vi.advanceTimersByTimeAsync(150);
    expect(an).toBe(false);
    await vi.advanceTimersByTimeAsync(100);
    expect(an).toBe(true);
    expect(v.aktiv()).toBe(true);
    await vi.advanceTimersByTimeAsync(VORLAUF_LIEGEN_MS);
    expect(v.aktiv()).toBe(false);
    expect(stopp).toHaveBeenCalled();
  });

  it("live geht nicht: der Puffer bleibt – die eigene Aufnahme bekommt den Anfang (laut erkannt)", async () => {
    const v = vorlaufStarten({ mikro: fakeMikro(100), uhr: () => Date.now() });
    const erste: Float32Array[] = [];
    const m = await (async () => {
      const p = v.nehmen((w) => erste.push(w));
      await vi.advanceTimersByTimeAsync(700);
      return p;
    })();
    m.stoppen(); // live lässt los, das Mikro läuft weiter
    expect(v.aktiv()).toBe(true);
    expect(v.lautGehoert()).toBe(true);
    const zweite: Float32Array[] = [];
    await v.nehmen((w) => zweite.push(w));
    // Die Aufnahme bekommt alles von Anfang an (mindestens so viel wie live hatte)
    expect(zweite.length).toBeGreaterThanOrEqual(erste.length);
    expect(zweite[0]).toBe(erste[0]);
    v.stoppen();
  });

  it("Mikro geht nicht: nehmen wirft mit dem Fehlernamen (dann Mikro-Hilfe wie bisher)", async () => {
    const v = vorlaufStarten({ mikro: () => Promise.reject(Object.assign(new Error("nein"), { name: "NotAllowedError" })), uhr: () => Date.now() });
    await expect(v.nehmen(() => {})).rejects.toMatchObject({ name: "NotAllowedError" });
    expect(v.aktiv()).toBe(false);
  });
});

describe("Schlüssel vorwärmen (15 Min. gültig, vorher erneuert)", () => {
  beforeEach(async () => {
    vi.resetModules();
    await atFresh("2026-10-29T10:00");
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    noBrowser();
  });

  const technik = () => {
    const w = fakeWindow(KI_ERLAUBT) as unknown as Record<string, unknown>;
    w.AudioContext = class {};
    vi.stubGlobal("navigator", { userAgent: "test", mediaDevices: { getUserMedia: () => Promise.reject(new Error("nein")) } });
    vi.stubGlobal("WebSocket", class {});
    vi.stubGlobal("document", { visibilityState: "visible" });
  };

  it("vorgewärmt = sofort, ohne neuen Abruf; danach wird der nächste bereitgelegt; nie im Protokoll", async () => {
    technik();
    let n = 0;
    const abruf = vi.fn(async (url: string) => (String(url).includes("ohr-token") ? Response.json({ token: `einmal-${++n}`, modell: "scribe_v2_realtime" }) : Response.json({ configured: true, needsCode: false, access: "ok", stimme: { sprechen: false, hoeren: true, live: true, v: "t" } })));
    vi.stubGlobal("fetch", abruf);
    const z = await import("@/lib/begleitung/zugang");
    await z.serverStimme();
    const c = await import("@/lib/begleitung/stimmeClient");
    vi.useFakeTimers({ now: new Date("2026-10-29T09:00:00Z"), toFake: ["setTimeout", "clearTimeout", "Date"] });
    await c.ohrTokenVorwaermen();
    const tokenAbrufe = () => abruf.mock.calls.filter(([u]) => String(u).includes("ohr-token")).length;
    expect(tokenAbrufe()).toBe(1);
    expect(await c.ohrToken()).toEqual({ token: "einmal-1", modell: "scribe_v2_realtime" });
    expect(tokenAbrufe()).toBe(1);
    await vi.advanceTimersByTimeAsync(2000);
    expect(tokenAbrufe()).toBe(2);
    // 13 Min. später wird er erneuert (gilt 15 Min.)
    await vi.advanceTimersByTimeAsync(c.TOKEN_FRISCH_MS);
    expect(tokenAbrufe()).toBe(3);
    expect(await c.ohrToken()).toEqual({ token: "einmal-3", modell: "scribe_v2_realtime" });
    const { micLogText } = await import("@/lib/core/micLog");
    const store = JSON.parse(String(globalThis.localStorage?.getItem("wasgibts.mikroprotokoll") ?? "{\"entries\":[]}")) as { entries: { at: number; text: string }[] };
    expect(micLogText(store.entries)).not.toMatch(/einmal-\d/);
  });
});

describe("Eigene Aufnahme aus dem Puffer (Server)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("WAV aus dem Vorlauf geht als aufnahme.wav an den Anbieter (echter Schlüssel nur im Kopf zum Anbieter)", async () => {
    vi.stubEnv("KUECHENHELFER_MOCK", "");
    vi.stubEnv("STIMME_MOCK", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-ki");
    vi.stubEnv("APP_ACCESS_CODE", "sonne");
    vi.stubEnv("ELEVENLABS_API_KEY", "test-geheim");
    vi.stubEnv("MIA_VOICE_ID", "stimme123");
    const { aufnahmeHoeren } = await import("@/lib/begleitung/stimmeServer");
    const { ACCESS_HEADER } = await import("@/lib/begleitung/protocol");
    const { GERAET_HEADER } = await import("@/lib/begleitung/stimmeProtokoll");
    let datei: File | null = null;
    const abruf = vi.fn(async (_u: string | URL | Request, init?: RequestInit) => {
      datei = (init?.body as FormData).get("file") as File;
      return Response.json({ text: "Milch auf die Liste" });
    }) as unknown as typeof fetch;
    const wav = pcmZuWav(new Int16Array(1600), 16_000);
    const r = await aufnahmeHoeren(new Request("http://localhost/api/hoeren", { method: "POST", headers: { "content-type": "audio/wav", [ACCESS_HEADER]: "sonne", [GERAET_HEADER]: "geraet-wav-1", "x-mia-dauer": "1000" }, body: wav.buffer as ArrayBuffer }), abruf);
    expect(r.status).toBe(200);
    expect(datei!.name).toBe("aufnahme.wav");
    expect(datei!.type).toBe("audio/wav");
  });
});

describe("Verdrahtung in der App", () => {
  it("Mia-Knopf startet das Mikro im Antippen; die Bühne nimmt den Vorlauf; Ring erst mit `bereit`", () => {
    const knopf = readFileSync("src/components/begleitung/MiaButton.tsx", "utf8");
    expect(knopf).toMatch(/onClick=\{\(\) => \{[\s\S]*vorlaufJetzt\(\)[\s\S]*openHelper\(\)/);
    expect(knopf).toMatch(/ohrTokenVorwaermen/);
    const hook = readFileSync("src/lib/begleitung/useSpeechInput.ts", "utf8");
    expect(hook).toMatch(/liveDeps\(v\)/);
    expect(hook).toMatch(/beginOhr\(v\)/);
    expect(hook).toMatch(/ohrVorbereiten\(\)/);
    expect(readFileSync("src/components/begleitung/HelperPanel.tsx", "utf8")).toMatch(/bereit=\{speech\.bereit\}/);
  });

  it("Schlüssel nur über die eigene Server-Route, nie ElevenLabs-Schlüssel im Client", () => {
    for (const f of ["src/lib/begleitung/ohrMikro.ts", "src/lib/begleitung/ohrPuffer.ts", "src/lib/begleitung/ohrLiveBrowser.ts", "src/lib/begleitung/stimmeClient.ts"]) {
      const s = readFileSync(f, "utf8");
      expect(s).not.toMatch(/ELEVENLABS_API_KEY|xi-api-key/);
    }
  });
});
