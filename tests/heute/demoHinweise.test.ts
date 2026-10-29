// Tafel 150: graue Erklärsätze in eigenen Zeilen unter den Kacheln (Kacheln behalten ihre Größe)
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEMO_HINWEIS_KREISE, demoHinweisJetzt, demoHinweise, hinweisZeilen } from "@/lib/heute/demoHinweise";

describe("Erklärsätze am Beispiel-Tag (Tafel 150)", () => {
  it("Wortlaut wie Tafel 150, Name aus dem Profil", () => {
    const h = demoHinweise("Mia");
    expect(h.termine).toBe("Was heute noch kommt. Vorbei verschwindet von selbst.");
    expect(h.aufgaben).toBe("Abhaken. Mia erinnert, wenn es eilt.");
    expect(h.einkauf).toBe("Nach Läden sortiert. Laden antippen und los.");
    expect(demoHinweise("Lotte").aufgaben).toContain("Lotte");
    expect(demoHinweisJetzt("Mia")).toBe("Mia sagt dir, was gerade wichtig ist.");
    expect(DEMO_HINWEIS_KREISE).toBe("Sport planen, kurz durchatmen, was los ist, Timer.");
    expect(Object.values(h).every((t) => !/…|–/.test(t!))).toBe(true);
  });

  it("Wetter und Notizen übereinander neben der Pinnwand: EIN Satz unter beiden, Pinnwand daneben", () => {
    const plaetze = [
      { key: "wetter", col: 0, w: 1, start: 0, span: 1 },
      { key: "notizen", col: 0, w: 1, start: 1, span: 1 },
      { key: "pinnwand", col: 1, w: 1, start: 0, span: 2 },
      { key: "termine", col: 0, w: 2, start: 2, span: 1 },
    ];
    const texte = new Map([["wetter", "Wetter."], ["notizen", "Notizen."], ["pinnwand", "Zettel."], ["termine", "Termine."]]);
    expect(hinweisZeilen(plaetze, texte)).toEqual([
      { vor: 2, saetze: [{ col: 0, w: 1, text: "Wetter. Notizen." }, { col: 1, w: 1, text: "Zettel." }] },
      { vor: 3, saetze: [{ col: 0, w: 2, text: "Termine." }] },
    ]);
    // Ohne Satz keine Zeile
    expect(hinweisZeilen(plaetze, new Map())).toEqual([]);
  });

  it("nur in der Demo, bis „Hinweise aus“; Streifen „Beispiel · tipp überall rein“", () => {
    const today = readFileSync("src/components/heute/TodayPage.tsx", "utf8");
    expect(today).toMatch(/const zeigeHinweise = demoDay\.hinweise && !editing\.on/);
    expect(today).toMatch(/id === "wetter" \|\| \(demoDay\.tiles as string\[\]\)\.includes\(id\)/);
    const bits = readFileSync("src/components/heute/DemoBits.tsx", "utf8");
    expect(bits).toContain("Beispiel · tipp überall rein");
    expect(bits).toContain("Hinweise aus");
  });
});
