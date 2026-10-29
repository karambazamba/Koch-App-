// „Was los?“ (A-055) auf dem Server: Not-Schalter, Beispieldaten nur im
// Testbetrieb, täglicher Lauf (heute + 14 Tage schreiben, Abgelaufenes und
// Gesperrtes löschen, 0 Treffer/Fehler → alte Daten bleiben + Hinweis),
// öffentliche Liste 1 Std. zwischengespeichert, Routen.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { at } from "../helpers";
import { aktualisiereRegion, ersterLauf, ladeRegion, nochNieGelaufen, regionQuelle, type RegionSpeicher, type RegionStatus } from "@/lib/region/server";
import { gesperrteIds } from "@/lib/region/sperrliste";
import { sanitizeEvent, type RegionEvent } from "@/lib/region/model";

const HEUTE = "2026-10-21";
const ev = (id: string, datum: string, bis_datum: string | null = null): RegionEvent => sanitizeEvent({ id, titel: `T ${id}`, quelle: "kreisoh", datum, bis_datum, ort: "Eutin" })!;

/** Speicher im Arbeitsspeicher, verhält sich wie die Tabelle */
function speicher(start: RegionEvent[] = []) {
  const rows = new Map(start.map((e) => [e.id, e]));
  let status: RegionStatus | null = null;
  const s: RegionSpeicher & { rows: typeof rows; gelesen: number } = {
    rows,
    gelesen: 0,
    async lesen(von, bis) {
      s.gelesen++;
      return [...rows.values()].filter((e) => (e.bis_datum ?? e.datum) >= von && e.datum <= bis);
    },
    async schreiben(events) {
      for (const e of events) rows.set(e.id, e);
      return true;
    },
    async aufraeumen(heute, gesperrt) {
      for (const [id, e] of rows) if ((e.bis_datum ?? e.datum) < heute || gesperrt.includes(id)) rows.delete(id);
      return true;
    },
    async leseStatus() {
      return status;
    },
    async schreibeStatus(x) {
      status = x;
      return true;
    },
  };
  return s;
}

beforeEach(() => at(`${HEUTE}T05:00`));
afterEach(() => vi.unstubAllEnvs());

describe("Schalter REGION_TIPPS_QUELLE", () => {
  it("Standard Kreis; „aus“ (auch off/0) = nichts", () => {
    expect(regionQuelle({})).toBe("kreisoh");
    for (const v of ["aus", "OFF", " 0 ", "nein"]) expect(regionQuelle({ REGION_TIPPS_QUELLE: v })).toBe("aus");
  });
  it("Beispieldaten nur im Testbetrieb, nie in Produktion", () => {
    expect(regionQuelle({ REGION_TIPPS_QUELLE: "demo" })).toBe("demo");
    expect(regionQuelle({ TIPS_SOURCE: "demo" })).toBe("demo");
    expect(regionQuelle({ REGION_TIPPS_QUELLE: "demo", VERCEL_ENV: "production" })).toBe("kreisoh");
    expect(regionQuelle({ TIPS_SOURCE: "demo", VERCEL_ENV: "production" })).toBe("kreisoh");
    expect(regionQuelle({ TIPS_SOURCE: "demo", REGION_TIPPS_QUELLE: "aus" })).toBe("aus");
  });
  it("Sperrliste aus der Variablen (nur gültige IDs)", () => {
    expect([...gesperrteIds("kreisoh-12, kreisoh-13 <script>")]).toEqual(["kreisoh-12", "kreisoh-13"]);
    expect(gesperrteIds(undefined).size).toBe(0);
  });
});

