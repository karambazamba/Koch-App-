// Mias Stimme und Ohr über den Server (ElevenLabs): ohne Schlüssel sauberer
// Rückfall („aus“), Text wird vor dem Senden bereinigt, nie Inhalte oder Ton
// im Log, Grenzen, Zwischenspeicher für feste Sätze, Satzende am Pegel,
// Kosten, Mikro-Check mit Server-Ohr, Pinnwand nie über den Sprach-Anbieter.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { aufnahmeHoeren, festenSatzSprechen, stimmeSetup, stimmeStatus, textSprechen, vorwaermen } from "@/lib/begleitung/stimmeServer";
import { FESTE_SAETZE, GERAET_HEADER, STIMME_GRENZEN, ZEICHEN_HEADER, festerSatz } from "@/lib/begleitung/stimmeProtokoll";
import { lauschSchritt, neuesLauschen, pegelVon, type LauschAktion } from "@/lib/begleitung/lauschen";
import { addStimme, costSummary } from "@/lib/begleitung/usage";
import { ACCESS_HEADER } from "@/lib/begleitung/protocol";
import { checkZeilen } from "@/lib/core/micCheck";
import { vorlesText } from "@/lib/begleitung/vorlesText";

const echt = () => {
  vi.stubEnv("KUECHENHELFER_MOCK", "");
  vi.stubEnv("STIMME_MOCK", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "test-ki");
  vi.stubEnv("APP_ACCESS_CODE", "sonne");
  vi.stubEnv("ELEVENLABS_API_KEY", "test-stimme");
  vi.stubEnv("MIA_VOICE_ID", "stimme123");
};

let fehlerLog: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  fehlerLog = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

let n = 0;
const geraet = () => `geraet-test-${++n}`;
const sprechen = (text: unknown, headers: Record<string, string> = { [ACCESS_HEADER]: "sonne" }, id = geraet()) =>
  new Request("http://localhost/api/stimme", { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify({ text, geraet: id }) });
const hoeren = (body: BodyInit, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/hoeren", { method: "POST", headers: { "content-type": "audio/webm", [ACCESS_HEADER]: "sonne", [GERAET_HEADER]: geraet(), "x-mia-dauer": "4200", ...headers }, body });

/** Schein-Anbieter: merkt sich die Aufrufe, antwortet mit Ton bzw. Text */
function anbieter(antwort: () => Response = () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } })) {
  const calls: { url: string; init: RequestInit }[] = [];
  const abruf = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return antwort();
  }) as unknown as typeof fetch;
  return { abruf, calls };
}

