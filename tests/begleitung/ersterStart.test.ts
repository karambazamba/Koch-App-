// Erster Start (v0.94, v0.120): Hallo → „Bevor’s losgeht“ → „Für wen soll ich sortieren?“ → Beispiel-Tag.
// Keine Look-Frage mehr: Standard „Farbig“, nach 3 Tagen einmal „Lieber schlicht?“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ERSTER_START } from "@/lib/mia/persona";
import { HAUSHALT_WAHL } from "@/lib/core/haushalt";
import { showDarkTip, showLookTip } from "@/lib/core/darkTip";

const state = (look = false, done = false) => ({ version: 1 as const, since: "2026-10-20", done, look });

describe("Bildschirm 3 „Für wen soll ich sortieren?“ (Mia für alle)", () => {
  it("Texte aus persona.ts, ohne Gedankenstriche, drei gleichwertige Knöpfe", () => {
    expect(ERSTER_START.titel).toBe("Kein Stress. Ich sortier deinen Alltag, Stück für Stück.");
    expect(ERSTER_START.frage).toBe("Für wen soll ich sortieren?");
    expect(ERSTER_START.leise).toBe("Passt den Beispiel-Tag an. Später jederzeit änderbar.");
    expect(JSON.stringify(ERSTER_START)).not.toMatch(/ [–—] /);
    expect(HAUSHALT_WAHL.map((w) => w.label)).toEqual(["Nur für mich", "Für uns zwei", "Für die Familie"]);
    const src = readFileSync("src/components/begleitung/ZeigMalStep.tsx", "utf8");
    expect(src.match(/<button/g)).toHaveLength(1);
    expect(src).toMatch(/HAUSHALT_WAHL\.map/);
    expect(src).not.toMatch(/aria-pressed|defaultValue/);
    expect(src).toContain("size={110}");
    expect(src).toContain("mia-zwinkern-einmal");
  });

  it("Hallo-Ablauf ohne Look-Frage, Zurück geht einen Schritt", () => {
    const src = readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8");
    expect(src).not.toContain("LookStep");
    expect(src).toMatch(/startFresh\("farbig", haushalt\)/);
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
