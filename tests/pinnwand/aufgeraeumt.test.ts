// Pinnwand aufgeräumt (A-028 Teil 1, Tafel 123 A): Fotos als Polaroid in
// Zettelgröße (quadratisch, object-fit cover), antippen = groß im Fenster mit
// Text und Erledigt; Wand so hoch wie der Inhalt; Meta-Zeile EINE Zeile, bei
// Platzmangel nur die Zeit, die letzten Tage als Wochentag; „OBEN“ an
// Zetteln, die hängen bleiben, der Text bekommt rechts Platz.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { OBEN, pinMetaParts } from "@/lib/pinnwand";

const read = (p: string) => readFileSync(p, "utf8");

describe("Pinnwand aufgeräumt (Tafel 123 A)", () => {
  it("Foto als Polaroid in Zettelgröße: quadratisch, object-fit cover; im Fenster ganz", () => {
    const src = read("src/components/pinnwand/Zettel.tsx");
    expect(src).toMatch(/<FotoBild pin=\{item\.pin\} square/);
    expect(src).toMatch(/const ratio = square \? "1 \/ 1"/);
    expect(src).toMatch(/"object-contain" : "object-cover"/);
  });

  it("Foto antippen = groß im Fenster mit Text, Erledigt und Mehr", () => {
    const foto = read("src/components/pinnwand/FotoFenster.tsx");
    expect(foto).toMatch(/<FotoBild pin=\{item\.pin\} big \/>/);
    expect(foto).toContain('"Erledigt"');
    expect(foto).toContain("Mehr");
    expect(foto).toContain("{item.pin.data.text}");
    expect(read("src/components/pinnwand/PinboardView.tsx")).toMatch(/papier === "foto" \? setFoto\(item\.id\)/);
  });

  it("Wand so hoch wie der Inhalt: keine Mindesthöhe, kein innerer Scrollbereich", () => {
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view.match(/<section className="kuehlschrank ([^"]*)"/)![1]).not.toMatch(/min-h|overflow|max-h/);
    expect(view).not.toMatch(/min-h-\[300px\]/);
  });

  it("„OBEN“ an Zetteln, die hängen bleiben – klein, Großbuchstaben, Zettelfarbe dunkel; der Text bekommt rechts Platz", () => {
    const src = read("src/components/pinnwand/Zettel.tsx");
    expect(OBEN).toBe("Oben");
    expect(src).toMatch(/uppercase[^"]*" style=\{\{ color: `color-mix\(in srgb, \$\{tone\.mag\}/);
    expect(src).toMatch(/pinned \? "pr-12" : ""/);
    expect(src).not.toContain("· bleibt hängen`");
  });

  it("Meta-Zeile kurz: heute Uhrzeit, die letzten sechs Tage der Wochentag, sonst Datum – nie „angeh…“", () => {
    const clock = (iso: string) => iso.slice(11, 16);
    const day = (iso: string) => iso.slice(0, 10);
    const m = (erstellt: string, author = "Lisa") => ({ erstellt, data: { author } });
    expect(pinMetaParts(m("2026-10-28T12:10"), "Felix", "2026-10-28", clock, day, true)).toEqual({ wer: "Lisa", wann: "12:10" });
    expect(pinMetaParts(m("2026-10-26T12:10"), "Felix", "2026-10-28", clock, day, true)).toEqual({ wer: "Lisa", wann: "Mo" });
    expect(pinMetaParts(m("2026-10-27T12:10", "Felix"), "Felix", "2026-10-28", clock, day, true)).toEqual({ wer: "Du", wann: "Di" });
    expect(pinMetaParts(m("2026-10-10T12:10"), "Felix", "2026-10-28", clock, day, true).wann).toBe("10.10.");
    // ohne „kurz“ (Jetzt-Karte) wie bisher
    expect(pinMetaParts(m("2026-10-27T12:10"), "Felix", "2026-10-28", clock, day).wann).toBe("gestern");
    expect(read("src/components/pinnwand/PinSheets.tsx")).toMatch(/shortClock, dayOf, true\)/);
  });
});
