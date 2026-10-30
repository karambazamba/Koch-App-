// Wundertüte und Rätsel (A-049/A-052): Inhalte als Pakete unter
// `content/wundertuete/` und `content/raetsel/` – lückenlos nummeriert, je
// höchstens 500, gültige Felder, jede Datei eingebunden, IDs eindeutig und
// stabil (die bisherigen IDs der alten Wundertüte sind alle noch da).
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PAKETE, PAKET_GROESSE } from "@/lib/wundertuete/pakete";
import { RAETSEL_PAKETE, PAKET_GROESSE as RT_GROESSE } from "@/lib/raetsel/pakete";
import { POOL } from "@/lib/wundertuete/pool";
import { RT_POOL } from "@/lib/raetsel/auswahl";
import { SORTE_IDS } from "@/lib/wundertuete/sorten";

const dateien = (dir: string) => readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
const nummern = (list: string[]) => list.map((_, i) => `paket-${String(i + 1).padStart(3, "0")}.json`);

describe("Pakete", () => {
  for (const [dir, pakete, groesse] of [["content/wundertuete", PAKETE, PAKET_GROESSE], ["content/raetsel", RAETSEL_PAKETE, RT_GROESSE]] as const) {
    it(`${dir}: paket-001.json … lückenlos, alle eingebunden, je höchstens 500 (Paket 001 ist der Grundstock und darf kleiner sein)`, () => {
      const files = dateien(dir);
      expect(files).toEqual(nummern(files));
      expect(pakete.map((p) => p.paket)).toEqual(files.map((_, i) => i + 1));
      for (const [i, f] of files.entries()) expect(JSON.parse(readFileSync(`${dir}/${f}`, "utf8"))).toEqual(pakete[i]);
      expect(groesse).toBe(500);
      for (const p of pakete) expect(p.eintraege.length, `Paket ${p.paket}`).toBeLessThanOrEqual(500);
      for (const p of pakete.slice(1, -1)) expect(p.eintraege, `Paket ${p.paket}`).toHaveLength(500);
    });
  }

  it("Felder gültig: Wundertüte {id, sorte, vorne, hinten, quelle?, anlass?}, Rätsel {id, frage, loesung}", () => {
    const WT = new Set(["id", "sorte", "vorne", "hinten", "quelle", "anlass"]);
    for (const x of POOL) {
      expect(Object.keys(x).every((k) => WT.has(k)), x.id).toBe(true);
      expect(SORTE_IDS, x.id).toContain(x.sorte);
      expect(typeof x.hinten, x.id).toBe("string");
    }
    for (const r of RAETSEL_PAKETE.flatMap((p) => p.eintraege)) expect(Object.keys(r).sort(), r.id).toEqual(["frage", "id", "loesung"]);
  });

  it("IDs stabil: alle bisherigen Angeberwissen-, Schätz-, Platt- und Rätsel-IDs sind noch da", () => {
    const wt = new Set(POOL.map((x) => x.id));
    const rt = new Set(RT_POOL.karten.map((x) => x.id));
    const reihe = (vor: string, n: number) => Array.from({ length: n }, (_, i) => `${vor}-${String(i + 1).padStart(3, "0")}`);
    expect([...reihe("aw", 145), ...reihe("pl", 90), ...reihe("sm", 35)].filter((id) => !wt.has(id))).toEqual([]);
    expect(reihe("ra", 55).filter((id) => !rt.has(id))).toEqual([]);
    expect([...wt].filter((id) => rt.has(id))).toEqual([]);
  });
});
