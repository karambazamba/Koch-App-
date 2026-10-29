// Wundertüte und Rätsel (A-052): „Noch eine ›“ / „Noch eins ›“ beliebig oft,
// nie doppelt – 1.000-mal hintereinander, nachgeliefert über die Mock-KI;
// Filter; Paket 2 schließt nahtlos an; ohne Vorrat „… kommt bald.“ statt
// Wiederholung; KI nur für Witze und Rätsel; Karte des Tages auf der Kachel;
// Schwelle „Paket nötig“; Migration der alten Wundertüte.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEER, PAKET_NOETIG_AB, brauchtWitze, karteVon, migrateWt, naechste, tageskarte, uebrigAusPaketen, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { RT_LEER, RT_POOL, brauchtRaetsel, hatUngesehenes, loesen, migrateRaetsel, naechstesRaetsel, oeffnen, raetselStart, raetselVon, type RtStand } from "@/lib/raetsel/auswahl";
import { WT_POOL, POOL, eintraegeDer } from "@/lib/wundertuete/pool";
import { SORTEN } from "@/lib/wundertuete/sorten";
import { nachlegen, poolAus, ziehe, VORRAT_ZIEL, type KiHolen, type Karte } from "@/lib/wundertuete/vorrat";

const LAGE: Lage = { heute: "2027-03-09", minuten: 600, haushalt: "familie", wetter: null, gericht: null, feiertag: null };

/** Mock-KI: liefert je Anfrage 5 neue, zufällige (also unähnliche) Karten */
function mockKi(seed = 7) {
  let s = seed;
  const zufall = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const wort = () => Array.from({ length: 6 + Math.floor(zufall() * 5) }, () => "bcdfghklmnprstvwz"[Math.floor(zufall() * 17)] + "aeiou"[Math.floor(zufall() * 5)]).join("");
  const arten: string[] = [];
  const holen: KiHolen = async ({ art }) => (arten.push(art), Array.from({ length: 5 }, () => ({ vorne: `${wort()} ${wort()} ${wort()}?`, hinten: art === "raetsel" ? `Die **${wort()}**.` : `${wort()} ${wort()}.` })));
  return { holen, arten };
}
let n = 0;
const id = () => `ki-test-${++n}`;

describe("1.000× „Noch eine ›“ ohne Wiederholung", () => {
  it("Wundertüte (Alles): erst alle passenden Paket-Karten, dann Mias Witze – keine doppelt", async () => {
    const { holen, arten } = mockKi();
    let s: WtStand = LEER;
    const gezeigt: string[] = [];
    for (let i = 0; i < 1000; i++) {
      if (brauchtWitze(s)) s = { ...s, eigene: [...s.eigene, ...(await nachlegen(WT_POOL, s, "witz", holen, id))] };
      const r = naechste(s, LAGE);
      expect(r.karte, `Karte ${i}`).not.toBeNull();
      s = r.stand;
      gezeigt.push(r.karte!.id);
    }
    expect(new Set(gezeigt).size).toBe(1000);
    expect(s.gesehen).toEqual(gezeigt);
    // Paket-Karten zuerst (ohne die, deren Anlass heute nicht passt), dann nur noch Witze von Mia
    const ausPaketen = gezeigt.filter((x) => WT_POOL.byId.has(x)).length;
    expect(ausPaketen).toBeGreaterThan(250);
    expect(gezeigt.slice(ausPaketen).every((x) => x.startsWith("ki-"))).toBe(true);
    expect(new Set(arten)).toEqual(new Set(["witz"]));
  }, 30_000);

  it("Rätsel: 1.000× „Noch eins ›“, Paket zuerst, dann Mias Rätsel – keine doppelt", async () => {
    const { holen, arten } = mockKi(42);
    let s: RtStand = RT_LEER;
    const gezeigt: string[] = [];
    for (let i = 0; i < 1000; i++) {
      if (brauchtRaetsel(s)) s = { ...s, eigene: [...s.eigene, ...(await nachlegen(RT_POOL, s, "raetsel", holen, id))] };
      const r = naechstesRaetsel(s);
      expect(r.raetsel, `Rätsel ${i}`).not.toBeNull();
      s = r.stand;
      gezeigt.push(r.raetsel!.id);
    }
    expect(new Set(gezeigt).size).toBe(1000);
    expect(gezeigt.slice(0, RT_POOL.karten.length)).toEqual(RT_POOL.karten.map((x) => x.id));
    expect(new Set(arten)).toEqual(new Set(["raetsel"]));
  }, 30_000);

  it("der Vorrat steht 20 im Voraus: nachgelegt wird, sobald weniger ungesehen sind", async () => {
    const alleBisAufWenige: WtStand = { ...LEER, gesehen: eintraegeDer("witz").slice(0, -(VORRAT_ZIEL - 1)).map((x) => x.id) };
    expect(brauchtWitze(alleBisAufWenige)).toBe(true);
    expect(brauchtWitze(LEER)).toBe(false);
  });
});

