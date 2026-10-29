// A-064: Rätsel als vierte Sorte der Wundertüte – die Kachel wechselt die
// Sorten der Reihe nach (Witz · Platt · Wissen · Rätsel), nie doppelt, der
// Filter „Rätsel“ zieht nur Rätsel aus ihrem eigenen Vorrat (Paket 001).
import { describe, expect, it } from "vitest";
import { LEER, type Lage, type WtStand } from "@/lib/wundertuete/auswahl";
import { RT_LEER, RT_POOL, type RtStand } from "@/lib/raetsel/auswahl";
import { karteMix, naechsteMix, tageskarteMix, type Beide } from "@/lib/wundertuete/mischung";
import { WT_POOL } from "@/lib/wundertuete/pool";
import { FILTER, SORTE_IDS } from "@/lib/wundertuete/sorten";

const LAGE: Lage = { heute: "2027-03-09", minuten: 600, haushalt: "familie", wetter: null, gericht: null, feiertag: null };
const leer = (): Beide => ({ wt: LEER, rt: RT_LEER });

describe("Wundertüte mit Rätseln (A-064)", () => {
  it("vier Sorten, Filter Alles · Witze · Platt · Wissen · Rätsel", () => {
    expect(SORTE_IDS).toEqual(["witz", "platt", "angeberwissen", "raetsel"]);
    expect(FILTER.map((f) => f.label)).toEqual(["Alles", "Witze", "Platt", "Wissen", "Rätsel"]);
  });

  it("die Kachel wechselt die Sorten der Reihe nach – nie zweimal dieselbe hintereinander, nie doppelt", () => {
    let b = leer();
    const sorten: string[] = [];
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) {
      const r = naechsteMix(b, LAGE);
      b = r.beide;
      sorten.push(r.karte!.sorte);
      ids.push(r.karte!.id);
    }
    expect(sorten.slice(0, 8)).toEqual(["witz", "platt", "angeberwissen", "raetsel", "witz", "platt", "angeberwissen", "raetsel"]);
    expect(new Set(ids).size).toBe(ids.length);
    // Rätsel landen im Rätsel-Vorrat als gesehen, der Rest in der Wundertüte
    expect(b.rt.gesehen.length + b.wt.gesehen.length).toBe(12);
    expect(b.rt.gesehen.length).toBe(sorten.filter((s) => s === "raetsel").length);
    expect(b.rt.gesehen.every((id) => RT_POOL.byId.has(id))).toBe(true);
  });

  it("Rätsel ist die aktuelle Karte: Kachel und Seite finden sie (aus dem Rätsel-Vorrat)", () => {
    const r = naechsteMix(leer(), LAGE, "raetsel");
    expect(r.karte?.sorte).toBe("raetsel");
    expect(r.beide.wt.aktuell).toMatchObject({ id: r.karte!.id, raetsel: true, tag: LAGE.heute });
    expect(karteMix(r.beide)?.vorne).toBe(r.karte!.vorne);
    expect(karteMix(r.beide)?.hinten).toMatch(/\*\*.+\*\*/);
  });

  it("Filter „Rätsel“ zieht nur Rätsel, alle Rätsel gesehen → „Neue Rätsel kommen bald.“ (karte null), nie eine Wiederholung", () => {
    const alle: RtStand = { ...RT_LEER, gesehen: RT_POOL.karten.map((x) => x.id) };
    const r = naechsteMix({ wt: LEER, rt: alle }, LAGE, "raetsel");
    expect(r.karte).toBeNull();
    expect(r.beide.wt.aktuell).toBeNull();
    // Im Filter „Alles“ fallen die Rätsel dann still aus der Reihe
    let b: Beide = { wt: LEER, rt: alle };
    for (let i = 0; i < 6; i++) {
      const n = naechsteMix(b, LAGE);
      expect(n.karte?.sorte).not.toBe("raetsel");
      b = n.beide;
    }
  });

  it("Filter einer Wundertüten-Sorte bleibt bei ihr", () => {
    let b = leer();
    for (let i = 0; i < 4; i++) {
      const r = naechsteMix(b, LAGE, "platt");
      expect(r.karte?.sorte).toBe("platt");
      b = r.beide;
    }
  });

  it("Karte des Tages: am selben Tag bleibt sie, am nächsten Tag die nächste Sorte", () => {
    const a = tageskarteMix(leer(), LAGE);
    expect(tageskarteMix(a, LAGE)).toBe(a);
    const morgen = tageskarteMix(a, { ...LAGE, heute: "2027-03-10" });
    expect(karteMix(morgen)?.sorte).not.toBe(karteMix(a)?.sorte);
  });

  it("alles gesehen (Pakete und Rätsel): „kommt bald“ bleibt stehen, nichts zu speichern", () => {
    const wt: WtStand = { ...LEER, gesehen: WT_POOL.karten.map((x) => x.id) };
    const rt: RtStand = { ...RT_LEER, gesehen: RT_POOL.karten.map((x) => x.id) };
    const b = { wt, rt };
    expect(tageskarteMix(b, LAGE)).toBe(b);
  });

  it("alte Stände ohne `raetsel` am aktuellen Eintrag bleiben gültig (Wundertüte v2)", async () => {
    const { migrateWt } = await import("@/lib/wundertuete/auswahl");
    expect(migrateWt({ version: 2, aktuell: { id: "wi-001", tag: "2027-03-09" }, gesehen: ["wi-001"], eigene: [] })?.aktuell).toEqual({ id: "wi-001", tag: "2027-03-09" });
    expect(migrateWt({ version: 2, aktuell: { id: "ra-001", tag: "2027-03-09", raetsel: true }, gesehen: [], eigene: [] })?.aktuell).toEqual({ id: "ra-001", tag: "2027-03-09", raetsel: true });
  });
});
