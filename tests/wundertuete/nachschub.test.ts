// Mias Nachschub (A-052): KI nur für Witze und Rätsel, Ähnlichkeitsabgleich
// gegen alles Bekannte (höchstens ein zweiter Versuch), ohne KI nichts
// Neues (dann „… kommen bald.“), Route nur über den Guard, Haiku über
// `modellwahl.ts`, Text durch `tidyMiaText()`, Protokoll ohne Inhalte.
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { aehnlichkeit, normalisiere, zuAehnlich } from "@/lib/wundertuete/aehnlich";
import { LEER } from "@/lib/wundertuete/auswahl";
import { WT_POOL } from "@/lib/wundertuete/pool";
import { RT_LEER, RT_POOL } from "@/lib/raetsel/auswahl";
import { MOCK_KARTEN, kiKarten, mockKarten, parseKiAnfrage, pruefeKiKarte } from "@/lib/wundertuete/kiKarte";
import { bekannteTexte, darfNachlegen, kiGezaehlt, nachlegen, neueKiId, KI_JE_TAG, type KiHolen } from "@/lib/wundertuete/vorrat";

afterEach(() => vi.unstubAllEnvs());

let n = 0;
const id = () => `ki-t-${++n}`;
const ki = (...antworten: (ReturnType<typeof mockKarten> | null)[]) => {
  const calls: Parameters<KiHolen>[0][] = [];
  const holen: KiHolen = async (a) => (calls.push(a), antworten[calls.length - 1] ?? null);
  return { holen, calls };
};

describe("Ähnlichkeit", () => {
  it("normalisiert (klein, ohne Fett, Satzzeichen, Umlaute) und vergleicht Trigramme (Schwelle 0,4)", () => {
    expect(normalisiere("Was hat **Zähne**, kann aber nicht beißen?")).toBe("was hat zaehne kann aber nicht beissen");
    expect(aehnlichkeit("Was hat Zähne, kann aber nicht beißen?", "Was hat Zähne und kann nicht beißen?")).toBeGreaterThan(0.5);
    expect(aehnlichkeit("Was hat Zähne, kann aber nicht beißen?", "Warum nimmt der Leuchtturm nie Urlaub?")).toBeLessThan(0.2);
    expect(zuAehnlich("WAS HAT ZÄHNE, kann aber nicht beißen!", ["Was hat Zähne, kann aber nicht beißen?"])).toBe(true);
    expect(zuAehnlich("Welches Haus trägt man auf dem Rücken mit sich herum?", ["Wer trägt sein Haus immer mit sich herum?"])).toBe(true);
  });

  it("keine Mock-Karte ähnelt einer Karte aus den Paketen oder einer anderen Mock-Karte; alle bestehen die Prüfung", () => {
    const pool = [...bekannteTexte(WT_POOL, LEER), ...bekannteTexte(RT_POOL, RT_LEER)];
    for (const art of ["witz", "raetsel"] as const) {
      const mocks = MOCK_KARTEN[art];
      for (const [i, m] of mocks.entries()) {
        expect(zuAehnlich(m.vorne, pool), m.vorne).toBe(false);
        expect(zuAehnlich(m.vorne, mocks.filter((_, j) => j !== i).map((x) => x.vorne)), m.vorne).toBe(false);
        expect(pruefeKiKarte(art, m), m.vorne).toEqual(m);
      }
    }
  });
});

