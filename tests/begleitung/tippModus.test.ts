// „Lieber schreiben“ schließt sich nicht von selbst (Video Felix, iPhone Safari).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TIPPEN_ZU_MS, tippenSchliessen } from "@/lib/begleitung/tippModus";

describe("Tippen-Modus", () => {
  it("bleibt offen, solange ein Feld fokussiert ist – auch wenn die Tastaturhöhe kurz auf 0 springt", () => {
    expect(tippenSchliessen({ feldFokussiert: true, leer: true, aendern: false })).toBe(false);
  });
  it("schließt nur bei echtem Fokusverlust und leerem Feld", () => {
    expect(tippenSchliessen({ feldFokussiert: false, leer: true, aendern: false })).toBe(true);
    expect(tippenSchliessen({ feldFokussiert: false, leer: false, aendern: false })).toBe(false);
    expect(tippenSchliessen({ feldFokussiert: false, leer: true, aendern: true })).toBe(false);
    expect(TIPPEN_ZU_MS).toBe(300);
  });
  it("die Bühne leitet „Tastatur zu“ nicht mehr aus der Tastaturhöhe ab", () => {
    const src = readFileSync("src/components/begleitung/HelperPanel.tsx", "utf8");
    expect(src).not.toMatch(/inset === 0 && !input\.trim\(\)/);
    expect(src).toMatch(/onLeave=\{fieldLeft\}/);
    expect(readFileSync("src/components/ui/Sheet.tsx", "utf8")).toMatch(/useVisualViewportBox\(\)/);
  });
});