describe("ohne Schlüssel: sauberer Rückfall auf den Browser", () => {
  it("Status aus, alle Routen „aus“ (503), kein Abruf beim Anbieter", async () => {
    vi.stubEnv("KUECHENHELFER_MOCK", "");
    vi.stubEnv("STIMME_MOCK", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-ki");
    vi.stubEnv("APP_ACCESS_CODE", "sonne");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    vi.stubEnv("MIA_VOICE_ID", "stimme123");
    expect(stimmeStatus()).toMatchObject({ sprechen: false, hoeren: false });
    const { abruf, calls } = anbieter();
    for (const r of [await textSprechen(sprechen("Steht drin."), abruf), await festenSatzSprechen(new Request("http://localhost/api/stimme?satz=0"), abruf), await aufnahmeHoeren(hoeren(new Uint8Array(10)), abruf)]) {
      expect(r.status).toBe(503);
      expect(await r.json()).toEqual({ error: "aus" });
    }
    expect(calls).toHaveLength(0);
  });

  it("Stimme nur mit Voice-ID; ohne echte KI (Testmodus der KI) kein echter Anbieter", () => {
    echt();
    vi.stubEnv("MIA_VOICE_ID", "");
    expect(stimmeSetup()).toMatchObject({ sprechen: false, hoeren: true });
    echt();
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    expect(stimmeSetup()).toMatchObject({ sprechen: false, hoeren: false, mock: false });
    vi.stubEnv("STIMME_MOCK", "1");
    expect(stimmeSetup()).toMatchObject({ sprechen: true, hoeren: true, mock: true });
    vi.stubEnv("VERCEL_ENV", "production");
    expect(stimmeSetup().mock).toBe(false);
  });

  it("Status verrät nie Schlüssel oder Stimme, nur eine kurze Kennung", () => {
    echt();
    const s = stimmeStatus();
    expect(s).toMatchObject({ sprechen: true, hoeren: true });
    expect(JSON.stringify(s)).not.toMatch(/test-stimme|stimme123/);
    expect(s.v).toMatch(/^[0-9a-f]{10}$/);
  });
});

describe("Sprechen (Text → Ton)", () => {
  it("braucht den Zugangscode und ein gültiges Gerät", async () => {
    echt();
    const { abruf, calls } = anbieter();
    expect((await textSprechen(sprechen("Hallo", {}), abruf)).status).toBe(401);
    expect((await textSprechen(sprechen("Hallo", { [ACCESS_HEADER]: "sonne" }, "x"), abruf)).status).toBe(400);
    expect(calls).toHaveLength(0);
  });

  it("Text wird vor dem Senden bereinigt (wie Anzeige und Vorlesen) und gekürzt", async () => {
    echt();
    const { abruf, calls } = anbieter();
    const r = await textSprechen(sprechen("Klar! 🙂 Um 18:30 gibt’s Nudeln – mit 200 g Käse."), abruf);
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("audio/mpeg");
    const gesendet = JSON.parse(String(calls[0].init.body)) as { text: string; model_id: string; language_code: string };
    expect(gesendet.text).toBe(vorlesText("Klar! 🙂 Um 18:30 gibt’s Nudeln – mit 200 g Käse."));
    expect(gesendet.text).toContain("18 Uhr 30");
    expect(gesendet.text).toContain("200 Gramm");
    expect(gesendet.text).not.toMatch(/🙂|–/);
    expect(gesendet).toMatchObject({ model_id: "eleven_flash_v2_5", language_code: "de" });
    expect(calls[0].url).toContain("/v1/text-to-speech/stimme123/stream");
    expect((calls[0].init.headers as Record<string, string>)["xi-api-key"]).toBe("test-stimme");
    expect(Number(r.headers.get(ZEICHEN_HEADER))).toBe(gesendet.text.length);
    // Sehr lang: höchstens STIMME_GRENZEN.zeichen
    await textSprechen(sprechen("Ja. ".repeat(400)), abruf);
    expect(JSON.parse(String(calls[1].init.body)).text.length).toBeLessThanOrEqual(STIMME_GRENZEN.zeichen);
    expect((await textSprechen(sprechen("   "), abruf)).status).toBe(400);
  });

  it("Anbieter-Fehler: 502 (App liest mit dem Handy weiter), ins Log nur der Status", async () => {
    echt();
    const { abruf } = anbieter(() => new Response("kaputt", { status: 500 }));
    const r = await textSprechen(sprechen("Geheimer Termin beim Zahnarzt"), abruf);
    expect(r.status).toBe(502);
    expect(fehlerLog).toHaveBeenCalledWith("Stimme: Anbieter-Fehler", 500);
    expect(JSON.stringify(fehlerLog.mock.calls)).not.toMatch(/Zahnarzt|test-stimme/);
    const zuviel = anbieter(() => new Response("", { status: 429 }));
    expect((await textSprechen(sprechen("Hallo"), zuviel.abruf)).status).toBe(429);
  });

  it("Grenze pro Gerät (gegen Dauerfeuer)", async () => {
    echt();
    const { abruf } = anbieter();
    const id = geraet();
    const codes: number[] = [];
    for (let i = 0; i < 32; i++) codes.push((await textSprechen(sprechen("Hallo", { [ACCESS_HEADER]: "sonne", "x-forwarded-for": `10.9.0.${i}` }, id), abruf)).status);
    expect(codes.slice(0, 30).every((c) => c === 200)).toBe(true);
    expect(codes.at(-1)).toBe(429);
  });

  it("feste Sätze: einmal erzeugt, dann aus dem Zwischenspeicher – lange gültig", async () => {
    echt();
    const { abruf, calls } = anbieter();
    const nr = festerSatz("Steht drin.");
    expect(nr).toBe(0);
    const a = await festenSatzSprechen(new Request(`http://localhost/api/stimme?satz=${nr}`), abruf);
    const b = await festenSatzSprechen(new Request(`http://localhost/api/stimme?satz=${nr}&v=x`), abruf);
    expect([a.status, b.status]).toEqual([200, 200]);
    expect(calls).toHaveLength(1);
    expect(a.headers.get("cache-control")).toMatch(/max-age=\d{6,}/);
    expect((await festenSatzSprechen(new Request("http://localhost/api/stimme?satz=99"), abruf)).status).toBe(400);
    expect((await festenSatzSprechen(new Request("http://localhost/api/stimme"), abruf)).status).toBe(400);
  });

  it("feste Sätze erkennt die App auch nach dem Bereinigen", () => {
    expect(festerSatz("Ist drauf.")).toBe(FESTE_SAETZE.indexOf("Ist drauf."));
    expect(festerSatz("Ist drauf. 🙂")).toBe(FESTE_SAETZE.indexOf("Ist drauf."));
    expect(festerSatz("Ist drauf, Milch auch.")).toBe(-1);
    expect(festerSatz("")).toBe(-1);
  });

  it("Testmodus: Stille als WAV, ohne Anbieter", async () => {
    echt();
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    vi.stubEnv("STIMME_MOCK", "1");
    const { abruf, calls } = anbieter();
    const r = await textSprechen(sprechen("Moin"), abruf);
    expect(r.headers.get("content-type")).toBe("audio/wav");
    expect((await r.arrayBuffer()).byteLength).toBeGreaterThan(44);
    expect(calls).toHaveLength(0);
  });
});

describe("Hören (Ton → Text)", () => {
  it("schickt die Aufnahme an den Anbieter (Deutsch) und liefert nur den Text", async () => {
    echt();
    const { abruf, calls } = anbieter(() => Response.json({ text: "  Milch   auf die Liste ", words: [] }));
    const r = await aufnahmeHoeren(hoeren(new Uint8Array(2000)), abruf);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ text: "Milch auf die Liste", sekunden: 4 });
    expect(calls[0].url).toContain("/v1/speech-to-text");
    const form = calls[0].init.body as FormData;
    expect(form.get("language_code")).toBe("de");
    expect(form.get("model_id")).toBe("scribe_v1");
    expect((form.get("file") as Blob).size).toBe(2000);
  });

  it("nur Ton, nur bis zur Grenze, mit Code; Dauer höchstens 60 s", async () => {
    echt();
    const { abruf, calls } = anbieter(() => Response.json({ text: "ok" }));
    expect((await aufnahmeHoeren(hoeren(new Uint8Array(10), { "content-type": "text/plain" }), abruf)).status).toBe(415);
    expect((await aufnahmeHoeren(hoeren(new Uint8Array(STIMME_GRENZEN.audioBytes + 1)), abruf)).status).toBe(413);
    expect((await aufnahmeHoeren(hoeren(new Uint8Array(0)), abruf)).status).toBe(400);
    expect((await aufnahmeHoeren(hoeren(new Uint8Array(10), { [ACCESS_HEADER]: "mond" }), abruf)).status).toBe(401);
    expect(calls).toHaveLength(0);
    const r = await aufnahmeHoeren(hoeren(new Uint8Array(10), { "x-mia-dauer": "999999" }), abruf);
    expect((await r.json()).sekunden).toBe(60);
  });

  it("Fehler beim Anbieter: kein Ton und kein Text im Log", async () => {
    echt();
    const { abruf } = anbieter(() => new Response("nope", { status: 503 }));
    const r = await aufnahmeHoeren(hoeren(new TextEncoder().encode("GEHEIMER-TON")), abruf);
    expect(r.status).toBe(502);
    expect(JSON.stringify(fehlerLog.mock.calls)).not.toMatch(/GEHEIMER|test-stimme/);
  });

  it("Server-Code protokolliert nie Ton oder Text", () => {
    const code = readFileSync("src/lib/begleitung/stimmeServer.ts", "utf8");
    const logs = [...code.matchAll(/console\.\w+\(([^;]*)\);/g)].map((m) => m[1]);
    expect(logs).toEqual(['"Stimme: Anbieter-Fehler", r?.status ?? "ohne Antwort"']);
  });
});

