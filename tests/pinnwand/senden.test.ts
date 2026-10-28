// Pinnwand „Neuer Zettel“ (Tafel 106/3): Vorschau als echter Zettel, Art
// Zettel/Sprachnachricht/Foto, 5 Farben (eigene vorgewählt), Schalter
// „Bleibt hängen“ mit Pin (kein Emoji) und leisem Hinweis, großer Knopf
// „Aufhängen“, danach „Hängt. · Rückgängig“.
// Kein Satz mehr über „verschwinden nach 24 Stunden“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PINNWAND } from "@/lib/mia/denktmit/seiten/pinnwand";
import { AUFHAENGEN, BLEIBT_HAENGEN, BLEIBT_HAENGEN_HINWEIS, HAENGT, PINNWAND_TIPP, magnetOf } from "@/lib/pinnwand";

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

  it("Schalter „Bleibt hängen“ (lucide-Pin, Hinweis darunter, an = roter Pin), großer Knopf „Aufhängen“, Toast „Hängt.“; kein „Für alle“-Schalter", () => {
    expect(BLEIBT_HAENGEN).toBe("Bleibt hängen");
    expect(BLEIBT_HAENGEN_HINWEIS).toBe("Verschwindet nicht von selbst, z. B. fürs WLAN.");
    expect(AUFHAENGEN).toBe("Aufhängen");
    expect(HAENGT).toBe("Hängt.");
    expect(sheet).toMatch(/role="switch" aria-checked=\{pinned\}/);
    expect(sheet).toMatch(/<Pin className=\{`h-5 w-5/);
    expect(sheet).toMatch(/\{BLEIBT_HAENGEN\}<\/span>\s*<span className="text-\[13px\] leading-snug text-muted">\{BLEIBT_HAENGEN_HINWEIS\}/);
    expect(sheet).toMatch(/>\s*\{AUFHAENGEN\}\s*</);
    expect(sheet).toMatch(/showToast\(\{ text: HAENGT, undo/);
    expect(magnetOf("zettel", true)).toBe("pin");
    expect(sheet).not.toContain("📌");
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

  it("Seiten-Tipp mit den gleichen Wörtern wie die leere Tür (2 Sätze, ohne Gedankenstrich)", () => {
    expect(PINNWAND.seite).toBe("Kurze Zettel für alle. Abhaken räumt auf, ‚Bleibt hängen‘ bleibt.");
    expect(PINNWAND.seite).toBe(PINNWAND_TIPP);
    expect(PINNWAND.seite.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length).toBeLessThanOrEqual(2);
    expect(PINNWAND.seite).not.toMatch(/[–—]/);
    expect(PINNWAND.kachel).not.toMatch(/verschwinden/);
  });
});
