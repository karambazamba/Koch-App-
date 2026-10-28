// Prüfstand im Browser (Fehler „Load failed“: 20 Sätze in einem Aufruf
// dauerten länger, als Vercel erlaubt): kleine Häppchen, einmal still
// nochmal, Server-Fehler zählen als „Fehler beim Aufruf“ und es geht weiter,
// Verbindungsabbruch hält an und „Weiter“ macht genau dort weiter.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { PRUEF_BATCH, fehlerText, laufQuote, pruefLauf, type Abruf } from "@/lib/begleitung/pruefstand/lauf";
import type { PruefSatz } from "@/lib/begleitung/pruefstand/saetze";

const saetze: PruefSatz[] = Array.from({ length: 10 }, (_, i) => ({ text: `Satz ${i + 1}`, ops: i % 2 ? ["add_shopping"] : [], ...(i === 3 ? { datum: "2026-10-22", zeit: "16:00" } : {}) }));
const gut = (von: number, bis: number) => saetze.slice(von, bis).map((s) => ({ text: s.text, ok: s.text !== "Satz 4", gruende: s.text === "Satz 4" ? ["Datum 2026-10-22 nicht getroffen (keins)"] : [], ms: 900, antwort: "Steht drin.", ops: ["upsert_entry"] }));

describe("pruefLauf", () => {
  it("kleine Häppchen (3 Sätze je Aufruf), alle der Reihe nach, Fortschritt nach jedem Aufruf", async () => {
    const abruf = vi.fn<Abruf>(async (von, bis) => ({ status: 200, results: gut(von, bis) }));
    const stand: number[] = [];
    const r = await pruefLauf(saetze, abruf, undefined, (s) => stand.push(s.results.length));
    expect(PRUEF_BATCH).toBe(3);
    expect(abruf.mock.calls).toEqual([[0, 3], [3, 6], [6, 9], [9, 10]]);
    expect(stand).toEqual([3, 6, 9, 10]);
    expect(r).toMatchObject({ von: 10, abbruch: null, zugang: false });
    expect(laufQuote(r.results)).toBe(90);
  });

  it("Fehler einmal still nochmal – dann geht es normal weiter", async () => {
    let n = 0;
    const abruf: Abruf = async (von, bis) => (von === 3 && n++ === 0 ? { status: 504 } : { status: 200, results: gut(von, bis) });
    const r = await pruefLauf(saetze, abruf);
    expect(r.results).toHaveLength(10);
    expect(r.results.filter((x) => x.gruende.includes("Fehler beim Aufruf"))).toEqual([]);
  });

  it("Server-Fehler zweimal: diese Sätze = „Fehler beim Aufruf“, der Lauf macht WEITER", async () => {
    const abruf: Abruf = async (von, bis) => (von === 3 ? { status: 504 } : { status: 200, results: gut(von, bis) });
    const r = await pruefLauf(saetze, abruf);
    expect(r.results).toHaveLength(10);
    expect(r.results.slice(3, 6).map((x) => [x.text, x.ok, x.gruende[0]])).toEqual([
      ["Satz 4", false, "Fehler beim Aufruf"],
      ["Satz 5", false, "Fehler beim Aufruf"],
      ["Satz 6", false, "Fehler beim Aufruf"],
    ]);
    expect(r.abbruch).toBeNull();
  });

  it("Verbindung weg (zweimal): hält bei Satz 13-artig an, „Weiter“ setzt genau dort fort", async () => {
    let netzWeg = true;
    const abruf: Abruf = async (von, bis) => {
      if (von === 6 && netzWeg) throw new TypeError("Load failed");
      return { status: 200, results: gut(von, bis) };
    };
    const erst = await pruefLauf(saetze, abruf);
    expect(erst).toMatchObject({ von: 6, abbruch: 6 });
    expect(erst.results).toHaveLength(6);
    netzWeg = false;
    const weiter = await pruefLauf(saetze, abruf, { von: erst.abbruch!, results: erst.results });
    expect(weiter.results.map((x) => x.text)).toEqual(saetze.map((s) => s.text));
    expect(weiter.abbruch).toBeNull();
  });

  it("falsches Geheimnis: sofort Schluss, ohne weitere Aufrufe", async () => {
    const abruf = vi.fn<Abruf>(async () => ({ status: 401 }));
    const r = await pruefLauf(saetze, abruf);
    expect(r.zugang).toBe(true);
    expect(abruf).toHaveBeenCalledTimes(1);
  });
});

describe("Ergebnis zum Kopieren", () => {
  it("Quote und je Fehlschlag Satz, erwartet, bekommen", async () => {
    const r = await pruefLauf(saetze, async (von, bis) => ({ status: 200, results: gut(von, bis) }));
    const text = fehlerText(r.results, saetze);
    expect(text).toContain("Prüfstand: 9 von 10 richtig (90 %)");
    expect(text).toContain("✗ Satz 4\n  erwartet: add_shopping, 2026-10-22, 16:00\n  bekommen: upsert_entry · „Steht drin.“\n  Datum 2026-10-22 nicht getroffen (keins)");
  });

  it("Seite: Hinweis „Bildschirm anlassen“, Zahl aus den echten Sätzen, Server-Häppchen 3", () => {
    const view = readFileSync("src/components/einstellungen/settings/AdminView.tsx", "utf8");
    const lauf = readFileSync("src/components/einstellungen/settings/PruefstandLauf.tsx", "utf8");
    expect(view).toContain("Bildschirm anlassen, dauert ca. 5 Minuten.");
    expect(view).toContain("${PRUEFSAETZE.length} Alltagssätze");
    expect(lauf).toContain("von ${saetze.length}");
    expect(view + lauf).not.toMatch(/von 120/);
    expect(lauf).toContain("Verbindung abgebrochen bei Satz ${stand.abbruch + 1}. Nochmal ab hier?");
    expect(readFileSync("src/app/api/pruefstand/route.ts", "utf8")).toMatch(/const BATCH = 3;/);
  });
});
