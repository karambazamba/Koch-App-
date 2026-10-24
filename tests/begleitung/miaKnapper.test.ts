// Auftrag „Prüfstand fair + Mia knapper“: Notizen aus = nie hineinschreiben,
// „Merk dir: Lisa mag keine Pilze“ direkt ins Profil, vager Einkauf als
// Vorschau, mehrtägige Termine als EIN Eintrag, „Woche“ allein braucht kein
// großes Modell, tidyMiaText räumt Oberflächen-Erklärungen, vorgespielte
// Gefühle und zweite Fragen weg.
import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { applyOps, type ChangeOp } from "@/lib/begleitung/ops";
import { isSafeOp } from "@/lib/begleitung/miaDone";
import { needsLargeModel } from "@/lib/begleitung/engine";
import { NOTIZEN_AUS } from "@/lib/begleitung/noteTools";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { kontext, letzte, rufe } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

describe("Notizen aus (Launch 1.0)", () => {
  it("schreibende Notiz-Werkzeuge lehnen ab und verweisen auf eine Aufgabe", () => {
    const ctx = kontext();
    for (const [name, input] of [
      ["notiz_anlegen", { titel: "Tierpark" }],
      ["liste_eintrag_hinzufuegen", { liste: "Ideen", eintraege: ["Tierpark"] }],
      ["schnellnotiz_schreiben", { text: "Tierpark" }],
    ] as const) {
      const res = rufe(ctx, name, input);
      expect(res.isError).toBe(true);
      expect(res.content).toBe(NOTIZEN_AUS);
    }
    expect(NOTIZEN_AUS).toMatch(/aufgabe_anlegen/);
    expect(ctx.data.notes ?? []).toHaveLength(0);
  });

  it("wer Notizen schon nutzt, behält sie", () => {
    const ctx = kontext({ features: ["notizen"] });
    expect(rufe(ctx, "notiz_anlegen", { titel: "Tierpark" }).isError).toBeFalsy();
  });
});

describe("Vorlieben merken", () => {
  it("„Merk dir: Lisa mag keine Pilze, Oliven“ landet sofort im Profil", () => {
    const ctx = kontext();
    expect(rufe(ctx, "vorliebe_merken", { person: "Lisa", sachen: ["pilze", "Oliven"], mag: false }).content).toMatch(/Gemerkt/);
    const op = letzte(ctx) as ChangeOp;
    expect(op).toMatchObject({ type: "set_dislike", personId: "p-lisa", term: "Oliven", mag: false });
    expect(isSafeOp(op)).toBe(true);
    // „pilze“ steht schon drin (groß/klein egal), Oliven kommt dazu
    expect(ctx.data.profile.persons.find((p) => p.id === "p-lisa")?.dislikes).toEqual(["Pilze", "Oliven"]);
  });

  it("„Lisa isst wieder Pilze“ nimmt es heraus; Unbekannte → Fehler", () => {
    const ctx = kontext();
    rufe(ctx, "vorliebe_merken", { person: "Lisa", sachen: ["Pilze"], mag: true });
    expect(ctx.data.profile.persons.find((p) => p.id === "p-lisa")?.dislikes).toEqual([]);
    expect(rufe(ctx, "vorliebe_merken", { person: "Oma Grete", sachen: ["Pilze"] }).isError).toBe(true);
    expect(rufe(ctx, "vorliebe_merken", { person: "Lisa", sachen: [] }).isError).toBe(true);
  });

  it("set_dislike rein angewandt", () => {
    const ctx = kontext();
    const { data } = applyOps(ctx.data, [{ id: "1", type: "set_dislike", personId: "p-mathis", who: "Mathis", term: "Paprika", mag: false }]);
    expect(data.profile.persons.find((p) => p.id === "p-mathis")?.dislikes).toContain("Paprika");
  });
});

describe("Einkauf vage = Vorschau", () => {
  it("nur_vorschlag → Vorschau mit „Übernehmen“, nicht sofort", () => {
    const ctx = kontext();
    rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", nur_vorschlag: true, artikel: [{ name: "Brötchen" }, { name: "Marmelade" }] });
    const op = letzte(ctx) as ChangeOp;
    expect(op).toMatchObject({ type: "add_shopping", vorschlag: true });
    expect(isSafeOp(op)).toBe(false);
    rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch" }] });
    expect(isSafeOp(letzte(ctx) as ChangeOp)).toBe(true);
  });
});

describe("Mehrtägig", () => {
  it("Klassenfahrt 9. bis 13. November = EIN ganztägiger Termin", () => {
    const ctx = kontext();
    expect(rufe(ctx, "termin_anlegen", { titel: "Klassenfahrt", datum: "2026-11-09", bis_datum: "2026-11-13" }).isError).toBeFalsy();
    const op = letzte(ctx) as Extract<ChangeOp, { type: "upsert_entry" }>;
    expect(op.entry.data).toMatchObject({ date: "2026-11-09", endDate: "2026-11-13" });
    expect((op.entry.data as { start?: string }).start).toBeFalsy();
  });

  it("ohne Uhrzeit und ohne bis_datum bleibt es eine Aufgabe", () => {
    expect(rufe(kontext(), "termin_anlegen", { titel: "Turnen", datum: "2026-11-09" }).isError).toBe(true);
  });
});

describe("Großes Modell nur fürs Planen", () => {
  const big = (text: string) => needsLargeModel({ messages: [{ role: "user", text }], pending: [] } as never);
  it("„Woche“ allein reicht nicht", () => {
    expect(big("Mittwoch nächste Woche um 14 Uhr Elterngespräch")).toBe(false);
    expect(big("Diese Woche noch Reifen wechseln")).toBe(false);
  });
  it("Wochenplan, planen, Essensplan → groß", () => {
    expect(big("Plan mir die Woche")).toBe(true);
    expect(big("Wochenplan für nächste Woche")).toBe(true);
    expect(big("Mach einen Essensplan")).toBe(true);
  });
});

describe("tidyMiaText: knapper", () => {
  it("vorgespielte Gefühle und Oberflächen-Erklärungen fallen weg", () => {
    expect(tidyMiaText("Das kenn ich. Dann mach heute langsam. Soll ich das Abendessen übernehmen?")).toBe("Dann mach heute langsam. Soll ich das Abendessen übernehmen?");
    expect(tidyMiaText("Steht drin. Mit „Übernehmen“ kommt es in den Kalender.")).toBe("Steht drin.");
    expect(tidyMiaText("Plan steht. Unter Essen findest du ihn.")).toBe("Plan steht.");
  });
  it("von mehreren Fragen bleibt die erste; Datumspunkte trennen nicht", () => {
    expect(tidyMiaText("Am 30. Oktober um 9 Uhr Zahnarzt. Soll ich Mathis Bescheid sagen? Oder lieber Lisa?")).toBe("Am 30. Oktober um 9 Uhr Zahnarzt. Soll ich Mathis Bescheid sagen?");
    expect(tidyMiaText("Klassenfahrt vom 9. bis 13. November steht drin.")).toBe("Klassenfahrt vom 9. bis 13. November steht drin.");
  });
  it("nie alles weg", () => {
    expect(tidyMiaText("Das kenn ich.")).toBe("Das kenn ich.");
  });
});
