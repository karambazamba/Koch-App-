// Code-Regel (A-029, Leitbild Ton): sichtbare Kachel-Texte der Startseite
// ohne Gedankenstrich „ – “. Kommentare zählen nicht; Ansagen für VoiceOver
// (aria-*) stehen nicht auf der Kachel und bleiben vorerst, wie sie sind.
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

const KACHEL_DATEIEN = [
  "src/components/heute/HomeTiles.tsx",
  "src/components/heute/MiniCards.tsx",
  "src/components/heute/JetztCard.tsx",
  ...readdirSync("src/components", { recursive: true, encoding: "utf8" })
    .filter((f) => /(^|\/)[A-Za-z]*Tile\.tsx$/.test(f))
    .map((f) => `src/components/${f}`),
  ...readdirSync("src/lib/heute").filter((f) => /achel\.ts$/.test(f)).map((f) => `src/lib/heute/${f}`),
  "src/lib/heute/jetztTopics.ts",
  "src/lib/wetter/kachel.ts",
  "src/lib/vorrat/imHaus.ts",
];

/** Zeilen mit sichtbarem Text, ohne Kommentare und ohne aria-Ansagen */
function gedankenstriche(datei: string): string[] {
  const ohneBloecke = readFileSync(datei, "utf8").replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "");
  return ohneBloecke
    .split("\n")
    .map((l, i) => [i + 1, l.replace(/^\s*\/\/.*$/, "").replace(/\s\/\/.*$/, "")] as const)
    .filter(([, l]) => l.includes(" – ") && !/aria-[a-z]+=/.test(l))
    .map(([n, l]) => `${datei}:${n}: ${l.trim().slice(0, 120)}`);
}

describe("Kachel-Texte ohne Gedankenstrich", () => {
  it("die Liste deckt die Kacheln ab (Sport, Wetter, Pinnwand, Timer …)", () => {
    for (const f of ["sport/SportTile.tsx", "wetter/WeatherTile.tsx", "pinnwand/PinboardTile.tsx", "timer/TimerTile.tsx", "essen/DishTile.tsx"]) {
      expect(KACHEL_DATEIEN).toContain(`src/components/${f}`);
    }
  });

  it.each(KACHEL_DATEIEN)("%s", (datei) => {
    expect(gedankenstriche(datei)).toEqual([]);
  });
});