describe("Täglicher Lauf", () => {
  it("schreibt heute bis +14 Tage, löscht Abgelaufenes und Gesperrtes, Status ok", async () => {
    const sp = speicher([ev("kreisoh-alt", "2026-10-19"), ev("kreisoh-lang", "2026-10-01", "2026-10-30"), ev("kreisoh-weg", "2026-10-25")]);
    const abrufen = vi.fn(async () => ({ events: [ev("kreisoh-1", "2026-10-24"), ev("kreisoh-weg", "2026-10-25")], seiten: 2, grund: "ok" as const }));
    const r = await aktualisiereRegion({ quelle: "kreisoh", heute: HEUTE, speicher: sp, abrufen, gesperrt: new Set(["kreisoh-weg"]) });
    expect(abrufen).toHaveBeenCalledWith(HEUTE, "2026-11-04");
    expect(r).toEqual({ quelle: "kreisoh", treffer: 1, geschrieben: true, grund: "ok", seiten: 2 });
    expect([...sp.rows.keys()].sort()).toEqual(["kreisoh-1", "kreisoh-lang"]);
    expect(await sp.leseStatus()).toMatchObject({ treffer: 1, grund: "ok" });
  });

  it("0 Treffer oder Fehler: alte Daten bleiben bis Ablauf, Status sagt es", async () => {
    const sp = speicher([ev("kreisoh-1", "2026-10-24")]);
    const r = await aktualisiereRegion({ quelle: "kreisoh", heute: HEUTE, speicher: sp, abrufen: async () => ({ events: [], seiten: 1, grund: "leer" }) });
    expect(r).toMatchObject({ treffer: 0, geschrieben: false, grund: "leer" });
    expect([...sp.rows.keys()]).toEqual(["kreisoh-1"]);
    expect(await sp.leseStatus()).toMatchObject({ treffer: 0, grund: "leer" });
    await aktualisiereRegion({ quelle: "kreisoh", heute: HEUTE, speicher: sp, abrufen: async () => ({ events: [], seiten: 0, grund: "fehler" }) });
    expect([...sp.rows.keys()]).toEqual(["kreisoh-1"]);
    expect(await sp.leseStatus()).toMatchObject({ grund: "fehler" });
  });

  it("Parser bereit: der Lauf fragt den Kreis (offline → „fehler“, alte Daten bleiben)", async () => {
    const sp = speicher();
    const holen = vi.fn(async () => {
      throw new Error("offline");
    });
    const r = await aktualisiereRegion({ quelle: "kreisoh", heute: HEUTE, speicher: sp, holen });
    expect(r).toMatchObject({ treffer: 0, grund: "fehler" });
    expect(holen).toHaveBeenCalledOnce();
  });

  it("aus: nichts holen, nichts schreiben; Beispieldaten werden nie gespeichert; ohne Speicher nichts", async () => {
    const sp = speicher();
    const abrufen = vi.fn();
    expect(await aktualisiereRegion({ quelle: "aus", heute: HEUTE, speicher: sp, abrufen })).toMatchObject({ grund: "aus" });
    expect(await aktualisiereRegion({ quelle: "demo", heute: HEUTE, speicher: sp, abrufen })).toMatchObject({ grund: "demo", geschrieben: false });
    expect(await aktualisiereRegion({ quelle: "kreisoh", heute: HEUTE, speicher: null, abrufen })).toMatchObject({ grund: "ohne-speicher" });
    expect(abrufen).not.toHaveBeenCalled();
    expect(sp.rows.size).toBe(0);
  });
});

describe("Liste für die App", () => {
  it("aus = leer; demo = Beispieldaten; Kreis aus dem Speicher, 1 Std. gemerkt, Gesperrtes nie", async () => {
    expect(await ladeRegion(HEUTE, { quelle: "aus" })).toEqual({ quelle: "aus", events: [], status: null });
    const demo = await ladeRegion(HEUTE, { quelle: "demo" });
    expect(demo.events.length).toBeGreaterThan(5);
    expect(demo.events.every((e) => e.quelle === "demo" && e.id.startsWith("demo-"))).toBe(true);
    vi.stubEnv("REGION_TIPPS_SPERRE", "kreisoh-2");
    const sp = speicher([ev("kreisoh-1", "2026-10-24"), ev("kreisoh-2", "2026-10-25"), ev("kreisoh-spaet", "2026-11-20")]);
    const t0 = 1_000_000;
    const a = await ladeRegion("2026-10-22", { quelle: "kreisoh", speicher: sp, jetzt: t0 });
    expect(a.events.map((e) => e.id)).toEqual(["kreisoh-1"]);
    await ladeRegion("2026-10-22", { quelle: "kreisoh", speicher: sp, jetzt: t0 + 59 * 60_000 });
    expect(sp.gelesen).toBe(1);
    await ladeRegion("2026-10-22", { quelle: "kreisoh", speicher: sp, jetzt: t0 + 61 * 60_000 });
    expect(sp.gelesen).toBe(2);
    expect(await ladeRegion("2026-10-23", { quelle: "kreisoh", speicher: null })).toEqual({ quelle: "kreisoh", events: [], status: null });
  });
});

