import { afterEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import { aiSetup, checkAccess, clientIp, takeDailySlot } from "@/lib/begleitung/guard";
import { allowDaily, allowRequest, codeAttemptsLeft, noteWrongCode } from "@/lib/begleitung/rateLimit";
import { ACCESS_HEADER, LIMITS, normalisiereZugangscode } from "@/lib/begleitung/protocol";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  delete (globalThis as { window?: unknown }).window;
});

const anfrage = (headers: Record<string, string> = {}) => new Request("http://localhost/api/lotte", { headers });

describe("KI nur mit Schlüssel UND Zugangscode", () => {
  it("aiSetup", () => {
    vi.stubEnv("KUECHENHELFER_MOCK", "");
    vi.stubEnv("APP_ACCESS_CODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "test-schluessel");
    expect(aiSetup()).toEqual({ mock: false, needsCode: false, configured: false });
    vi.stubEnv("APP_ACCESS_CODE", "sonne");
    expect(aiSetup()).toEqual({ mock: false, needsCode: true, configured: true });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    expect(aiSetup()).toMatchObject({ mock: true, configured: true });
  });

  it("checkAccess: ohne Code ok, falscher Code zählt, nach 10 Fehlversuchen kurze Pause", () => {
    vi.stubEnv("APP_ACCESS_CODE", "");
    expect(checkAccess(anfrage())).toBeNull();
    vi.stubEnv("APP_ACCESS_CODE", " sonne ");
    expect(checkAccess(anfrage())).toBe("zugangscode");
    expect(checkAccess(anfrage({ [ACCESS_HEADER]: "sonne", "x-forwarded-for": "10.0.0.1" }))).toBeNull();
    const ip = { "x-forwarded-for": "10.0.0.2, 1.1.1.1" };
    for (let i = 0; i < 10; i++) expect(checkAccess(anfrage({ ...ip, [ACCESS_HEADER]: "mond" }))).toBe("zugangscode");
    expect(checkAccess(anfrage({ ...ip, [ACCESS_HEADER]: "sonne" }))).toBe("limit");
    expect(clientIp(anfrage(ip))).toBe("10.0.0.2");
    expect(clientIp(anfrage())).toBe("unbekannt");
  });

  it("Zugangscode nachsichtig: Groß/klein und Leerzeichen sind egal, Falsches bleibt falsch", () => {
    vi.stubEnv("APP_ACCESS_CODE", "Sonne 42");
    const ip = { "x-forwarded-for": "10.0.0.9" };
    expect(checkAccess(anfrage({ ...ip, [ACCESS_HEADER]: "sonne42" }))).toBeNull();
    expect(checkAccess(anfrage({ ...ip, [ACCESS_HEADER]: "  SONNE  42 " }))).toBeNull();
    expect(checkAccess(anfrage({ ...ip, [ACCESS_HEADER]: "sonne4" }))).toBe("zugangscode");
    expect(normalisiereZugangscode(" Mia\tSonne ")).toBe("miasonne");
    expect(normalisiereZugangscode("   ")).toBe("");
  });

  it("takeDailySlot: Testmodus frei, sonst Tageslimit pro Gerät", () => {
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    expect(takeDailySlot(anfrage(), "g1")).toBe(true);
    vi.stubEnv("KUECHENHELFER_MOCK", "");
    const req = anfrage({ "x-forwarded-for": "10.9.9.9" });
    for (let i = 0; i < LIMITS.dailyPerDevice; i++) expect(takeDailySlot(req, "geraet-limit")).toBe(true);
    expect(takeDailySlot(req, "geraet-limit")).toBe(false);
    expect(takeDailySlot(req, "anderes-geraet")).toBe(true);
  });
});

describe("Rate-Limit", () => {
  it("pro Minute höchstens 10, Faktor hebt an, nach einer Minute wieder frei", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 10; i++) expect(allowRequest("k1", 1, t0 + i)).toBe(true);
    expect(allowRequest("k1", 1, t0 + 20)).toBe(false);
    expect(allowRequest("k1", 1, t0 + 61_000)).toBe(true);
    for (let i = 0; i < 19; i++) allowRequest("k2", 2, t0);
    expect(allowRequest("k2", 2, t0)).toBe(true);
    expect(allowRequest("k2", 2, t0)).toBe(false);
  });

  it("räumt alte Schlüssel auf, wenn es zu viele werden", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < 5002; i++) allowRequest(`viel-${i}`, 1, t0);
    expect(allowRequest("neu", 1, t0 + 2 * 60 * 60_000)).toBe(true);
    for (let i = 0; i < 5002; i++) allowDaily(`tag-${i}`, 1, t0);
    expect(allowDaily("tag-neu", 1, t0 + 2 * 24 * 60 * 60_000)).toBe(true);
  });

  it("Tageslimit und Fehlversuche verfallen", () => {
    const t0 = 9_000_000;
    for (let i = 0; i < LIMITS.dailyPerDevice; i++) allowDaily("d1", 1, t0);
    expect(allowDaily("d1", 1, t0)).toBe(false);
    expect(allowDaily("d1", 1, t0 + 25 * 60 * 60_000)).toBe(true);
    for (let i = 0; i < 9; i++) noteWrongCode("ip-x", t0);
    expect(codeAttemptsLeft("ip-x", t0)).toBe(true);
    noteWrongCode("ip-x", t0);
    expect(codeAttemptsLeft("ip-x", t0)).toBe(false);
    expect(codeAttemptsLeft("ip-x", t0 + 14 * 60_000)).toBe(false);
    expect(codeAttemptsLeft("ip-x", t0 + 15 * 60_000)).toBe(true);
    for (let i = 0; i < 5002; i++) noteWrongCode(`ip-${i}`, t0);
    expect(codeAttemptsLeft("ip-x", t0)).toBe(true);
  });
});

describe("Verbrauch still speichern", () => {
  it("recordUsage schreibt je Tag, ohne Angabe nichts, kaputte Daten werden bereinigt", async () => {
    const local = memoryStorage({ "wasgibts.verbrauch": JSON.stringify({ version: 1, days: { "2026-10-20": { requests: -3, small: "x", large: 1, upgraded: 0, micro: 5 }, kaputt: {} } }) });
    (globalThis as { window?: unknown }).window = { localStorage: local, addEventListener() {}, removeEventListener() {} };
    const { recordUsage } = await import("@/lib/begleitung/usage");
    recordUsage("2026-10-21", undefined);
    recordUsage("2026-10-21", { size: "klein", upgraded: false, micro: null });
    recordUsage("2026-10-21", { size: "gross", upgraded: true, micro: 300 });
    const saved = JSON.parse(local.getItem("wasgibts.verbrauch") ?? "{}");
    expect(saved.days).toEqual({
      "2026-10-20": { requests: 0, small: 0, large: 1, upgraded: 0, micro: 5, zeichen: 0, sekunden: 0 },
      "2026-10-21": { requests: 2, small: 1, large: 1, upgraded: 1, micro: 300, zeichen: 0, sekunden: 0 },
    });
  });

  it("ohne Speicher passiert nichts (kein Absturz)", async () => {
    (globalThis as { window?: unknown }).window = {
      localStorage: { getItem: () => null, setItem: () => { throw new Error("voll"); } },
      addEventListener() {},
      removeEventListener() {},
    };
    const { recordUsage } = await import("@/lib/begleitung/usage");
    expect(() => recordUsage("2026-10-21", { size: "klein", upgraded: false, micro: 1 })).not.toThrow();
  });
});
