// Kurzer Satz zu den Ergebnis-Karten: Mias Text nur „Steht drin.“ (die Karten
// zeigen, was sie getan hat – tests/begleitung/ergebnisKarten.test.ts)
import { describe, expect, it } from "vitest";
import { shortDoneReply } from "@/lib/begleitung/uebersicht";

describe("shortDoneReply", () => {
  it("ohne Karten bleibt Mias Text", () => {
    expect(shortDoneReply("Milch ist drauf.", 0)).toBe("Milch ist drauf.");
  });
  it("1 Karte (Tafel 126): nur „Steht drin.“, eigene Kurzfassung bis 2 Wörter bleibt", () => {
    expect(shortDoneReply("Fr 16 Uhr Zahnarzt, steht drin.", 1)).toBe("Steht drin.");
    expect(shortDoneReply("Is drauf.", 1)).toBe("Is drauf.");
  });
  it("2+ Karten: nur „Steht drin.“, keine Aufzählung, keine Anschlussfrage", () => {
    expect(shortDoneReply("Milch, Brot und Eier sind drauf, Kita-Formular steht in den Aufgaben. Soll ich noch Erinnerungen setzen?", 5)).toBe("Steht drin.");
    expect(shortDoneReply("Steht alles.", 3)).toBe("Steht alles.");
    expect(shortDoneReply("Ist drin.", 3)).toBe("Ist drin.");
  });
  it("unklar oder ging nicht: EIN kurzer Satz dazu", () => {
    expect(shortDoneReply("Butter ist drauf, Zahnarzt steht. Turnen: welche Uhrzeit?", 2)).toBe("Steht drin. Turnen: welche Uhrzeit?");
    expect(shortDoneReply("Erledigt. Pizza bestellen kann ich noch nicht.", 2)).toBe("Erledigt. Pizza bestellen kann ich noch nicht.");
  });
});
