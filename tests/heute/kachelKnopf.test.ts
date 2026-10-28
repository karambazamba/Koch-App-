// A-045 (Tafel 133): Kachel-Knöpfe nie mit „…“ – feste Stufen: Symbol weg →
// 13 px → kurze Form → weniger Innenabstand. Dazu: keine Kürzung mit „…“ in
// Kacheln, außer bei frei eingegebenem Text (`data-freitext`).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { KURZ_LABEL, knopfStufen } from "@/lib/heute/kachelKnopf";

const read = (f: string) => readFileSync(f, "utf8");

describe("Kachel-Knopf: Stufen statt „…“", () => {
  it("mit Symbol: erst Symbol weg, dann 13 px, dann kurz, dann eng", () => {
    expect(knopfStufen("Wochenplan", { icon: true })).toEqual([
      { icon: true, px: 14, text: "Wochenplan", eng: false },
      { icon: false, px: 14, text: "Wochenplan", eng: false },
      { icon: false, px: 13, text: "Wochenplan", eng: false },
      { icon: false, px: 13, text: "Woche", eng: false },
      { icon: false, px: 13, text: "Woche", eng: true },
    ]);
  });

  it("ohne Symbol (S-Kachel) und ohne kurze Form: keine doppelten Stufen", () => {
    expect(knopfStufen("Rezept", { icon: false })).toEqual([
      { icon: false, px: 14, text: "Rezept", eng: false },
      { icon: false, px: 13, text: "Rezept", eng: false },
      { icon: false, px: 13, text: "Rezept", eng: true },
    ]);
  });

  it("die kurze Form ist kürzer und endet nie auf „…“", () => {
    for (const [lang, kurz] of Object.entries(KURZ_LABEL)) {
      expect(kurz.length, lang).toBeLessThan(lang.length);
      expect(kurz, lang).not.toMatch(/…|\.\.\./);
    }
    for (const label of ["Rezept", "Woche", "Wochenplan", "Vorschlag", "Weiter kochen"]) for (const s of knopfStufen(label, { icon: true })) expect(s.text).not.toMatch(/…/);
  });

  it("Essen-Kachel nutzt den gemeinsamen Knopf und die gemeinsame Pille", () => {
    expect(read("src/components/essen/DishTile.tsx")).toMatch(/from "@\/components\/ui\/KachelKnopf"/);
    expect(read("src/components/essen/kochtipp/KochideeKnopf.tsx")).toMatch(/<KachelPille/);
    expect(read("src/components/essen/kochtipp/KochideeKnopf.tsx")).not.toMatch(/bg-accent|rounded-full border/);
    expect(read("src/components/heute/HomeTiles.tsx")).toMatch(/<KachelPille label="Was anderes\?"/);
    expect(read("src/components/ui/KachelPille.tsx")).toMatch(/text-\[12px\]/);
  });

  it("Im Haus: Name vor Schild, Schild 10,5 px, umbrechen statt abschneiden", () => {
    const tile = read("src/components/heute/HomeTiles.tsx");
    const haus = tile.slice(tile.indexOf("export function PantryTile"));
    expect(haus).toMatch(/flex-wrap/);
    expect(haus).toMatch(/text-\[10\.5px\]/);
    expect(haus).not.toMatch(/\btruncate\b|text-ellipsis|line-clamp/);
  });

  it("in Kacheln nur frei eingegebener Text mit truncate/line-clamp (dann `data-freitext`)", () => {
    const files = ["src/components/essen/DishTile.tsx", "src/components/heute/HomeTiles.tsx", "src/components/wetter/WeatherTile.tsx", "src/components/sport/SportTile.tsx", "src/components/timer/TimerTile.tsx", "src/components/pinnwand/PinboardTile.tsx", "src/components/spendentopf/SpendentopfTile.tsx", "src/components/tipps/TipsTile.tsx"];
    for (const f of files) {
      for (const line of read(f).split("\n")) {
        if (/className=[^>]*(\btruncate\b|line-clamp|text-ellipsis)/.test(line)) expect(line, f).toMatch(/data-freitext/);
      }
    }
  });
});
