// Erster Start (v0.94): Hallo → „Bevor’s losgeht“ → „Zeig mal“ → Beispiel-Tag.
// Keine Look-Frage mehr: Standard „Farbig“, nach 3 Tagen einmal „Lieber schlicht?“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ERSTER_START } from "@/lib/mia/persona";
import { showDarkTip, showLookTip } from "@/lib/core/darkTip";

const state = (look = false, done = false) => ({ version: 1 as const, since: "2026-10-20", done, look });

describe("Bildschirm 3 „Zeig mal“", () => {
  it("Texte aus persona.ts, ohne Gedankenstriche, ein Knopf", () => {
    expect(ERSTER_START.titel).toBe("Kein Stress. Ich zeig dir alles Stück für Stück.");
    expect(ERSTER_START.zeilen.map((z) => z.vor + z.hervor + z.nach)).toEqual(["Erst mal den Beispiel-Tag angucken", "Eigenes mit ＋ eintragen", "Oder mich antippen und erzählen"]);
    expect(ERSTER_START.zeilen[0].hervor).toBe("Beispiel-Tag");
    expect(ERSTER_START.knopf).toBe("Zeig mal");
    expect(ERSTER_START.leise).toBe("Die Beispiele verschwinden, sobald du Eigenes einträgst.");
    expect(JSON.stringify(ERSTER_START)).not.toMatch(/ [–—] /);
    const src = readFileSync("src/components/begleitung/ZeigMalStep.tsx", "utf8");
    expect(src.match(/<button/g)).toHaveLength(1);
    expect(src).toContain("size={110}");
    expect(src).toContain("mia-zwinkern-einmal");
  });

  it("Hallo-Ablauf ohne Look-Frage, Zurück geht einen Schritt", () => {
    const src = readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8");
    expect(src).not.toContain("LookStep");
    expect(src).toMatch(/startFresh\("farbig"\)/);
    expect(src).toMatch(/pushState/);
    expect(src).toMatch(/addEventListener\("popstate"/);
  });
});

describe("„Lieber schlicht?“ statt Look-Frage", () => {
  it("erst ab dem 3. Tag, nur im Look Farbig, einmal", () => {
    expect(showLookTip(state(), "2026-10-21", "farbig")).toBe(false);
    expect(showLookTip(state(), "2026-10-22", "farbig")).toBe(true);
    expect(showLookTip(state(), "2026-10-22", "schlicht")).toBe(false);
    expect(showLookTip(state(true), "2026-10-30", "farbig")).toBe(false);
    expect(showLookTip(null, "2026-10-30", "farbig")).toBe(false);
  });

  it("nie zusammen mit dem Dunkel-Tipp (DarkTip zeigt den Look-Hinweis zuerst)", () => {
    expect(showDarkTip(state(), "2026-10-22", false)).toBe(true);
    const src = readFileSync("src/components/heute/DarkTip.tsx", "utf8");
    expect(src.indexOf("showLookTip(")).toBeLessThan(src.indexOf("showDarkTip(state"));
    expect(src).toMatch(/!state\.look && profile\.look === "farbig"\)\) return null/);
  });
});

describe("Mia als Linien-Icon („Oder mich antippen und erzählen“)", () => {
  it("Zeile „erzählen“ zeigt Mia als Umriss, Linienstärke 2 wie Auge und Plus", () => {
    const step = readFileSync("src/components/begleitung/ZeigMalStep.tsx", "utf8");
    expect(step).toMatch(/erzaehlen: MiaLineIcon/);
    expect(step).not.toMatch(/MessageCircle/);
    expect(step).toMatch(/<Icon className="h-5 w-5" strokeWidth=\{2\} \/>/);
  });

  it("eine Komponente: Sprechblase mit mittiger Spitze, zwei senkrechte Augen, Lächeln, currentColor", () => {
    const icon = readFileSync("src/components/ui/MiaLineIcon.tsx", "utf8");
    expect(icon).toMatch(/stroke="currentColor"/);
    expect(icon).toMatch(/strokeWidth = 2/);
    expect(icon).toMatch(/L12 21\.6/); // Spitze genau in der Mitte (x = 12)
    expect(icon).toMatch(/M9 9\.2v2\.2M15 9\.2v2\.2/); // Augen senkrecht, symmetrisch zu x = 12
  });
});