describe("Filter Alles · Witze · Plattdeutsch · Angeberwissen", () => {
  it("jeder Filter bringt nur seine Sorte, Alles wechselt die Sorte", () => {
    for (const f of ["witz", "platt", "angeberwissen"] as const) {
      let s = LEER;
      for (let i = 0; i < 25; i++) {
        const r = naechste(s, LAGE, f);
        expect(r.karte?.sorte).toBe(f);
        s = r.stand;
      }
    }
    let s = LEER;
    const sorten: string[] = [];
    for (let i = 0; i < 30; i++) {
      const r = naechste(s, LAGE);
      s = r.stand;
      sorten.push(r.karte!.sorte);
    }
    for (let i = 1; i < sorten.length; i++) expect(sorten[i]).not.toBe(sorten[i - 1]);
    // im Verhältnis des Pakets gemischt: auch die kleine Witz-Sorte ist früh dabei
    expect(sorten.filter((x) => x === "witz").length).toBeGreaterThanOrEqual(2);
    expect(sorten.filter((x) => x === "angeberwissen").length).toBeGreaterThan(sorten.filter((x) => x === "witz").length);
  });

  it("Sorte durch: „kommt bald“ (karte null, keine alte Karte bleibt stehen), die anderen Sorten gehen weiter", () => {
    const s: WtStand = { ...LEER, aktuell: { id: "pl-001", tag: LAGE.heute }, gesehen: eintraegeDer("platt").map((x) => x.id) };
    const r = naechste(s, LAGE, "platt");
    expect(r.karte).toBeNull();
    expect(r.stand.aktuell).toBeNull();
    expect(naechste(s, LAGE, "witz").karte?.sorte).toBe("witz");
  });
});

describe("Pakete der Reihe nach", () => {
  const k = (id: string, sorte: string): Karte => ({ id, sorte, vorne: `Karte ${id}`, hinten: "x" });
  const pool = poolAus([{ paket: 2, eintraege: [k("b1", "a"), k("b2", "b")] }, { paket: 1, eintraege: [k("a1", "a"), k("a2", "b"), k("a3", "a")] }]);

  it("Paket 2 schließt nahtlos an Paket 1 an, Mias Karten danach", () => {
    let s = { gesehen: [] as string[], eigene: [k("ki-1", "a")] };
    const folge: string[] = [];
    for (let i = 0; i < 6; i++) {
      const x = ziehe(pool, s, { vorher: folge.at(-1) })!;
      folge.push(x.id);
      s = { ...s, gesehen: [...s.gesehen, x.id] };
    }
    expect(folge.slice(0, 3).sort()).toEqual(["a1", "a2", "a3"]);
    expect(folge.slice(3, 5).sort()).toEqual(["b1", "b2"]);
    expect(folge[5]).toBe("ki-1");
    expect(ziehe(pool, s)).toBeNull();
  });

  it("gleicher Stand = gleiche Karte (jedes Gerät im Haushalt zieht dieselbe)", () => {
    expect(naechste(LEER, LAGE).karte!.id).toBe(naechste(structuredClone(LEER), { ...LAGE }).karte!.id);
  });
});

