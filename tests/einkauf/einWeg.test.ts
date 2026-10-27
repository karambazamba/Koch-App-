// Einkauf ein Weg (Phase 0): kein fester Knopf unten, der Katalog kommt über
// ＋ → „Mehr Details“, Schließen übernimmt die Auswahl, kein eigenes Mikro,
// keine Zähler in den Laden-Chips, sichtbarer Name „Einkaufsliste“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { HOME_TILES } from "@/lib/core/homeLayout";
import { pageLabel } from "@/lib/core/pageLabel";

const read = (p: string) => readFileSync(p, "utf8");
const view = read("src/components/einkauf/ShoppingListView.tsx");
const catalog = read("src/components/einkauf/kacheln/CatalogSheet.tsx");

describe("Einkaufsliste: ein Weg zum Eintragen", () => {
  it("kein fester Knopf unten, auch kein CSS dafür", () => {
    expect(view).not.toContain("data-einkauf-knopf");
    expect(view).not.toContain("addLabel");
    expect(read("src/app/globals.css")).not.toContain("data-einkauf-knopf");
  });

  it("＋ → „Mehr Details“ öffnet den Katalog", () => {
    expect(view).toMatch(/<QuickAddButton[^>]*onMore=\{setCatalogOpen\}/);
    expect(read("src/components/einkauf/QuickAdd.tsx")).toContain("more: onMore ?? setOpen");
    expect(view).toContain("initialQuery={catalogOpen}");
  });

  it("Laden-Chips ohne Zahl", () => {
    const row = view.slice(view.indexOf("data-laden-reihe"), view.indexOf('aria-label="Meine Läden"'));
    expect(row).not.toContain("c.count");
    expect(row).not.toContain("tabular-nums");
  });
});

describe("Katalog „Mehr hinzufügen“", () => {
  it("✕, Wischen und Zurück übernehmen die Auswahl (genau einmal)", () => {
    expect(catalog).toMatch(/<Sheet[\s\S]*?onClose=\{finish\}/);
    expect(catalog).toContain("if (done.current) return;");
    expect(catalog).not.toContain('"Schließen"');
  });

  it("kein eigenes Mikro: Sprechen geht über den Mia-Knopf", () => {
    for (const s of ["useSpeechInput", "MicStrip", "toggleMic", "Einsprechen", "Ich höre zu"]) expect(catalog).not.toContain(s);
  });
});

describe("Sichtbarer Name „Einkaufsliste“", () => {
  it("Kachel, Kachel-Auswahl und Zurück-Text", () => {
    expect(HOME_TILES.find((t) => t.id === "einkauf")?.label).toBe("Einkaufsliste");
    expect(pageLabel("/einkaufsliste")).toBe("Einkaufsliste");
    const tiles = read("src/components/heute/HomeTiles.tsx");
    expect(tiles).toContain('<span className="truncate">Einkaufsliste</span>');
    expect(tiles).not.toMatch(/aria-label=\{?[^}\n]*"Einkauf"/);
  });
});