describe("Erster Lauf nach der Auslieferung", () => {
  it("nur wenn noch nie echt gelaufen (kein Status oder „wartet“), schreibt zuerst „laeuft“, dann einmal", async () => {
    expect(nochNieGelaufen(null)).toBe(true);
    expect(nochNieGelaufen({ lauf: "x", treffer: 0, grund: "wartet" })).toBe(true);
    expect(nochNieGelaufen({ lauf: "x", treffer: 0, grund: "leer" })).toBe(false);
    const sp = speicher();
    await sp.schreibeStatus({ lauf: "x", treffer: 0, grund: "wartet" });
    const stati: string[] = [];
    const schreibe = sp.schreibeStatus;
    sp.schreibeStatus = async (x) => (stati.push(x.grund), schreibe(x));
    const holen = vi.fn(async () => {
      throw new Error("offline");
    });
    expect(await ersterLauf(HEUTE, { quelle: "kreisoh", speicher: sp, holen })).toBe(true);
    expect(stati).toEqual(["laeuft", "fehler"]);
    expect(holen).toHaveBeenCalledOnce();
    // Danach nie wieder von selbst (der Cron um 5 Uhr übernimmt)
    expect(await ersterLauf(HEUTE, { quelle: "kreisoh", speicher: sp, holen })).toBe(false);
    expect(holen).toHaveBeenCalledOnce();
  });

  it("nicht bei Beispieldaten, aus oder ohne Speicher", async () => {
    const holen = vi.fn();
    expect(await ersterLauf(HEUTE, { quelle: "demo", speicher: speicher(), holen })).toBe(false);
    expect(await ersterLauf(HEUTE, { quelle: "aus", speicher: speicher(), holen })).toBe(false);
    expect(await ersterLauf(HEUTE, { quelle: "kreisoh", speicher: null, holen })).toBe(false);
    expect(holen).not.toHaveBeenCalled();
  });
});

describe("Routen", () => {
  it("öffentliche Liste: ohne Konto, 1 Std. zwischengespeichert; `heute` nur bei Beispieldaten", async () => {
    vi.stubEnv("REGION_TIPPS_QUELLE", "demo");
    const { GET } = await import("@/app/api/region/route");
    const res = await GET(new Request("http://x/api/region?heute=2026-10-24"));
    const d = (await res.json()) as { quelle: string; events: RegionEvent[] };
    expect(d.quelle).toBe("demo");
    expect(d.events.some((e) => e.datum === "2026-10-24")).toBe(true);
    vi.stubEnv("REGION_TIPPS_QUELLE", "aus");
    const aus = await GET(new Request("http://x/api/region"));
    expect(await aus.json()).toEqual({ quelle: "aus", events: [], status: null });
    expect(aus.headers.get("cache-control")).toBe("public, max-age=3600, s-maxage=3600");
  });

  it("Cron: nur mit CRON_SECRET, läuft nur um 5 Uhr Berlin (3 bzw. 4 Uhr UTC)", async () => {
    const { GET } = await import("@/app/api/region/aktualisieren/route");
    expect((await GET(new Request("http://x"))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "geheim");
    vi.stubEnv("REGION_TIPPS_QUELLE", "aus");
    const auth = { headers: { authorization: "Bearer geheim" } };
    expect((await GET(new Request("http://x", { headers: { authorization: "Bearer falsch" } }))).status).toBe(401);
    at(`${HEUTE}T06:00`);
    expect(await (await GET(new Request("http://x?utc=4", auth))).json()).toEqual({ uebersprungen: true });
    at(`${HEUTE}T05:00`);
    expect(await (await GET(new Request("http://x?utc=3", auth))).json()).toMatchObject({ quelle: "aus", grund: "aus" });
    at(`${HEUTE}T09:00`);
    expect(await (await GET(new Request("http://x?jetzt=1", auth))).json()).toMatchObject({ grund: "aus" });
  });

  it("vercel.json: Cron 3:00 und 4:00 UTC, Region Frankfurt", async () => {
    const { readFileSync } = await import("node:fs");
    const v = JSON.parse(readFileSync("vercel.json", "utf8")) as { regions: string[]; crons: { path: string; schedule: string }[] };
    expect(v.regions).toEqual(["fra1"]);
    expect(v.crons.filter((c) => c.path.startsWith("/api/region/aktualisieren")).map((c) => c.schedule)).toEqual(["0 3 * * *", "0 4 * * *"]);
  });
});
