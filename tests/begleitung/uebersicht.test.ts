// Mehreres auf einmal = kurzer Satz: Mias Text nur „Erledigt.“ (die Karten
// zeigen, was sie getan hat – tests/begleitung/ergebnisKarten.test.ts)
import { describe, expect, it } from "vitest";
import { shortDoneReply } from "@/lib/begleitung/uebersicht";

describe("shortDoneReply", () => {
  it("1 Sache: Mias Bestätigung bleibt", () => {
    expect(shortDoneReply("Milch ist drauf.", 1)).toBe("Milch ist drauf.");
  });
  it("2+ Sachen: nur „Erledigt.“, keine Aufzählung, keine Anschlussfrage", () => {
    expect(shortDoneReply("Milch, Brot und Eier sind drauf, Kita-Formular steht in den Aufgaben. Soll ich noch Erinnerungen setzen?", 5)).toBe("Erledigt.");
    expect(shortDoneReply("Steht alles.", 3)).toBe("Steht alles.");
    expect(shortDoneReply("Ist drin.", 3)).toBe("Ist drin.");
  });
  it("unklar oder ging nicht: EIN kurzer Satz dazu", () => {
    expect(shortDoneReply("Butter ist drauf, Zahnarzt steht. Turnen: welche Uhrzeit?", 2)).toBe("Erledigt. Turnen: welche Uhrzeit?");
    expect(shortDoneReply("Erledigt. Pizza bestellen kann ich noch nicht.", 2)).toBe("Erledigt. Pizza bestellen kann ich noch nicht.");
  });
});
