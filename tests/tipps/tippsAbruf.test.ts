// Tipps in der App: Einstellungen (`wasgibts.regiontipps` v1), Quelle einmal
// fragen, ein Abruf für heute + 20 Tage, Übernehmen als Familientermin (mit
// Rückgängig), Pinnwand-Frage, Merken, Freischalten. fetch und React ersetzt.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStorage } from "../helpers";
import { demoTips } from "@/lib/tipps/sources/demo";
import { nearTips, type TipView } from "@/lib/tipps/model";

const effects: (() => void)[] = [];
vi.mock("react", () => ({
  useState: (init: unknown) => [typeof init === "function" ? (init as () => unknown)() : init, () => {}],
  useEffect: (fn: () => void | (() => void)) => {
    const c = fn();
    if (c) effects.push(c);
  },
  useSyncExternalStore: (_s: unknown, get: () => unknown) => get(),
}));

type Client = typeof import("@/lib/tipps/client");
let client: Client;
let local: Storage;

const WED = "2026-10-21";
const TIPS: TipView[] = nearTips(demoTips(WED), { lat: 54.1376, lng: 10.6181 }, 40);
const tip = (id: string) => TIPS.find((t) => t.quelle_id === id)!;
const json = (body: unknown, ok = true) => ({ ok, json: async () => body }) as unknown as Response;
const read = (key: string) => JSON.parse(local.getItem(key) ?? "null");
const flush = () => new Promise((r) => setTimeout(r, 0));

beforeEach(async () => {
  local = memoryStorage();
  (globalThis as { window?: unknown }).window = { localStorage: local, sessionStorage: memoryStorage(), addEventListener() {}, removeEventListener() {} };
  effects.length = 0;
  vi.resetModules();
  const { at } = await import("../helpers");
  at(`${WED}T09:00`);
  client = await import("@/lib/tipps/client");
});

afterEach(() => {
  effects.forEach((c) => c());
  vi.unstubAllGlobals();
  delete (globalThis as { window?: unknown }).window;
});

describe("Einstellungen", () => {
  it("Standard: Wetter-Ort, 20 km, im Kalender an", () => {
    expect(client.useTipSettings()).toEqual({ version: 1, ort: null, km: 20, kalender: true, gemerkt: [], uebernommen: {}, jetztAus: null });
    expect(client.tipContext()).toEqual({ ort: "Eutin", km: 20 });
    local.setItem("wasgibts.wetterort", JSON.stringify({ version: 1, city: "Plön" }));
    expect(client.tipContext().ort).toBe("Plön");
    expect(client.useTipPlace()).toBe("Plön");
  });

  it("gespeicherte Werte werden geprüft und aufgeräumt", () => {
    const gemerkt = Array.from({ length: 105 }, (_, i) => `t${i}`);
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 1, ort: "  Malente  ", km: 7, kalender: false, gemerkt: [...gemerkt, 3], uebernommen: { a: "e1", b: 2 }, jetztAus: "2026-10-24" }));
    const s = client.useTipSettings();
    expect(s.ort).toBe("Malente");
    expect(s.km).toBe(20);
    expect(s.kalender).toBe(false);
    expect(s.gemerkt).toHaveLength(100);
    expect(s.gemerkt[0]).toBe("t5");
    expect(s.uebernommen).toEqual({ a: "e1" });
    expect(s.jetztAus).toBe("2026-10-24");
    expect(client.useTipPlace()).toBe("Malente");
  });

  it("falsche Version, leerer Ort, kaputte Listen → Standard bzw. leer", () => {
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 2, km: 5 }));
    expect(client.useTipSettings().km).toBe(20);
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 1, ort: "  ", km: 40, gemerkt: "x", uebernommen: null, jetztAus: 3 }));
    expect(client.useTipSettings()).toEqual({ version: 1, ort: null, km: 40, kalender: true, gemerkt: [], uebernommen: {}, jetztAus: null });
  });

  it("Merken an/aus und Jetzt-Karte fürs Wochenende aus", () => {
    client.toggleRemember("a");
    client.toggleRemember("b");
    expect(read("wasgibts.regiontipps").gemerkt).toEqual(["a", "b"]);
    client.toggleRemember("a");
    expect(read("wasgibts.regiontipps").gemerkt).toEqual(["b"]);
    client.hideJetztTipWeekend("2026-10-24");
    expect(read("wasgibts.regiontipps").jetztAus).toBe("2026-10-24");
    client.changeTipSettings((s) => ({ ...s, km: 5 }));
    expect(client.tipContext().km).toBe(5);
  });
});

