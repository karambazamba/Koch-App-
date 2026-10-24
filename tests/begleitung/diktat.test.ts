import { describe, expect, it } from "vitest";
import { joinFinals, withoutPrevious } from "@/lib/begleitung/mitschrift";

describe("Diktat zusammensetzen", () => {
  it("nimmt bei kumulierten Abschnitten (Android) nur den längeren", () => {
    expect(joinFinals(["Milch", "Milch und Eier"])).toBe("Milch und Eier");
    expect(joinFinals(["Milch und Eier", "Milch"])).toBe("Milch und Eier");
  });

  it("hängt verschiedene Abschnitte aneinander", () => {
    expect(joinFinals(["Milch", "und Brot"])).toBe("Milch und Brot");
  });

  it("lässt den eben abgeschickten Text der letzten Aufnahme weg", () => {
    expect(withoutPrevious("Milch kaufen Brot backen", "Milch kaufen")).toBe("Brot backen");
    expect(withoutPrevious("Brot backen", "Milch kaufen")).toBe("Brot backen");
    // Nur der alte Text allein ist keine neue Eingabe, aber auch kein Abschneiden mitten im Wort
    expect(withoutPrevious("Milch kaufenmehr", "Milch kaufen")).toBe("Milch kaufenmehr");
  });
});
