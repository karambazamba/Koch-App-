// Durchatmen-Ansagen auf dem Server (A-051, Wunsch von Felix): ElevenLabs
// nachgestellt – erzeugt einmal alle festen Sätze, legt sie mit Inhalts-Hash
// in den öffentlichen Bucket samt Manifest; spätere Läufe erzeugen nur
// Fehlendes bzw. Geändertes (keine Kosten). Ohne Schlüssel „aus“. Zugang nur
// mit Admin-Geheimnis, Schlüssel nie im Browser oder Log.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANSAGEN, liesAudioListe } from "@/lib/durchatmen/ansagen";
import { BUCKET, MANIFEST, STIMME_EINSTELLUNG, ansageDatei, ansageSicherstellen, ansagenErzeugen, ansagenStand, ansagenUmgebung, type AnsagenUmgebung } from "@/lib/durchatmen/ansagenServer";

const U: AnsagenUmgebung = { elevenKey: "eleven-test", voice: "lola123456", modell: "eleven_multilingual_v2", supabaseUrl: "https://projekt.supabase.co", supabaseKey: "service-test" };

/** Nachgestellt: ElevenLabs + Storage (merkt sich hochgeladene Dateien) */
function welt(start: Record<string, string> = {}) {
  const bucket = new Map<string, string>(Object.entries(start));
  const tts: string[] = [];
  const lesen: string[] = [];
  const abruf = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("https://api.elevenlabs.io/")) {
      const body = JSON.parse(String(init?.body));
      tts.push(body.text);
      expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe("eleven-test");
      expect(body.voice_settings).toEqual(STIMME_EINSTELLUNG);
      await new Promise((r) => setTimeout(r, 5));
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    const pub = `${U.supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
    if (url.startsWith(pub)) {
      const name = url.slice(pub.length);
      lesen.push(`${init?.method ?? "GET"} ${name}`);
      if (!bucket.has(name)) return new Response("nein", { status: 404 });
      return new Response(init?.method === "HEAD" ? null : bucket.get(name), { status: 200 });
    }
    const priv = `${U.supabaseUrl}/storage/v1/object/${BUCKET}/`;
    if (url.startsWith(priv) && init?.method === "POST") {
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer service-test");
      bucket.set(url.slice(priv.length), typeof init.body === "string" ? init.body : "ton");
      return new Response("{}", { status: 200 });
    }
    return new Response("?", { status: 500 });
  });
  return { bucket, tts, lesen, abruf };
}

afterEach(() => vi.unstubAllEnvs());

describe("Ansagen auf dem Server erzeugen", () => {
  it("erster Lauf: alle Sätze einmal, Dateien mit Inhalts-Hash, Manifest", async () => {
    const w = welt();
    const r = await ansagenErzeugen(U, w.abruf);
    const n = Object.keys(ANSAGEN).length;
    expect(r).toEqual({ status: "ok", neu: n, schon: 0, fehler: 0 });
    expect(w.tts.sort()).toEqual(Object.values(ANSAGEN).sort());
    const manifest = liesAudioListe(JSON.parse(w.bucket.get(MANIFEST)!));
    expect(Object.keys(manifest!.dateien)).toHaveLength(n);
    expect(manifest!.dateien.ein).toMatch(/^ein-[0-9a-f]{10}\.mp3$/);
    expect(w.bucket.has(manifest!.dateien.ein)).toBe(true);
    // Manifest ohne ganze Stimmen-ID, ohne Schlüssel
    expect(w.bucket.get(MANIFEST)).not.toMatch(/lola123456|eleven-test|service-test/);
    expect(BUCKET).toBe("durchatmen-ansagen");
  });

  it("zweiter Lauf kostet nichts; geänderter Satz bzw. neue Stimme = neue Datei", async () => {
    const w = welt();
    await ansagenErzeugen(U, w.abruf);
    w.tts.length = 0;
    expect(await ansagenErzeugen(U, w.abruf)).toMatchObject({ neu: 0, schon: Object.keys(ANSAGEN).length });
    expect(w.tts).toEqual([]);
    expect(ansageDatei("ein", "Ein", "a", "m")).not.toBe(ansageDatei("ein", "Ein ", "a", "m"));
    expect(ansageDatei("ein", "Ein", "a", "m")).not.toBe(ansageDatei("ein", "Ein", "b", "m"));
    expect(ansageDatei("ein", "Ein", "a", "m")).toBe(ansageDatei("ein", "Ein", "a", "m"));
  });

  it("ohne Schlüssel oder Supabase: aus, kein Aufruf", async () => {
    const w = welt();
    expect(await ansagenErzeugen({ ...U, elevenKey: null }, w.abruf)).toEqual({ status: "aus" });
    expect(await ansagenErzeugen({ ...U, supabaseKey: null }, w.abruf)).toEqual({ status: "aus" });
    expect(w.abruf).not.toHaveBeenCalled();
    expect(ansagenUmgebung({ ELEVENLABS_API_KEY: " k ", MIA_VOICE_ID: "v" }, { url: "http://unsicher", key: "s" })).toMatchObject({ elevenKey: "k", supabaseUrl: null, supabaseKey: "s" });
  });

  it("Abruf einer fehlenden Ansage: erste Anfrage erzeugt die Datei, die zweite liefert aus dem Speicher", async () => {
    const w = welt();
    const erst = await ansageSicherstellen(U, "ferne", { abruf: w.abruf, mitTon: true });
    expect(erst).toMatchObject({ status: "neu" });
    expect(w.tts).toEqual(["Schau so weit weg, wie es geht."]);
    const datei = ansageDatei("ferne", ANSAGEN.ferne, U.voice!, U.modell);
    expect(w.bucket.has(datei)).toBe(true);
    const zweit = await ansageSicherstellen(U, "ferne", { abruf: w.abruf, mitTon: true });
    expect(zweit).toMatchObject({ status: "da", datei });
    expect("ton" in zweit && zweit.ton?.byteLength).toBeGreaterThan(0);
    expect(w.tts).toHaveLength(1);
  });

  it("nur Sätze aus der Datei (nie freier Text), höchstens ein Erzeugen gleichzeitig", async () => {
    const w = welt();
    for (const id of ["quatsch", "__proto__", "constructor", "Schau so weit weg"]) expect(await ansageSicherstellen(U, id, { abruf: w.abruf })).toEqual({ status: "unbekannt" });
    expect(w.abruf).not.toHaveBeenCalled();
    const fuenf = await Promise.all([1, 2, 3, 4, 5].map(() => ansageSicherstellen(U, "ein", { abruf: w.abruf, mitTon: true })));
    expect(w.tts).toEqual(["Ein"]);
    expect(fuenf.every((r) => r.status === "neu")).toBe(true);
  });

  it("Anbieter-Fehler: still („fehler“), nichts abgelegt; Stand für den Entwickler-Bereich", async () => {
    const w = welt();
    const kaputt = vi.fn(async (url: string, init?: RequestInit) => (url.startsWith("https://api.elevenlabs.io/") ? new Response("", { status: 429 }) : w.abruf(url, init)));
    expect(await ansageSicherstellen(U, "aus", { abruf: kaputt })).toEqual({ status: "fehler" });
    expect([...w.bucket.keys()]).toEqual([]);
    expect(await ansagenStand(U, w.abruf)).toEqual({ eingerichtet: true, da: 0, gesamt: Object.keys(ANSAGEN).length });
    await ansageSicherstellen(U, "aus", { abruf: w.abruf });
    expect((await ansagenStand(U, w.abruf)).da).toBe(1);
    expect(await ansagenStand({ ...U, elevenKey: null }, w.abruf)).toMatchObject({ eingerichtet: false });
    expect(await ansageSicherstellen({ ...U, voice: null }, "ein", { abruf: w.abruf })).toEqual({ status: "aus" });
  });

  it("Audio-Route: nur der aktuelle Text-Hash `t` – andere Werte 404 ohne Erzeugen", async () => {
    vi.resetModules();
    const sicher = vi.fn(async () => ({ status: "da", datei: "ein-x.mp3", ton: new Uint8Array([1]).buffer }));
    vi.doMock("next/server", () => ({ connection: async () => {} }));
    vi.doMock("@/lib/durchatmen/ansagenServer", async (orig) => ({ ...(await orig<object>()), ansageSicherstellen: sicher }));
    const { GET } = await import("@/app/api/durchatmen/ansage/[datei]/route");
    const { ansageUrl } = await import("@/lib/durchatmen/ansagen");
    const abruf = (pfad: string, datei: string) => GET(new Request(`http://x${pfad}`), { params: Promise.resolve({ datei }) });
    for (const t of ["", "?t=1", "?t=abc", "?t=zzzzzz", "?t=1&t=2"]) expect((await abruf(`/audio/durchatmen/ein.mp3${t}`, "ein.mp3")).status, t).toBe(404);
    expect((await abruf("/audio/durchatmen/quatsch.mp3?t=1", "quatsch.mp3")).status).toBe(404);
    expect(sicher).not.toHaveBeenCalled();
    expect((await abruf(ansageUrl("ein")!, "ein.mp3")).status).toBe(200);
    expect(sicher).toHaveBeenCalledTimes(1);
    vi.doUnmock("next/server");
    vi.doUnmock("@/lib/durchatmen/ansagenServer");
  });

  it("Audio-Route: nur Ansagen aus der Datei, Fehler still (404), Cron nachts mit CRON_SECRET", () => {
    const route = readFileSync("src/app/api/durchatmen/ansage/[datei]/route.ts", "utf8");
    expect(route).toContain("const id = ansageIdAus((await ctx.params).datei);");
    expect(route).toContain("if (!id) return still();");
    expect(route).not.toMatch(/console\./);
    expect(readFileSync("next.config.ts", "utf8")).toContain('{ source: "/audio/durchatmen/:datei", destination: "/api/durchatmen/ansage/:datei" }');
    const cron = JSON.parse(readFileSync("vercel.json", "utf8")).crons as { path: string }[];
    expect(cron.some((c) => c.path === "/api/durchatmen/ansagen-erzeugen")).toBe(true);
    expect(readFileSync("src/app/api/durchatmen/ansagen-erzeugen/route.ts", "utf8")).toMatch(/request\.headers\.get\("authorization"\) !== `Bearer \$\{secret\}`/);
  });

  it("kein Knopf nötig, Log nur Zahlen, kein Schlüssel im Browser; Hinweis im Entwickler-Bereich", async () => {
    const route = readFileSync("src/app/api/durchatmen/ansagen-erzeugen/route.ts", "utf8");
    expect(route).not.toMatch(/export async function POST/);
    expect(route.match(/console\.log\(`[^`]*`\)/g)).toEqual(["console.log(`Durchatmen-Ansagen (Cron): ${r.neu} neu, ${r.schon} schon da, ${r.fehler} Fehler`)"]);
    for (const f of ["src/components/durchatmen/AnsagenStand.tsx", "src/lib/durchatmen/anleitung.ts", "src/lib/durchatmen/ansagen.ts", "src/app/api/durchatmen/ansagen-stand/route.ts"]) expect(readFileSync(f, "utf8"), f).not.toMatch(/ELEVENLABS_API_KEY|xi-api-key|SUPABASE_SERVICE_ROLE/);
    const stand = readFileSync("src/components/durchatmen/AnsagenStand.tsx", "utf8");
    expect(stand).not.toMatch(/<button/);
    const { ansagenHinweis } = await import("@/components/durchatmen/AnsagenStand");
    expect(ansagenHinweis({ eingerichtet: false, da: 0, gesamt: 38 }, "Mia")).toContain("Bis dahin nur Klang.");
    expect(ansagenHinweis({ eingerichtet: true, da: 12, gesamt: 38 }, "Mia")).toBe("12 von 38 Ansagen da. Die übrigen entstehen beim ersten Abspielen und nachts von selbst.");
    expect(ansagenHinweis({ eingerichtet: true, da: 38, gesamt: 38 }, "Mia")).toBe("Alle 38 Ansagen mit Mias Stimme sind da.");
    expect(readFileSync("src/components/einstellungen/settings/AdminView.tsx", "utf8")).toContain("<AnsagenStand />");
  });

  it("Bucket per Migration: öffentlich lesen, schreiben nur der Server", () => {
    const sql = readFileSync("supabase/migrations/20261105120000_durchatmen_ansagen.sql", "utf8");
    expect(sql).toMatch(/values \('durchatmen-ansagen', 'durchatmen-ansagen', true/);
    expect(sql).toMatch(/for select to anon, authenticated\s+using \(bucket_id = 'durchatmen-ansagen'\)/);
    expect(sql).not.toMatch(/for (insert|update|delete)/);
    expect(readFileSync("tests/datenbank/sicherheit.test.sql", "utf8")).toContain("Angemeldete legen keine Ansage ab");
    // App holt sie über die eigene Route (liefert aus dem Bucket bzw. erzeugt einmal)
    expect(readFileSync("src/lib/durchatmen/ansagen.ts", "utf8")).toContain("`${AUDIO_ORDNER}/${id}.mp3?t=${textHash(text)}`");
  });
});
