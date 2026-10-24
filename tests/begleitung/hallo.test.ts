// Hallo-Bildschirm: Mia springt nach 2 s einmal vor Freude („Ich bin
// bereit!“), Antippen macht sie kitzelig, unten „Gemacht in Eutin von
// KARAMBA Eis“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HELLO_JUMP_MS, HELLO_READY, HELLO_T, helloJump, helloTapText } from "@/lib/core/hello";

describe("Freudensprung", () => {
  it("startet bei 2,0 s, dauert 2,8 s; Blase ab 1,05 s für 2,5 s; „Los geht’s“ pulsiert bei 2,15 s und 2,8 s", () => {
    expect(HELLO_T.jump).toBe(2000);
    expect(HELLO_JUMP_MS).toBe(2800);
    expect(helloJump(1999, false)).toEqual({ on: false, bubble: false, nudge: 0 });
    expect(helloJump(2000, false).on).toBe(true);
    expect(helloJump(2000 + 1049, false).bubble).toBe(false);
    expect(helloJump(2000 + 1050, false).bubble).toBe(true);
    expect(helloJump(2000 + 2200, false).nudge).toBe(1);
    expect(helloJump(2000 + 2900, false)).toEqual({ on: false, bubble: true, nudge: 2 });
    expect(helloJump(2000 + 3600, false).bubble).toBe(false);
  });

  it("läuft schon (Neuaufbau) oder Bewegung reduzieren → kein Sprung", () => {
    expect(helloJump(2500, true)).toEqual({ on: false, bubble: false, nudge: 0 });
  });

  it("Sätze: „Ich bin bereit!“, erster Tipp „Hihi, kitzelig!“, danach die übrigen im Wechsel", () => {
    expect(HELLO_READY).toBe("Ich bin bereit!");
    expect(helloTapText(0)).toBe("Hihi, kitzelig!");
    const next = [1, 2, 3, 4, 5, 6].map(helloTapText);
    expect(next).not.toContain("Hihi, kitzelig!");
    expect(new Set(next).size).toBe(3);
    expect(next[0]).toBe(next[3]);
  });

  it("Bildschirm: Sprung nur über transform/opacity, Bewegung reduzieren schaltet ihn ab", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    const hop = css.slice(css.indexOf("@keyframes hello-hop"), css.indexOf("@keyframes hello-spin"));
    expect(hop).toMatch(/translateY\(calc\(var\(--jump, 115px\) \* -1\)\)/);
    expect(hop).not.toMatch(/top:|left:|margin|height:/);
    expect(css).toMatch(/@keyframes hello-spin[^}]*rotate\(0deg\)[\s\S]*?rotate\(360deg\)/);
    const reduce = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce) {\n  .hello-face"));
    expect(reduce).toMatch(/\.hello-jump/);
  });

  it("unten ruhig (Tafel 84): „Gemacht in Eutin von KARAMBA Eis“, darunter Datenschutz · Impressum, kein kleines Logo", () => {
    const src = readFileSync("src/components/begleitung/HelloScreen.tsx", "utf8");
    expect(src).toContain("Gemacht in Eutin von KARAMBA Eis");
    expect(src).not.toContain("Gemacht in Eutin · von");
    expect(src).not.toContain("möglich gemacht von KARAMBA");
    expect(src).not.toMatch(/<BrandMark/);
    expect(src).toMatch(/href="\/datenschutz"[\s\S]*href="\/impressum"/);
    expect(src).toMatch(/Erzähl einfach, was ansteht\.\s*<br \/>\s*Ich sortier das\./);
  });
});