describe("Satzende am Pegel (eigene Aufnahme)", () => {
  /** Pegel-Folge (alle 50 ms) → Aktionen */
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
  const ersteZeit = (o: { t: number; a: LauschAktion }[], a: LauschAktion) => o.find((x) => x.a === a)?.t;

  it("sprechen bis 2 s, dann still: Ring nach 0,4 s, abgeschickt nach 1,2 s Stille", () => {
    const o = lauf((t) => (t < 2000 ? 0.12 : 0.004), 10_000);
    expect(ersteZeit(o, "wartet")).toBe(2350);
    expect(ersteZeit(o, "fertig")).toBe(3150);
  });

  it("kurze Atempause (0,8 s) schickt nichts ab", () => {
    const o = lauf((t) => (t < 1000 || (t >= 1800 && t < 3000) ? 0.1 : 0.004), 10_000);
    expect(o.filter((x) => x.t < 3000).some((x) => x.a === "fertig")).toBe(false);
    expect(ersteZeit(o, "fertig")).toBe(4150);
  });

  it("niemand spricht (oder nur ein Klacken): nach 8 s leise aufhören", () => {
    const o = lauf((t) => (t === 500 ? 0.5 : 0.003), 20_000);
    expect(o.at(-1)).toEqual({ t: 8000, a: "nichts" });
  });

  it("Grundrauschen zählt nicht als Sprechen; Dauer-Laut hält nie offen (höchstens 20 s, A-026)", () => {
    expect(lauf(() => 0.015, 20_000).at(-1)?.a).toBe("nichts");
    const dauer = lauf(() => 0.2, 70_000).at(-1)!;
    expect(dauer.a).toBe("fertig");
    expect(dauer.t).toBeLessThanOrEqual(20_000);
    expect(STIMME_GRENZEN.aufnahmeMs).toBe(60_000);
  });

  it("Pegel = Effektivwert", () => {
    expect(pegelVon([0.5, -0.5, 0.5, -0.5])).toBeCloseTo(0.5);
    expect(pegelVon([])).toBe(0);
  });
});

