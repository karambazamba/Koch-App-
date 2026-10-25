// Mehreres auf einmal = kurze Übersicht: feste Reihenfolge der Gruppen,
// Einträge mit „·“, Termine mit Tag und Uhrzeit, Mias Text nur „Erledigt.“
import { describe, expect, it } from "vitest";
import { doneCount, doneGroups, doneSummary, shortDoneReply } from "@/lib/begleitung/uebersicht";
import type { ChangeOp } from "@/lib/begleitung/ops";
import { aufgabe, termin } from "./werkzeugKontext";

const shop = (name: string): ChangeOp => ({ id: name, type: "add_shopping", weekStart: "2026-10-19", name, amount: "", section: "sonstiges" }) as ChangeOp;

describe("doneGroups", () => {
  it("feste Reihenfolge: Termine, Aufgaben, Einkaufsliste, dann der Rest – egal in welcher Reihenfolge Mia es macht", () => {
    const ops: ChangeOp[] = [
      shop("Eier"),
      { id: "p", type: "add_pin", pin: {} } as unknown as ChangeOp,
      { id: "a", type: "upsert_entry", isNew: true, entry: aufgabe({ title: "Geschenk für Oma" }) },
      { id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Turnen", date: "2026-10-23", start: "16:00" }) },
      shop("Milch"),
      shop("Milch"),
    ];
    const groups = doneGroups(ops);
    expect(groups.map((g) => g.id)).toEqual(["termine", "aufgaben", "einkauf", "pinnwand"]);
    expect(groups[0].items).toEqual(["Fr 16:00 Turnen"]);
    expect(groups[2]).toMatchObject({ label: "Einkaufsliste", items: ["Eier", "Milch"], href: "/einkaufsliste" });
    expect(groups[1].href).toBe("/aufgaben");
    expect(groups[0].href).toBe("/tag?datum=2026-10-23");
    expect(doneCount(groups)).toBe(5);
    expect(doneSummary(groups)).toContain("Einkaufsliste: Eier, Milch");
  });

  it("Ganztägig ohne Uhrzeit; Unbekanntes fällt raus", () => {
    const groups = doneGroups([{ id: "t", type: "upsert_entry", isNew: true, entry: termin({ title: "Klassenfahrt", date: "2026-11-09", start: "" }) }, { id: "x", type: "set_jetzt", on: true } as ChangeOp]);
    expect(groups).toEqual([{ id: "termine", label: "Termine", items: ["Mo Klassenfahrt"], href: "/tag?datum=2026-11-09" }]);
  });
});

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