describe("Mia legt nach", () => {
  it("neue Karten bekommen eigene IDs; was Bekanntem oder einander ähnelt, fällt weg", async () => {
    const alt = RT_POOL.karten[0];
    const { holen, calls } = ki([{ vorne: alt.vorne, hinten: alt.hinten }, MOCK_KARTEN.raetsel[0], MOCK_KARTEN.raetsel[0], MOCK_KARTEN.raetsel[1]]);
    const neu = await nachlegen(RT_POOL, RT_LEER, "raetsel", holen, id);
    expect(neu.map((x) => x.vorne)).toEqual([MOCK_KARTEN.raetsel[0].vorne, MOCK_KARTEN.raetsel[1].vorne]);
    expect(neu.every((x) => x.id.startsWith("ki-t-") && x.sorte === "raetsel")).toBe(true);
    expect(calls).toEqual([{ art: "raetsel", versuch: 1, nr: 0 }]);
  });

  it("nur Bekanntes → genau ein zweiter Versuch; wieder nichts → gescheitert (keine Wiederholung)", async () => {
    const witz = WT_POOL.karten.find((x) => x.sorte === "witz")!;
    const wieder = [{ vorne: witz.vorne, hinten: witz.hinten }];
    const zweiter = ki(wieder, [MOCK_KARTEN.witz[1]]);
    expect((await nachlegen(WT_POOL, LEER, "witz", zweiter.holen, id)).map((x) => x.vorne)).toEqual([MOCK_KARTEN.witz[1].vorne]);
    expect(zweiter.calls.map((c) => c.versuch)).toEqual([1, 2]);
    const nichts = ki(wieder, wieder, [MOCK_KARTEN.witz[2]]);
    expect(await nachlegen(WT_POOL, LEER, "witz", nichts.holen, id)).toEqual([]);
    expect(nichts.calls).toHaveLength(2);
    // Eigene Karten zählen auch als bekannt
    const mitEigener = { ...LEER, eigene: [{ id: "ki-x", sorte: "witz" as const, vorne: MOCK_KARTEN.witz[3].vorne, hinten: MOCK_KARTEN.witz[3].hinten }] };
    expect(await nachlegen(WT_POOL, mitEigener, "witz", ki([MOCK_KARTEN.witz[3]], [MOCK_KARTEN.witz[3]]).holen, id)).toEqual([]);
  });

  it("ohne KI (aus, Limit, Fehler): nichts Neues – die Oberfläche sagt „… kommen bald.“", async () => {
    expect(await nachlegen(WT_POOL, LEER, "witz", ki(null, null).holen, id)).toEqual([]);
    const fehler: KiHolen = async () => {
      throw new Error("offline");
    };
    expect(await nachlegen(RT_POOL, RT_LEER, "raetsel", fehler, id)).toEqual([]);
    expect(readFileSync("src/lib/wundertuete/sorten.ts", "utf8")).toContain('raetsel: "Neue Rätsel kommen bald."');
    expect(readFileSync("src/lib/wundertuete/sorten.ts", "utf8")).toContain('witz: "Neue Witze kommen bald."');
  });

  it("höchstens 6 Anfragen am Tag je Gerät; neue IDs `ki-…`", () => {
    let z = kiGezaehlt(undefined, "2027-01-01");
    for (let i = 1; i < KI_JE_TAG; i++) z = kiGezaehlt(z, "2027-01-01");
    expect(darfNachlegen(z, "2027-01-01")).toBe(false);
    expect(darfNachlegen(z, "2027-01-02")).toBe(true);
    expect(neueKiId(1_900_000_000_000, () => 0.1)).toMatch(/^ki-[a-z0-9]+-[a-z0-9]{4}$/);
  });
});

