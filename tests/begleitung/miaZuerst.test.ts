// Mia zuerst (Tafel 53): lange drücken = sprechen, Loslassen = absenden; Bewegungen nur
// über transform/opacity (flüssig auf alten Handys), reduzierte Bewegung = nur
// Überblenden; keine Schreib-Leiste mehr.
import { readFileSync, existsSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";

afterEach(() => noBrowser());

describe("Mia hören", () => {
  it("Loslassen nach langem Drücken erreicht die offene Mia", async () => {
    fakeWindow();
    vi.resetModules();
    const { onReleaseHelperVoice, releaseHelperVoice } = await import("@/lib/begleitung/open");
    const got = vi.fn();
    const off = onReleaseHelperVoice(got);
    releaseHelperVoice();
    off();
    releaseHelperVoice();
    expect(got).toHaveBeenCalledOnce();
  });
});

describe("Bewegung", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const mia = css.slice(css.indexOf("Mia zuerst (Tafel 53)"));

  it("Mia-Animationen nur über transform/opacity – nie top/left/width/height", () => {
    const frames = [...mia.matchAll(/@keyframes\s+mia-[\w-]+\s*\{([\s\S]*?)\}\s*\}/g)].map((m) => m[1]);
    expect(frames.length).toBeGreaterThanOrEqual(5);
    for (const f of frames) expect(f).not.toMatch(/(?<![-\w])(top|left|right|bottom|width|height|margin)\s*:/);
    expect(mia).toMatch(/cubic-bezier\(\.16, 1, \.3, 1\)/);
    for (const file of ["src/components/begleitung/MiaStage.tsx", "src/components/begleitung/MiaButton.tsx", "src/components/begleitung/ChatInputBar.tsx"]) {
      expect(readFileSync(file, "utf8")).not.toMatch(/transition-(all|\[(top|left|width|height))/);
    }
  });

  it("reduzierte Bewegung: keine transform-Animationen", () => {
    const reduced = mia.slice(mia.indexOf("prefers-reduced-motion"));
    expect(reduced).toMatch(/\.mia-knopf[^{]*\{\s*animation:\s*none/);
    expect(reduced).toMatch(/\.mia-flug\s*\{\s*transition:\s*none/);
  });

  it("keine Schreib-Leiste mehr – nur der runde Mia-Knopf", () => {
    expect(existsSync("src/components/begleitung/BegleitungBar.tsx")).toBe(false);
    expect(readFileSync("src/components/heute/HomePager.tsx", "utf8")).toContain("<MiaButton");
  });
});

describe("Mia-Knopf: Schein bleibt mittig", () => {
  it("der Knopf nutzt nicht `hit` (dessen ::before würde den Schein verschieben)", () => {
    const src = readFileSync("src/components/begleitung/MiaButton.tsx", "utf8");
    expect(src).toMatch(/className="mia-knopf (?![^"]*\bhit\b)/);
  });
});
