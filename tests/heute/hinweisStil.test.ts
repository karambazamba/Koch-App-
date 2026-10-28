// Ein Hinweis-Stil (Tafel 101): jeder einmalige Hinweis unter der Jetzt-Karte
// (core/hinweise.ts) sieht aus wie Mias Seiten-Tipp – warmer Verlauf, kleines
// Mia-Gesicht, „MIA“, „Alles klar“ – und nutzt dafür die eine Komponente
// `SeitenTipp`, keine eigene Karte.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const today = read("src/components/heute/TodayPage.tsx");
const ids = [...read("src/lib/core/hinweise.ts").match(/const HINWEISE = \[([^\]]+)\]/)![1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);

/** Wo jeder Hinweis gezeichnet wird: direkt in der Startseite oder in einer eigenen Datei */
const ORT: Record<string, string> = {
  "mia-name-neu": "src/components/heute/MiaNameHint.tsx",
  "leiste-neu": "src/components/heute/TodayPage.tsx",
  einladen: "src/components/konten/InviteHintCard.tsx",
  spendentopf: "src/components/spendentopf/PotHintCard.tsx",
  "startseite-halten": "src/components/heute/TodayPage.tsx",
  "lieber-schlicht": "src/components/heute/DarkTip.tsx",
  "abends-dunkel": "src/components/heute/DarkTip.tsx",
};

describe("Alle einmaligen Hinweise der Startseite im Stil der Seiten-Tipps", () => {
  it("jeder Hinweis aus core/hinweise.ts hat einen Ort", () => {
    expect(ids.length).toBeGreaterThan(5);
    expect(Object.keys(ORT).sort()).toEqual([...ids].sort());
  });

  it.each(Object.entries(ORT))("%s nutzt SeitenTipp", (id, file) => {
    const src = read(file);
    expect(src).toMatch(/<SeitenTipp[\s\S]*?id="([^"]+)"/);
    expect(src).toContain(`id="${id}"`);
    // keine eigene Karte daneben: keine Pastell-/Weiß-Fläche, kein ✕, kein „Verstanden“/„Später“
    expect(src).not.toMatch(/bg-accent-soft px-4|rounded-card bg-surface px-3\.5|aria-label="Hinweis schließen"|>\s*(Verstanden|Später|Nein danke)\s*</);
  });

  it("die Startseite zeichnet Hinweise nicht mehr als MiaKarte", () => {
    for (const line of today.split("\n").filter((l) => /hinweis === "/.test(l))) expect(line).not.toContain("<MiaKarte");
  });

  it("SeitenTipp: kleines Mia-Gesicht ohne Ring, „MIA“ über helperName, „Alles klar“", () => {
    const tipp = read("src/components/begleitung/denktmit/SeitenTipp.tsx");
    expect(tipp).toMatch(/<BegleitungAvatar size=\{36\} \/>/);
    expect(tipp).toContain("{helperName()}");
    expect(tipp).toContain("Alles klar");
    expect(tipp).toContain("from-jetzt-from to-jetzt-to");
  });
});
