// Mias Wundertüte (A-022): Wechsel – Sorte nie zweimal hintereinander, keine
// Wiederholung bis die Sorte durch ist, nach 3 Anzeigen weiter, Antippen
// (umdrehen / nächste), Tageszeit und Haushalt, Passendes zuerst (Regen,
// Gericht, Heute vor 100 Jahren), Speicher-Migration.
import { describe, expect, it } from "vitest";
import { ANZEIGE_PAUSE_MS, LEER, anzeigen, erlaubteSorten, karteGilt, migrateWt, naechste, passt, tippAktion, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { eintraegeDer, eintragVon } from "@/lib/wundertuete/pool";
import { lageAus, wetterHeute } from "@/lib/wundertuete/lage";
import type { Sorte } from "@/lib/wundertuete/sorten";
import type { Forecast } from "@/lib/wetter/forecast";

/** Fester Zufall (für wiederholbare Tests) */
const zufall = (seed = 7) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const TAG: Lage = { heute: "2026-10-20", minuten: 10 * 60, haushalt: "familie", wetter: null, gericht: null, feiertag: null };
const sorteVon = (s: WtStand) => eintragVon(s.karte)!.sorte;
const T0 = 1_800_000_000_000;

function lauf(lage: Lage, n: number, rng = zufall()) {
  let s = LEER;
  const karten: string[] = [];
  for (let i = 0; i < n; i++) {
    s = naechste(s, lage, T0 + i, rng);
    karten.push(s.karte!);
  }
  return karten;
}

describe("Wechsel ohne Wiederholung", () => {
  it("nie zweimal dieselbe Sorte hintereinander", () => {
    const sorten = lauf(TAG, 300).map((id) => eintragVon(id)!.sorte);
    for (let i = 1; i < sorten.length; i++) expect(sorten[i], `Karte ${i}`).not.toBe(sorten[i - 1]);
    expect(new Set(sorten)).toEqual(new Set(["angeberwissen", "platt", "raetsel"]));
  });

  it("jede Karte einer Sorte erst wieder, wenn alle durch sind – dann neu gemischt", () => {
    const karten = lauf(TAG, 400);
    for (const sorte of ["angeberwissen", "platt", "raetsel"] as Sorte[]) {
      const passend = eintraegeDer(sorte).filter((x) => passt(x, TAG)).length;
      const folge = karten.filter((id) => eintragVon(id)!.sorte === sorte);
      expect(new Set(folge.slice(0, passend)).size, sorte).toBe(Math.min(passend, folge.length));
      // Nach dem Durchlauf geht es weiter (neu gemischt), nie sofort dieselbe Karte
      for (let i = 1; i < folge.length; i++) expect(folge[i]).not.toBe(folge[i - 1]);
    }
  });

  it("Wochen ohne Wiederholung: tagsüber die ersten 200 Karten alle verschieden, abends die ersten 100", () => {
    for (const seed of [1, 7, 42]) {
      expect(new Set(lauf(TAG, 200, zufall(seed))).size).toBe(200);
      expect(new Set(lauf({ ...TAG, minuten: 18 * 60 }, 100, zufall(seed))).size).toBe(100);
    }
  });
});

describe("Anzeigen und Antippen", () => {
  it("nach 3 Anzeigen (je Öffnung, höchstens eine je halbe Stunde) kommt von selbst die nächste", () => {
    const rng = zufall(3);
    let s = anzeigen(LEER, TAG, T0, rng);
    const erste = s.karte;
    expect(s.anzeigen).toBe(1);
    // gleich wieder geöffnet: zählt nicht
    expect(anzeigen(s, TAG, T0 + 60_000, rng)).toBe(s);
    s = anzeigen(s, TAG, T0 + ANZEIGE_PAUSE_MS, rng);
    expect([s.karte, s.anzeigen]).toEqual([erste, 2]);
    s = anzeigen(s, TAG, T0 + 2 * ANZEIGE_PAUSE_MS, rng);
    expect([s.karte, s.anzeigen]).toEqual([erste, 3]);
    s = anzeigen(s, TAG, T0 + 3 * ANZEIGE_PAUSE_MS, rng);
    expect(s.karte).not.toBe(erste);
    expect(s.anzeigen).toBe(1);
  });

  it("Antippen: vorne mit Rückseite umdrehen, hinten bzw. ohne Rückseite die nächste", () => {
    const wissen = eintraegeDer("angeberwissen")[0];
    const tisch = eintraegeDer("tischrunde")[0];
    const spiel = eintraegeDer("werzuerst")[0];
    expect(tippAktion("vorne", wissen)).toBe("umdrehen");
    expect(tippAktion("hinten", wissen)).toBe("weiter");
    expect(tippAktion("vorne", tisch)).toBe("weiter");
    expect(tippAktion("vorne", spiel)).toBe("weiter");
  });
});

describe("Tageszeit und Haushalt", () => {
  const abends: Lage = { ...TAG, minuten: 18 * 60 };
  it("tagsüber Wissen, Platt, Rätsel; ab 17 Uhr zu zweit/Familie Tischrunde, Schätz mal, Wer zuerst", () => {
    expect(erlaubteSorten(TAG)).toEqual(["angeberwissen", "platt", "raetsel"]);
    expect(erlaubteSorten(abends)).toEqual(["tischrunde", "schaetzmal", "werzuerst"]);
    expect(erlaubteSorten({ ...abends, haushalt: "paar" })).toEqual(["tischrunde", "schaetzmal", "werzuerst"]);
    expect(erlaubteSorten({ ...abends, minuten: 16 * 60 + 59 })).toEqual(["angeberwissen", "platt", "raetsel"]);
  });

  it("allein abends weiter Wissen, Platt, Rätsel", () => {
    expect(erlaubteSorten({ ...abends, haushalt: "allein" })).toEqual(["angeberwissen", "platt", "raetsel"]);
    const sorten = new Set(lauf({ ...abends, haushalt: "allein" }, 30).map((id) => eintragVon(id)!.sorte));
    expect(sorten.has("tischrunde") || sorten.has("schaetzmal") || sorten.has("werzuerst")).toBe(false);
  });

  it("wird es Abend, wechselt die Tageskarte beim nächsten Anzeigen zu einer Abend-Sorte", () => {
    const s = naechste(LEER, TAG, T0, zufall());
    expect(karteGilt(s.karte, abends)).toBe(false);
    const abend = anzeigen(s, abends, T0 + 1000, zufall());
    expect(["tischrunde", "schaetzmal", "werzuerst"]).toContain(sorteVon(abend));
  });
});

describe("Passendes zuerst", () => {
  it("Regen: zuerst ein Regen-Inhalt; „Schietwedder“ nur an Regentagen", () => {
    const regen: Lage = { ...TAG, wetter: "regen" };
    const erste = eintragVon(naechste(LEER, regen, T0, zufall()).karte)!;
    expect(erste.anlass?.wetter).toBe("regen");
    expect(lauf(regen, 60)).toContain("pl-002");
    expect(lauf(TAG, 400)).not.toContain("pl-002");
    expect(lauf({ ...TAG, wetter: "sonne" }, 400)).not.toContain("pl-002");
  });

  it("Gericht des Tages: passende Karte zuerst, sonst nie", () => {
    const nudeln: Lage = { ...TAG, gericht: "Spaghetti Bolognese" };
    // Mit anderen Anlässen des Tages (Herbst, Dienstag) zusammen vorn
    expect(lauf(nudeln, 8)).toContain("aw-115");
    expect(lauf({ ...nudeln, minuten: 18 * 60 }, 6)).toEqual(expect.arrayContaining(["sm-001", "ti-078"]));
    expect(lauf(TAG, 400)).not.toContain("aw-115");
  });

  it("Heute vor 100 Jahren: nur am belegten Tag (im Jahr + 100), dann zuerst", () => {
    const baird: Lage = { ...TAG, heute: "2026-01-26" };
    expect(erlaubteSorten(baird)).toContain("heute100");
    expect(naechste(LEER, baird, T0, zufall()).karte).toBe("h1-002");
    expect(erlaubteSorten({ ...baird, heute: "2027-01-26" })).not.toContain("heute100");
    expect(erlaubteSorten(TAG)).not.toContain("heute100");
  });

  it("Wetter aus der Vorhersage: Regen, Niesel, Schauer = Regen; Sonne; sonst nichts", () => {
    const f = (code: number, raining = false) => ({ place: "Eutin", fetchedAt: "", current: { temp: 10, code, raining }, hours: [], days: [{ date: TAG.heute, code, text: "", max: 12, min: 5, rain: 0, mm: 0, sun: 0, wet: 0 }] }) as Forecast;
    expect(wetterHeute(f(61), TAG.heute)).toBe("regen");
    expect(wetterHeute(f(53), TAG.heute)).toBe("regen");
    expect(wetterHeute(f(3, true), TAG.heute)).toBe("regen");
    expect(wetterHeute(f(0), TAG.heute)).toBe("sonne");
    expect(wetterHeute(f(3), TAG.heute)).toBeNull();
    expect(wetterHeute(null, TAG.heute)).toBeNull();
    expect(lageAus({ heute: "2027-01-01", minuten: 600, haushalt: "familie" }).feiertag).toBe("Neujahr");
  });
});

describe("Speicher (`wasgibts.wundertuete` v1)", () => {
  it("prüft gespeicherte Stände: Unbekanntes fällt still weg, nichts anderes geht verloren", () => {
    expect(migrateWt(null)).toBeNull();
    expect(migrateWt({ version: 2 })).toBeNull();
    const m = migrateWt({ version: 1, karte: "aw-003", anzeigen: 9, zuletzt: 5, gezeigt: { angeberwissen: ["aw-001", "xx-999", "pl-001"], platt: ["pl-001"], quatsch: ["aw-002"] } });
    expect(m).toEqual({ version: 1, karte: "aw-003", anzeigen: 3, zuletzt: 5, gezeigt: { angeberwissen: ["aw-001"], platt: ["pl-001"] } });
    expect(migrateWt({ version: 1, karte: "weg-001", anzeigen: 2 })).toMatchObject({ karte: null, anzeigen: 0 });
  });

  it("steht im Speicher-Verzeichnis, mit Sicherung", async () => {
    const { STORAGE, BACKUP_KEYS } = await import("@/lib/core/storage");
    expect(STORAGE.find((s) => s.key === "wasgibts.wundertuete")).toMatchObject({ version: 1, area: "local", backup: true });
    expect(BACKUP_KEYS).toContain("wasgibts.wundertuete");
  });
});