describe("Quelle (einmal je Seitenaufruf gefragt)", () => {
  it("erst undefined, dann die Antwort des Servers – nur ein Abruf", async () => {
    const fn = vi.fn(async () => json({ source: "demo" }));
    vi.stubGlobal("fetch", fn);
    expect(client.knownTipsMode()).toBeUndefined();
    expect(client.useTipsMode()).toBeUndefined();
    await flush();
    expect(client.useTipsMode()).toBe("demo");
    expect(client.knownTipsMode()).toBe("demo");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("/api/tipps?nurquelle=1");
  });

  it("unbekannte Antwort oder offline → off", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ source: "geheim" })));
    client.useTipsMode();
    await flush();
    expect(client.knownTipsMode()).toBe("off");

    vi.resetModules();
    client = await import("@/lib/tipps/client");
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    client.useTipsMode();
    await flush();
    expect(client.knownTipsMode()).toBe("off");
  });

  it("sichtbar nur mit Quelle UND Baustein", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ source: "tldb" })));
    client.useTipsMode();
    await flush();
    expect(client.useTipsOn()).toBe(false);
    local.setItem("wasgibts.funktionen", JSON.stringify({ version: 2, on: ["regiontipps"] }));
    expect(client.useTipsOn()).toBe(true);
  });
});

