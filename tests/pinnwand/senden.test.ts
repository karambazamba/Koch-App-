// Pinnwand „Neuer Zettel“ (Tafel 106/3): Vorschau als echter Zettel, Art
// Zettel/Sprachnachricht/Foto, 5 Farben (eigene vorgewählt), „Anheften“ mit
// Pin (kein Emoji), großer Knopf „Anpinnen“, danach „Angepinnt · Rückgängig“.
// Kein Satz mehr über „verschwinden nach 24 Stunden“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PINNWAND } from "@/lib/mia/denktmit/seiten/pinnwand";

const read = (p: string) => readFileSync(p, "utf8");
const sheet = read("src/components/pinnwand/NeuerZettel.tsx");

describe("Neuer Zettel", () => {
  it("Titel, Vorschau mit Magnet, Text direkt auf dem Zettel (mehrzeilig, ohne Rahmen)", () => {
    expect(sheet).toContain('"Neuer Zettel"');
    expect(sheet).toMatch(/<Magnet form=\{magnetOf\(papier, pinned\)\}/);
    expect(sheet).toMatch(/<MehrzeilenFeld\s+voll/);
  });

  it("Art als Umschalter im App-Stil (nie schwarz), 5 Farben mit der eigenen vorgewählt", () => {
    expect(sheet).toMatch(/<Segmented<ZettelArt>/);
    for (const label of ["Zettel", "Sprachnachricht", "Foto"]) expect(sheet).toContain(`label: "${label}"`);
    expect(sheet).not.toMatch(/bg-ink|bg-black/);
    expect(sheet).toMatch(/useState<ZettelFarbe>\(personFarbe\(me, household\)\)/);
    expect(sheet).toMatch(/Array\.from\(\{ length: ZETTEL_FARBEN \}/);
  });

  it("„Anheften“ mit lucide-Pin, großer Knopf „Anpinnen“, Toast mit Rückgängig; kein „Für alle“-Schalter", () => {
    expect(sheet).toMatch(/<Pin className="h-5 w-5"[^>]*\/> \{pinned \? "Wird angeheftet" : "Anheften"\}/);
    expect(sheet).not.toContain("📌");
    expect(sheet).toMatch(/>\s*Anpinnen\s*</);
    expect(sheet).toMatch(/showToast\(\{ text: "Angepinnt", undo/);
    expect(sheet).not.toMatch(/Für alle"/);
  });

  it("Foto: Kamera oder Galerie, vor dem Speichern verkleinert, Bild auf dem Gerät", () => {
    expect(sheet).toMatch(/capture="environment"/);
    expect(sheet).toMatch(/await verkleinern\(file\)/);
    expect(sheet).toMatch(/await fotoStore\.save\(pin\.id, foto\.blob\)/);
    expect(read("src/components/pinnwand/fotoVerkleinern.ts")).toMatch(/canvas\.toBlob\(resolve, "image\/jpeg", FOTO_QUALITY\)/);
  });

  it("Seite ohne 24-Stunden-Satz", () => {
    const view = read("src/components/pinnwand/PinboardView.tsx");
    expect(view).not.toMatch(/24 Stunden|verschwinden/);
    expect(view).not.toContain("PIN_SUBLINE");
  });

  it("Seiten-Tipp: „Kurze Zettel für alle. Bleiben, bis jemand ‚Erledigt‘ tippt.“ (2 Sätze, ohne Gedankenstrich)", () => {
    expect(PINNWAND.seite).toBe("Kurze Zettel für alle. Bleiben, bis jemand ‚Erledigt‘ tippt.");
    expect(PINNWAND.seite.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length).toBeLessThanOrEqual(2);
    expect(PINNWAND.seite).not.toMatch(/[–—]/);
    expect(PINNWAND.kachel).not.toMatch(/verschwinden/);
  });
});