describe("Kachel: Karte des Tages", () => {
  it("am selben Tag bleibt sie, an einem neuen Tag kommt die nächste; alles gesehen = „kommt bald“", () => {
    const s = tageskarte(LEER, LAGE);
    expect(tageskarte(s, { ...LAGE, minuten: 1200 })).toBe(s);
    const morgen = tageskarte(s, { ...LAGE, heute: "2027-03-10" });
    expect(morgen.aktuell!.id).not.toBe(s.aktuell!.id);
    const alles: WtStand = { ...LEER, gesehen: POOL.map((x) => x.id) };
    const leer = tageskarte(alles, LAGE);
    expect(leer.aktuell).toBeNull();
    expect(tageskarte(leer, LAGE)).toBe(leer);
  });

  it("„Schietwedder“ nur an Regentagen, dann zuerst", () => {
    expect(naechste(LEER, { ...LAGE, wetter: "regen" }).karte?.anlass?.wetter).toBe("regen");
    let s = LEER;
    for (let i = 0; i < 300; i++) s = naechste(s, LAGE).stand;
    expect(s.gesehen).not.toContain("pl-002");
  });
});

describe("Rätsel-Fenster (rein)", () => {
  it("Öffnen: ungelöstes bleibt, gelöstes → das nächste; Lösung erst nach Antippen; ungesehene da (intern, kein Schild)", () => {
    const a = oeffnen(RT_LEER);
    expect(a.aktuell).toMatchObject({ geloest: false });
    expect(oeffnen(a)).toBe(a);
    const b = loesen(a);
    expect(b.aktuell!.geloest).toBe(true);
    const c = oeffnen(b);
    expect(c.aktuell!.id).not.toBe(a.aktuell!.id);
    expect(raetselVon(c, c.aktuell!.id)?.vorne).toBeTruthy();
    expect(hatUngesehenes(c)).toBe(true);
    const alle: RtStand = { ...RT_LEER, gesehen: RT_POOL.karten.map((x) => x.id) };
    expect(hatUngesehenes(alle)).toBe(false);
    expect(naechstesRaetsel(alle).raetsel).toBeNull();
    expect(oeffnen(alle)).toBe(alle);
  });

  it("Fenster: Kopf, Frage 27 px, Lösung im gestrichelten Kasten erst nach Antippen, „Noch eins ›“, „Neue Rätsel kommen bald.“", () => {
    const code = readFileSync("src/components/raetsel/RaetselFenster.tsx", "utf8");
    expect(code).toContain("Kinder raten zuerst");
    expect(code).toContain("text-[27px]");
    expect(code).toMatch(/\{geloest && raetsel\.hinten && \(/);
    expect(code).toContain("border-dashed");
    expect(code).toContain("Noch eins");
    expect(code).toContain("Antippen zeigt die Lösung · nie doppelt");
    expect(code).toContain('"Neue Rätsel kommen bald."');
    expect(code).toContain("<Sheet");
  });
});

describe("KI nur für Witze und Rätsel, Schwelle „Paket nötig“", () => {
  it("nur Witze dürfen per KI nachgelegt werden (Platt und Angeberwissen nur geprüft)", () => {
    expect(SORTEN.filter((s) => s.ki).map((s) => s.id)).toEqual(["witz"]);
    const store = readFileSync("src/lib/wundertuete/store.ts", "utf8");
    expect(store).toContain('nachschub("wundertuete", "witz", WT_POOL');
    expect(readFileSync("src/lib/raetsel/store.ts", "utf8")).toContain('nachschub("raetsel", "raetsel", RT_POOL');
  });

  it("unter 50 ungesehenen Platt bzw. Angeberwissen: „Paket nötig“ im Entwickler-Bereich", () => {
    expect(PAKET_NOETIG_AB).toBe(50);
    const platt = eintraegeDer("platt").map((x) => x.id);
    expect(uebrigAusPaketen({ gesehen: platt.slice(0, -49) }, "platt")).toBe(49);
    expect(uebrigAusPaketen(LEER, "angeberwissen")).toBe(eintraegeDer("angeberwissen").length);
    const view = readFileSync("src/components/wundertuete/WundertueteNachschub.tsx", "utf8");
    expect(view).toContain("{name}: Paket nötig ({n} übrig)");
    expect(readFileSync("src/components/einstellungen/settings/AdminView.tsx", "utf8")).toContain("<WundertueteNachschub />");
  });
});

describe("Speicher", () => {
  it("Wundertüte v1 → v2: alles Gezeigte (auch Rätsel, Tischrunde) und die damalige Karte gelten als gesehen", () => {
    const v1 = { version: 1, karte: "aw-003", anzeigen: 2, zuletzt: 5, gezeigt: { angeberwissen: ["aw-001"], raetsel: ["ra-004"], tischrunde: ["ti-001"], platt: ["pl-001", 7] } };
    const v2 = migrateWt(v1)!;
    expect(v2).toEqual({ version: 2, aktuell: null, gesehen: ["aw-001", "ra-004", "ti-001", "pl-001", "aw-003"], eigene: [] });
    // Danach kommt keine davon wieder
    let s = v2;
    for (let i = 0; i < 50; i++) s = naechste(s, LAGE).stand;
    expect(new Set(s.gesehen).size).toBe(s.gesehen.length);
    // Rätsel: der neue Bereich übernimmt die schon gezeigten
    expect(raetselStart(v2.gesehen).gesehen).toEqual(["ra-004"]);
  });

  it("v2 bzw. Rätsel v1 prüfen: unbekannte IDs bleiben, Kaputtes fällt weg, eigene Karten nur der KI-Sorte", () => {
    expect(migrateWt(null)).toBeNull();
    expect(migrateWt({ version: 3 })).toBeNull();
    const m = migrateWt({ version: 2, aktuell: { id: "aw-009", tag: "2027-01-02" }, gesehen: ["aw-009", "aw-009", "neu-777", 5], eigene: [{ id: "ki-a", sorte: "witz", vorne: "Ein Witz.", hinten: "Pointe." }, { id: "ki-b", sorte: "platt", vorne: "Erfunden" }], ki: { tag: "2027-01-02", n: 2 } });
    expect(m).toEqual({ version: 2, aktuell: { id: "aw-009", tag: "2027-01-02" }, gesehen: ["aw-009", "neu-777"], eigene: [{ id: "ki-a", sorte: "witz", vorne: "Ein Witz.", hinten: "Pointe." }], ki: { tag: "2027-01-02", n: 2 } });
    expect(karteVon(m!, "ki-a")?.vorne).toBe("Ein Witz.");
    expect(migrateRaetsel({ version: 1, aktuell: { id: "ra-001", geloest: 1 }, gesehen: ["ra-001"], eigene: [{ id: "ki-r", sorte: "raetsel", vorne: "Frage?", hinten: "Die **Antwort**." }] })).toEqual({ version: 1, aktuell: { id: "ra-001", geloest: false }, gesehen: ["ra-001"], eigene: [{ id: "ki-r", sorte: "raetsel", vorne: "Frage?", hinten: "Die **Antwort**." }] });
  });

  it("beide im Speicher-Verzeichnis, mit Sicherung", async () => {
    const { STORAGE, BACKUP_KEYS } = await import("@/lib/core/storage");
    expect(STORAGE.find((s) => s.key === "wasgibts.wundertuete")).toMatchObject({ version: 2, area: "local", backup: true });
    expect(STORAGE.find((s) => s.key === "wasgibts.raetsel")).toMatchObject({ version: 1, area: "local", backup: true });
    expect(BACKUP_KEYS).toEqual(expect.arrayContaining(["wasgibts.wundertuete", "wasgibts.raetsel"]));
  });
});