describe("Tipps laden: heute + 20 Tage", () => {
  it("Abruf mit Ort, Umkreis und Zeitraum; danach aus dem Zwischenspeicher", async () => {
    const fn = vi.fn(async () => json({ source: "demo", ort: { name: "Eutin" }, tips: TIPS }));
    vi.stubGlobal("fetch", fn);
    const r = await client.loadTipsWindow(WED);
    expect(r).toEqual({ tips: TIPS, ort: "Eutin", mode: "demo", failed: false });
    expect(fn).toHaveBeenCalledWith(`/api/tipps?ort=Eutin&km=20&von=${WED}&bis=2026-11-10&heute=${WED}`);
    await client.loadTipsWindow(WED);
    expect(fn).toHaveBeenCalledTimes(1);
    client.forgetTips();
    await client.loadTipsWindow(WED);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("eigener Ort und Umkreis zählen", async () => {
    local.setItem("wasgibts.regiontipps", JSON.stringify({ version: 1, ort: "Bad Segeberg", km: 40 }));
    const fn = vi.fn(async () => json({ source: "demo", ort: null }));
    vi.stubGlobal("fetch", fn);
    const r = await client.loadTipsWindow(WED);
    expect(r).toEqual({ tips: [], ort: null, mode: "demo", failed: false });
    expect(fn).toHaveBeenCalledWith(`/api/tipps?ort=Bad+Segeberg&km=40&von=${WED}&bis=2026-11-10&heute=${WED}`);
  });

  it("Fehlerantwort = failed; offline = failed mit Quelle off", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({}, false)));
    expect(await client.loadTipsWindow(WED)).toEqual({ tips: [], ort: null, mode: "off", failed: true });
    client.forgetTips();
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new Error("offline"))));
    expect(await client.loadTipsWindow(WED)).toEqual({ tips: [], ort: null, mode: "off", failed: true });
  });

  it("useTipsWindow: aus = nichts, an = ein Abruf, danach das Ergebnis", async () => {
    const fn = vi.fn(async () => json({ source: "demo", ort: { name: "Eutin" }, tips: TIPS.slice(0, 2) }));
    vi.stubGlobal("fetch", fn);
    expect(client.useTipsWindow(WED, false)).toBeUndefined();
    expect(fn).not.toHaveBeenCalled();
    expect(client.useTipsWindow(WED)).toBeUndefined();
    // derselbe Schlüssel, solange er lädt → kein zweiter Abruf
    client.useTipsWindow(WED);
    await flush();
    expect(fn).toHaveBeenCalledTimes(1);
    expect(client.useTipsWindow(WED)?.tips).toHaveLength(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("Aktionen", () => {
  it("Übernehmen = Familientermin mit Ort, Link, Notiz „aus Tipps“ – und Rückgängig", async () => {
    const t = { ...tip("kinderkino"), url: "https://example.org/kino" };
    const id = client.takeTip(t, ["Lisa"]);
    const entries = read("wasgibts.eintraege").entries;
    const e = entries.find((x: { id: string }) => x.id === id);
    expect(e).toMatchObject({ typ: "termin", raum: "familie" });
    expect(e.data).toMatchObject({ title: t.titel, date: "2026-10-24", start: "15:00", place: "Stadtbibliothek, Schloßplatz 4, Eutin", reminder: "60", who: ["Lisa"], note: "aus Tipps", link: "https://example.org/kino" });
    expect(e.data.end).toBeUndefined();
    expect(read("wasgibts.regiontipps").uebernommen).toEqual({ [t.id]: id });
    expect(read("wasgibts.funktionen").on).toContain("regiontipps");
    expect(client.isTaken(t.id)).toBe(true);
    expect([...client.takenIds(client.useTipSettings(), entries)]).toEqual([t.id]);
    expect(client.takenIds(client.useTipSettings(), undefined).size).toBe(0);

    const { undoLast } = await import("@/lib/core/undo");
    expect(undoLast()).toBe(`„${t.titel}“ eintragen`);
    expect(read("wasgibts.eintraege").entries.some((x: { id: string }) => x.id === id)).toBe(false);
    expect(read("wasgibts.regiontipps").uebernommen).toEqual({});
    expect(client.isTaken(t.id)).toBe(false);
  });

  it("mit Ende, ganztags ohne Uhrzeit (10:00), ohne Link und Personen; Baustein schon an", () => {
    local.setItem("wasgibts.funktionen", JSON.stringify({ version: 2, on: ["regiontipps"] }));
    const markt = client.takeTip(tip("markt-mi"));
    const indoor = client.takeTip(tip("indoor"));
    const entries = read("wasgibts.eintraege").entries;
    const m = entries.find((x: { id: string }) => x.id === markt).data;
    expect(m).toMatchObject({ start: "08:00", end: "13:00" });
    expect(m.who).toBeUndefined();
    expect(m.link).toBeUndefined();
    const i = entries.find((x: { id: string }) => x.id === indoor).data;
    expect(i).toMatchObject({ date: "2026-10-25", start: "10:00" });
    expect(i.end).toBeUndefined();
  });

  it("übernommen, aber Termin gelöscht → wieder ein Tipp", () => {
    const t = tip("orgel");
    client.takeTip(t);
    local.setItem("wasgibts.eintraege", JSON.stringify({ version: 2, entries: [] }));
    expect(client.isTaken(t.id)).toBe(false);
    expect(client.isTaken("gibt-es-nicht")).toBe(false);
  });

  it("Pinnwand: kurze Frage an die Familie (mit Rückgängig)", async () => {
    expect(client.pinTip(tip("kinderkino"), "Felix")).toBe(true);
    const msgs = read("wasgibts.pinnwand").messages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0].data).toMatchObject({ text: "Wollen wir Sa 15 Uhr zu „Kinderkino: Die Schule der magischen Tiere“?", author: "Felix" });
    const { undoLast } = await import("@/lib/core/undo");
    expect(undoLast()).toBe("Pinnwand-Nachricht");
    expect(read("wasgibts.pinnwand").messages).toHaveLength(0);
  });

  it("Mia nutzt die Tipps: Baustein + Kachel an, Satz nur beim ersten Mal", async () => {
    const { TIPS_BAUSTEIN } = await import("@/lib/core/features");
    expect(client.unlockTips()).toBe(TIPS_BAUSTEIN.where);
    expect(read("wasgibts.funktionen").on).toContain("regiontipps");
    expect(read("wasgibts.startseite").tiles.find((t: { id: string }) => t.id === "tipps")?.visible).toBe(true);
    expect(client.unlockTips()).toBeNull();
  });
});