describe("Server: nur Witze und Rätsel", () => {
  it("Anfrage nur mit Art witz/raetsel (nie Platt, Angeberwissen, Fakten), Versuch 1–2, Nummer", () => {
    expect(parseKiAnfrage({ art: "witz", versuch: 1, nr: 0 })).toEqual({ art: "witz", versuch: 1, nr: 0 });
    for (const art of ["platt", "angeberwissen", "fakt"]) expect(parseKiAnfrage({ art, versuch: 1, nr: 0 })).toBeNull();
    expect(parseKiAnfrage({ art: "raetsel", versuch: 3, nr: 0 })).toBeNull();
  });

  it("prüft streng (zwei Sätze, Emoji, heikle Themen, Längen) und räumt auf (tidyMiaText)", () => {
    expect(pruefeKiKarte("witz", { vorne: "Warum lacht die Möwe?", hinten: "Sie hat den Hafen im Blick!!" })).toEqual({ vorne: "Warum lacht die Möwe?", hinten: "Sie hat den Hafen im Blick!" });
    expect(pruefeKiKarte("witz", { vorne: "Eins. Zwei.", hinten: "Drei Sätze sind zu viel." })).toBeNull();
    expect(pruefeKiKarte("witz", { vorne: "Ein Witz mit Emoji 😂", hinten: "geht nicht." })).toBeNull();
    expect(pruefeKiKarte("witz", { vorne: "Warum macht der Bär Diät?", hinten: "Weil Winter ist." })).toBeNull();
    expect(pruefeKiKarte("raetsel", { vorne: "Was hat ein Gesicht, aber keine Nase?", hinten: "" })).toBeNull();
  });

  it("KI-Aufruf: Alltagsmodell, strukturierte Antwort mit mehreren Karten, Ablehnung = nichts", async () => {
    const params: unknown[] = [];
    const create = (antwort: string, stop = "end_turn") => async (p: unknown) => (params.push(p), { content: [{ type: "text", text: antwort }], stop_reason: stop }) as never;
    const ok = JSON.stringify({ karten: [{ vorne: "Was hat ein Gesicht, aber keine Nase?", hinten: "Die **Uhr**." }, { vorne: "kurz", hinten: "x" }] });
    expect(await kiKarten({ art: "raetsel", versuch: 1, nr: 0 }, create(ok), "claude-haiku-5-5")).toEqual([{ vorne: "Was hat ein Gesicht, aber keine Nase?", hinten: "Die **Uhr**." }]);
    expect(params[0]).toMatchObject({ model: "claude-haiku-5-5", output_config: { format: { type: "json_schema" } } });
    expect(await kiKarten({ art: "witz", versuch: 2, nr: 0 }, create("kaputt"), "m")).toEqual([]);
    expect(await kiKarten({ art: "witz", versuch: 1, nr: 0 }, create("{}", "refusal"), "m")).toEqual([]);
  });

  it("Route: im Testmodus Mock-Karten, ohne KI 503, kaputte Anfrage 400", async () => {
    const { POST } = await import("@/app/api/nachschub/route");
    const post = (body: unknown) => POST(new Request("http://x/api/nachschub", { method: "POST", body: JSON.stringify(body) }));
    vi.stubEnv("KUECHENHELFER_MOCK", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("APP_ACCESS_CODE", "");
    expect((await post({ art: "witz", versuch: 1, nr: 0, deviceId: "geraet-12345" })).status).toBe(503);
    vi.stubEnv("KUECHENHELFER_MOCK", "1");
    const ok = await post({ art: "raetsel", versuch: 1, nr: 1, deviceId: "geraet-12345" });
    expect(await ok.json()).toEqual({ karten: MOCK_KARTEN.raetsel.slice(1, 4) });
    expect((await post({ art: "platt", versuch: 1, nr: 0, deviceId: "geraet-12345" })).status).toBe(400);
  });

  it("Route: Guard (Zugangscode + Tageslimit), Modell aus modellwahl.ts, Schlüssel und Inhalte nie im Protokoll", () => {
    const route = readFileSync("src/app/api/nachschub/route.ts", "utf8");
    expect(route).toContain('from "@/lib/begleitung/guard"');
    expect(route).toMatch(/checkAccess\(request\)/);
    expect(route).toMatch(/takeDailySlot\(request, device\)/);
    expect(route).toContain("alltagsModell()");
    expect(route).not.toMatch(/claude-|ANTHROPIC_API_KEY/);
    expect(route).not.toMatch(/console\.\w+\([^)]*(karte|vorne|hinten|body|raw)/);
    const lib = readFileSync("src/lib/wundertuete/kiKarte.ts", "utf8");
    expect(lib).toContain("tidyMiaText(");
    expect(lib).not.toMatch(/claude-/);
  });
});
