// Durchatmen-Ansagen auf dem Server (A-051, Wunsch von Felix): ElevenLabs
// nachgestellt – erzeugt einmal alle festen Sätze, legt sie mit Inhalts-Hash
// in den öffentlichen Bucket samt Manifest; spätere Läufe erzeugen nur
// Fehlendes bzw. Geändertes (keine Kosten). Ohne Schlüssel „aus“. Zugang nur
// mit Admin-Geheimnis, Schlüssel nie im Browser oder Log.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ANSAGEN, liesAudioListe } from "@/lib/durchatmen/ansagen";
import { BUCKET, MANIFEST, STIMME_EINSTELLUNG, ansageDatei, ansagenErzeugen, ansagenUmgebung, type AnsagenUmgebung } from "@/lib/durchatmen/ansagenServer";

const U: AnsagenUmgebung = { elevenKey: "eleven-test", voice: "lola123456", modell: "eleven_multilingual_v2", supabaseUrl: "https://projekt.supabase.co", supabaseKey: "service-test" };

/** Nachgestellt: ElevenLabs + Storage (merkt sich hochgeladene Dateien) */
function welt(start: Record<string, string> = {}) {
  const bucket = new Map<string, string>(Object.entries(start));
  const tts: string[] = [];
  const abruf = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith("https://api.elevenlabs.io/")) {
      const body = JSON.parse(String(init?.body));
      tts.push(body.text);
      expect((init?.headers as Record<string, string>)["xi-api-key"]).toBe("eleven-test");
      expect(body.voice_settings).toEqual(STIMME_EINSTELLUNG);
      return new Response(new Uint8Array([1, 2, 3]), { status: 200 });
    }
    const pub = `${U.supabaseUrl}/storage/v1/object/public/${BUCKET}/`;
    if (url.startsWith(pub)) {
      const name = url.slice(pub.length);
      return bucket.has(name) ? new Response(bucket.get(name), { status: 200 }) : new Response("nein", { status: 404 });
    }
    const priv = `${U.supabaseUrl}/storage/v1/object/${BUCKET}/`;
    if (url.startsWith(priv) && init?.method === "POST") {
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer service-test");
      bucket.set(url.slice(priv.length), typeof init.body === "string" ? init.body : "ton");
      return new Response("{}", { status: 200 });
    }
    return new Response("?", { status: 500 });
  });
  return { bucket, tts, abruf };
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

  it("Anbieter-Fehler: alte Datei bleibt im Manifest, weiter mit dem Rest", async () => {
    const w = welt();
    await ansagenErzeugen(U, w.abruf);
    const alt = JSON.parse(w.bucket.get(MANIFEST)!);
    alt.dateien.ein = "ein-0000000000.mp3";
    w.bucket.set(MANIFEST, JSON.stringify(alt));
    const kaputt = vi.fn(async (url: string, init?: RequestInit) => (url.startsWith("https://api.elevenlabs.io/") ? new Response("", { status: 429 }) : w.abruf(url, init)));
    const r = await ansagenErzeugen(U, kaputt);
    expect(r).toMatchObject({ neu: 0, fehler: 1 });
    expect(JSON.parse(w.bucket.get(MANIFEST)!).dateien.ein).toBe("ein-0000000000.mp3");
  });

  it("Route nur mit Admin-Geheimnis, Log nur Zahlen, kein Schlüssel im Browser", async () => {
    const route = readFileSync("src/app/api/durchatmen/ansagen-erzeugen/route.ts", "utf8");
    expect(route).toContain("if (!adminErlaubt(request)) return Response.json({ error: \"zugang\" }, { status: 401 });");
    expect(route.match(/console\.log\(`[^`]*`\)/g)).toEqual(["console.log(`Durchatmen-Ansagen: ${r.neu} neu, ${r.schon} schon da, ${r.fehler} Fehler`)"]);
    for (const f of ["src/components/durchatmen/AnsagenErzeugen.tsx", "src/lib/durchatmen/anleitung.ts", "src/lib/durchatmen/ansagen.ts", "scripts/ansagen-erzeugen.mjs"]) expect(readFileSync(f, "utf8"), f).not.toMatch(/ELEVENLABS_API_KEY|xi-api-key|SUPABASE_SERVICE_ROLE/);
    const { adminErlaubt } = await import("@/lib/begleitung/adminZugang");
    const mit = (h?: string) => new Request("http://x/api", { method: "POST", headers: h ? { authorization: h } : {} });
    expect(adminErlaubt(mit("Bearer geheim-123"))).toBe(false); // ohne Geheimnis auf dem Server: zu
    vi.stubEnv("PRUEFSTAND_SECRET", "geheim-123");
    expect(adminErlaubt(mit())).toBe(false);
    expect(adminErlaubt(mit("Bearer falsch-123"))).toBe(false);
    expect(adminErlaubt(mit("Bearer geheim-123"))).toBe(true);
  });

  it("Bucket per Migration: öffentlich lesen, schreiben nur der Server", () => {
    const sql = readFileSync("supabase/migrations/20261105120000_durchatmen_ansagen.sql", "utf8");
    expect(sql).toMatch(/values \('durchatmen-ansagen', 'durchatmen-ansagen', true/);
    expect(sql).toMatch(/for select to anon, authenticated\s+using \(bucket_id = 'durchatmen-ansagen'\)/);
    expect(sql).not.toMatch(/for (insert|update|delete)/);
    expect(readFileSync("tests/datenbank/sicherheit.test.sql", "utf8")).toContain("Angemeldete legen keine Ansage ab");
    // App holt sie über die eigene Adresse aus dem Bucket
    expect(readFileSync("next.config.ts", "utf8")).toMatch(/source: "\/audio\/durchatmen\/:datei", destination: `\$\{ansagenBucket\(\)\}\/:datei`/);
  });
});