describe("Kosten, Mikro-Check, Pinnwand", () => {
  it("vorgelesene Zeichen und gehörte Sekunden in „KI-Kosten letzte 7 Tage“", () => {
    let s = addStimme(null, "2026-10-21", { zeichen: 1000 });
    s = addStimme(s, "2026-10-21", { sekunden: 3600 });
    expect(s.days["2026-10-21"]).toMatchObject({ requests: 0, zeichen: 1000, sekunden: 3600 });
    const sum = costSummary(s, "2026-10-21");
    expect(sum).toMatchObject({ zeichen: 1000, sekunden: 3600, requests: 0 });
    expect(sum.usd).toBeCloseTo(0.11 + 0.4, 2);
  });

  it("„Wer spricht?“: Standard Mias Stimme, alte Einstellungen bleiben gültig", async () => {
    vi.resetModules();
    const { fakeWindow } = await import("../helpers");
    fakeWindow({ "wasgibts.vorlesen": JSON.stringify({ version: 1, mode: "an", voice: "Anna", rate: "schnell" }) });
    try {
      const speech = await import("@/lib/begleitung/speech");
      expect(speech.loadSpeechSettings()).toEqual({ version: 1, mode: "an", quelle: "mia", voice: "Anna", rate: "schnell" });
      speech.saveSpeechSettings({ quelle: "handy" });
      expect(speech.loadSpeechSettings().quelle).toBe("handy");
    } finally {
      delete (globalThis as { window?: unknown }).window;
    }
  });

  it("Mikro-Check mit Server-Ohr: nur „Mikrofon erlaubt? Ton kommt an?“", () => {
    expect(checkZeilen(true).map((z) => z.id)).toEqual(["mikro", "ton"]);
    expect(checkZeilen(false).map((z) => z.id)).toEqual(["mikro", "erkennung", "ton"]);
  });

  it("Pinnwand-Sprachnachrichten gehen nie an den Sprach-Anbieter", () => {
    const dateien = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(join(dir, e.name)) : [join(dir, e.name)]));
    const pinnwand = [...dateien("src/lib/pinnwand"), ...dateien("src/components/pinnwand")];
    expect(pinnwand.length).toBeGreaterThan(3);
    for (const f of pinnwand) expect(readFileSync(f, "utf8"), f).not.toMatch(/stimmeClient|aufnahme"|\/api\/hoeren|HOEREN_ENDPOINT|elevenlabs/i);
  });

  it("Schlüssel nur auf dem Server: kein App-Code liest ELEVENLABS_*", () => {
    const dateien = (dir: string): string[] => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? dateien(join(dir, e.name)) : [join(dir, e.name)]));
    const treffer = [...dateien("src/lib"), ...dateien("src/components"), ...dateien("src/app")].filter((f) => /process\.env\.ELEVENLABS/.test(readFileSync(f, "utf8")));
    expect(treffer).toEqual(["src/lib/begleitung/stimmeServer.ts"]);
  });
});

describe("Vorwärmen (A-035): kein Sprechen, kein Schlüssel nach draußen", () => {
  const warm = (headers: Record<string, string> = { [ACCESS_HEADER]: "sonne" }) => new Request("http://localhost/api/stimme?warm=1", { headers });

  it("öffnet nur die Verbindung (HEAD ohne Schlüssel), kein Ton, 204", async () => {
    echt();
    const { abruf, calls } = anbieter();
    const r = await vorwaermen(warm(), abruf);
    expect(r.status).toBe(204);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("https://api.elevenlabs.io/");
    expect(calls[0].init.method).toBe("HEAD");
    expect(JSON.stringify(calls[0].init)).not.toContain("test-stimme");
    expect(calls[0].url).not.toContain("text-to-speech");
  });

  it("Zugangscode gilt, ohne Schlüssel „aus“, Anbieter weg = trotzdem 204", async () => {
    echt();
    const { abruf, calls } = anbieter();
    expect((await vorwaermen(warm({}), abruf)).status).toBe(401);
    expect(calls).toHaveLength(0);
    const kaputt = vi.fn(async () => {
      throw new Error("weg");
    }) as unknown as typeof fetch;
    expect((await vorwaermen(warm(), kaputt)).status).toBe(204);
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    expect((await vorwaermen(warm(), abruf)).status).toBe(503);
  });
});
