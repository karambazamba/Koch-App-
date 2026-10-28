import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { POT_TEXTS, activePot, askDue, askLater, canVote, potPhase, potTotal, projectVotes, projectsFor, regionForPlace, searchRegions, voteDaysLeft } from "@/lib/spendentopf/model";
import { REGIONS } from "@/lib/spendentopf/regions";
import { migratePot } from "@/lib/spendentopf/store";
import { migrateHome } from "@/lib/core/homeLayout";

describe("Spendentopf: Region aus Wohnort/PLZ", () => {
  it("Hamburger PLZ → Hamburg-Nord, noch kein Topf; Eutin → Ostholstein", () => {
    const hh = regionForPlace("22301 Hamburg");
    expect(hh?.id).toBe("hamburg-nord");
    expect(activePot(hh, null)).toBeNull();
    expect(regionForPlace("Eutin")?.id).toBe("ostholstein");
    expect(regionForPlace("23701")?.id).toBe("ostholstein");
    expect(regionForPlace("Lübeck")?.id).toBe("luebeck");
    expect(regionForPlace("Timbuktu")).toBeNull();
  });
  it("ohne Topf: „Ostholstein unterstützen“ macht Ostholstein zum Topf", () => {
    expect(activePot(regionForPlace("Hamburg"), "ostholstein")?.id).toBe("ostholstein");
  });
  it("Suche nach Ort oder PLZ, aktive zuerst", () => {
    expect(searchRegions("")[0].status).toBe("aktiv");
    expect(searchRegions("2230").map((r) => r.id)).toContain("hamburg-nord");
    expect(searchRegions("Malente").map((r) => r.id)).toEqual(["ostholstein"]);
  });
  it("weitere Regionen nur über Datensätze: jede hat Name, PLZ und gültigen Status", () => {
    for (const r of REGIONS) {
      expect(r.name.length).toBeGreaterThan(1);
      expect(["aktiv", "bald", "sucht_paten"]).toContain(r.status);
      expect(r.plz_list.length).toBeGreaterThan(0);
    }
  });
});

describe("Spendentopf: Zeitplan und Abstimmung", () => {
  it("Vorschlagen 1.–14.11., Abstimmen 15.–30.11., Übergabe bis 12.12.", () => {
    expect(potPhase("2026-10-21")).toBe("ruhe");
    expect(potPhase("2026-11-03")).toBe("vorschlagen");
    expect(potPhase("2026-11-15")).toBe("abstimmen");
    expect(potPhase("2026-11-30")).toBe("abstimmen");
    expect(potPhase("2026-12-05")).toBe("uebergabe");
    expect(voteDaysLeft("2026-11-28")).toBe(3);
    expect(voteDaysLeft("2026-10-21")).toBeNull();
  });
  it("eine Familie aus Eutin kann im November abstimmen, eine Stimme zählt", () => {
    const pot = activePot(regionForPlace("Eutin"), null);
    const projects = projectsFor("ostholstein", 2026);
    expect(projects).toHaveLength(3);
    expect(canVote("2026-11-20", pot, projects[1].id)).toBe(true);
    expect(canVote("2026-10-21", pot, projects[1].id)).toBe(false);
    const votes = projectVotes(projects, projects[1].id);
    expect(votes.find((v) => v.mine)?.votes).toBe(projects[1].stimmen + 1);
    expect(votes.filter((v) => v.mine)).toHaveLength(1);
  });
  it("Beispiel: Ostholstein mit 2.344 €, zugesagter Beitrag lässt den Betrag steigen", () => {
    const oh = regionForPlace("Eutin")!;
    expect(oh.beispiel).toBe(true);
    expect(potTotal(oh, null)).toBe(2344);
    expect(potTotal(oh, 4)).toBe(2348);
  });
});

describe("Spendentopf: Beitrags-Frage", () => {
  const fresh = { since: "2026-10-01", asked: 0, next: null, done: false };
  it("kommt nach 4 Wochen, „Später“ = 4 Wochen später, höchstens 3×", () => {
    expect(askDue(fresh, "2026-10-21", false)).toBe(false);
    expect(askDue(fresh, "2026-10-29", false)).toBe(true);
    let a = askLater(fresh, "2026-10-29");
    expect(askDue(a, "2026-11-20", false)).toBe(false);
    expect(askDue(a, "2026-11-26", false)).toBe(true);
    a = askLater(askLater(a, "2026-11-26"), "2026-12-24");
    expect(a.asked).toBe(3);
    expect(askDue(a, "2027-06-01", false)).toBe(false);
  });
  it("nach einer Zusage nicht mehr; Zusage ist nur „zugesagt“", () => {
    expect(askDue(fresh, "2026-11-01", true)).toBe(false);
    const s = migratePot({ version: 1, pledge: { betrag: 4, monat: "2026-10", status: "bezahlt" } });
    expect(s?.pledge).toEqual({ betrag: 4, art: "monatlich", monat: "2026-10", status: "zugesagt" });
  });
});

describe("Spendentopf: feste Texte", () => {
  it("immer „100 % für Projekte in deiner Region“, nie „an KARAMBA“", () => {
    expect(POT_TEXTS.share).toBe("100 % für Projekte in deiner Region");
    expect(POT_TEXTS.free).toBe("Die App ist kostenlos. KARAMBA Eis zahlt Server & KI. Kein Abo, keine Daten verkauft.");
    const dir = join(__dirname, "../../src/components/spendentopf");
    const all = readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8")).join("\n") + readFileSync(join(__dirname, "../../src/lib/spendentopf/model.ts"), "utf8");
    // nur Texte (in Anführungszeichen), keine Kommentare
    expect(all).not.toMatch(/["'`][^"'`\n]*\ban KARAMBA/i);
  });
});

describe("Startseite: Spendentopf-Kachel standardmäßig an", () => {
  it("v3 → v4: hinten an die sichtbaren Kacheln, die übrige Anordnung bleibt", () => {
    const v3 = { version: 3, tipSeen: true, tiles: [{ id: "termine", visible: true, size: "M" }, { id: "essen", visible: true, size: "S" }, { id: "einkauf", visible: true, size: "S" }] };
    const m = migrateHome(v3)!;
    const shown = m.tiles.filter((t) => t.visible).map((t) => t.id);
    expect(m.version).toBe(9);
    expect(shown).toEqual(["termine", "essen", "einkauf", "spendentopf", "notizen"]);
    // Wer sie entfernt hat (v5), behält das
    const v4 = migrateHome({ ...m, tiles: m.tiles.map((t) => (t.id === "spendentopf" ? { ...t, visible: false } : t)) })!;
    expect(v4.tiles.find((t) => t.id === "spendentopf")?.visible).toBe(false);
  });
});
