import { beforeEach, describe, expect, it } from "vitest";
import { at } from "../helpers";
import { STAY_MIA, stayMiaReply } from "@/lib/begleitung/helperTools";
import { toolDefinitions } from "@/lib/begleitung/toolset";

const HELPER_TOOL_NAMES = toolDefinitions().map((t) => t.name);
import { findSlot, weekOf } from "@/lib/begleitung/ops";
import { kontext, letzte, rezept, rufe, WOCHEN } from "./werkzeugKontext";

beforeEach(() => at("2026-10-21T09:00"));

describe("Bausteine", () => {
  it("einschalten sagt, wo er steht; schon an/aus → nichts vorschlagen", () => {
    const ctx = kontext({ features: ["tipps"] });
    expect(rufe(ctx, "baustein_an", { baustein: "vorrat" }).content).toBe("Vorgemerkt: Vorrat & Tiefkühler einschalten. Der Vorrat steht jetzt rechts unter Essen – und als Kachel auf Heute.");
    expect(ctx.data.features).toContain("vorrat");
    expect(rufe(ctx, "baustein_an", { baustein: "tipps" }).content).toBe("Tipps ist schon an.");
    expect(rufe(ctx, "baustein_aus", { baustein: "tipps" }).content).toBe("Vorgemerkt: Tipps ausschalten.");
    expect(ctx.data.features).not.toContain("tipps");
    expect(rufe(ctx, "baustein_aus", { baustein: "rezepte" }).content).toBe("Rezepte ist schon aus.");
    expect(rufe(ctx, "baustein_an", { baustein: "zaubern" }).isError).toBe(true);
  });
});

describe("Portionen nur für einen Tag", () => {
  it("rechnet ein Rezept um, ohne den Tag zu ändern", () => {
    const ctx = kontext({ recipes: { r: rezept("r", "Pasta", ["Nudeln"], { servings: 4, ingredients: [{ id: "i1", amount: 500, unit: "g", name: "Nudeln" }, { id: "i2", amount: 1.5, unit: "EL", name: "Öl" }, { id: "i3", amount: null, unit: "", name: "Salz" }] }) } });
    expect(rufe(ctx, "portionen_anpassen", { rezept_id: "r", personen: 2 }).content).toBe("Pasta für 2 (statt 4): 250 g Nudeln, 0,8 EL Öl, Salz");
    expect(rufe(ctx, "portionen_anpassen", { rezept_id: "x", personen: 2 }).isError).toBe(true);
    expect(rufe(ctx, "portionen_anpassen", {}).content).toBe("personen angeben.");
    expect(ctx.ops).toHaveLength(0);
  });

  it("setzt die Personenzahl für das Gericht von heute bzw. einem Wochentag", () => {
    const ctx = kontext({ recipes: { r: rezept("r", "Pasta", ["Nudeln"]) } });
    expect(rufe(ctx, "portionen_anpassen", { personen: 2 }).content).toMatch(/kein Gericht im Plan/);
    rufe(ctx, "gericht_setzen", { woche: "aktuell", tag: "Mittwoch", rezept_id: "r" });
    rufe(ctx, "gericht_setzen", { woche: "naechste", tag: "Montag", gericht: "Pizza" });
    expect(rufe(ctx, "portionen_anpassen", { personen: 2 }).content).toBe("Vorgemerkt: Pasta am Mittwoch nur für 2 Personen. Pasta für 2 (statt 4): 100 g Nudeln");
    expect(findSlot(weekOf(ctx.data, WOCHEN.aktuell), "Mittwoch")?.entry?.stored).toMatchObject({ persons: 2 });
    expect(rufe(ctx, "portionen_anpassen", { personen: 50, tag: "2026-10-26" }).content).toBe("Vorgemerkt: Pizza am Montag nur für 30 Personen. (freies Gericht ohne Zutatenliste)");
  });
});

describe("Pause", () => {
  it("setzen nur mit gültigem Zeitraum, beenden nur wenn eine da ist", () => {
    const ctx = kontext();
    expect(rufe(ctx, "pause_beenden").content).toBe("Es ist gar keine Pause eingetragen.");
    expect(rufe(ctx, "pause_setzen", { von: "2026-10-30", bis: "2026-10-25" }).isError).toBe(true);
    expect(rufe(ctx, "pause_setzen", { von: "Freitag", bis: "2026-11-01" }).content).toBe("Vorgemerkt: Pause vom 2026-10-23 bis 2026-11-01.");
    expect(ctx.data.profile.pause).toEqual({ from: "2026-10-23", until: "2026-11-01" });
    expect(rufe(ctx, "pause_setzen", { von: "übermorgen", bis: "" }).isError).toBe(true);
    expect(rufe(ctx, "pause_beenden").content).toBe("Vorgemerkt: Pause beenden.");
    expect(ctx.data.profile.pause).toBeNull();
  });
});

describe("App-Befehl, Startseite, Wochenplan, Einkaufsliste, Rückgängig", () => {
  it("app_befehl kürzt und verlangt Text", () => {
    const ctx = kontext();
    expect(rufe(ctx, "app_befehl", { text: "" }).isError).toBe(true);
    expect(rufe(ctx, "app_befehl", { text: "Mach die Ansicht dunkel" }).content).toBe("Vorgemerkt: „Mach die Ansicht dunkel“ in der App ausführen.");
    rufe(ctx, "app_befehl", { text: "x".repeat(300) });
    expect(letzte(ctx)).toMatchObject({ type: "app_command", text: "x".repeat(200) });
  });

  it("startseite_anpassen ändert die Arbeitskopie", () => {
    const ctx = kontext();
    expect(rufe(ctx, "startseite_anpassen", { kachel: "wetter", aktion: "fliegen" }).isError).toBe(true);
    expect(rufe(ctx, "startseite_anpassen", { kachel: "wetter", aktion: "ausblenden" }).content).toBe("Vorgemerkt: Startseite – wetter ausblenden.");
    expect(ctx.data.home?.find((t) => t.id === "wetter")?.visible).toBe(false);
  });

  it("wochenplan_anzeigen/_aendern/_loeschen nutzen die Plan-Werkzeuge", () => {
    const ctx = kontext({ recipes: { r: rezept("r", "Chili", ["Bohnen"]) } });
    expect(JSON.parse(rufe(ctx, "wochenplan_anzeigen", { woche: "naechste" }).content).woche).toBe("naechste");
    expect(rufe(ctx, "wochenplan_aendern", { tag: "Montag", gericht: "Ofengemüse" }).content).toBe("Vorgemerkt: Montag – Ofengemüse.");
    expect(rufe(ctx, "wochenplan_aendern", { woche: "naechste", tag: "Montag", rezept_id: "r" }).content).toBe("Vorgemerkt: Montag – Chili.");
    expect(rufe(ctx, "wochenplan_aendern", { tag: "Montag", leeren: true }).content).toBe("Vorgemerkt: Montag leeren (Ofengemüse).");
    expect(rufe(ctx, "wochenplan_loeschen", { woche: "naechste" }).content).toMatch(/^Vorgemerkt: Wochenplan .* leeren\.$/);
    expect(findSlot(weekOf(ctx.data, WOCHEN.naechste), "Montag")?.entry).toBeFalsy();
  });

  it("Einkaufsliste lesen, Artikel entfernen und leeren", () => {
    const ctx = kontext();
    rufe(ctx, "einkaufsliste_hinzufuegen", { woche: "aktuell", artikel: [{ name: "Milch" }, { name: "Brot", fuer_tag: "morgen" }] });
    const liste = JSON.parse(rufe(ctx, "einkaufsliste_anzeigen", {}).content);
    expect(liste.artikel.map((a: { name: string }) => a.name).sort()).toEqual(["Brot", "Milch"]);
    expect(rufe(ctx, "einkaufsliste_entfernen", { artikel: [] }).isError).toBe(true);
    expect(rufe(ctx, "einkaufsliste_entfernen", { artikel: ["milch"] }).content).toBe("Vorgemerkt: milch von der Liste nehmen.");
    expect(ctx.data.shopping[WOCHEN.aktuell].manual.map((m) => m.name)).toEqual(["Brot"]);
    expect(rufe(ctx, "einkaufsliste_leeren", {}).content).toBe("Vorgemerkt: Einkaufsliste leeren.");
    expect(ctx.data.shopping[WOCHEN.aktuell].manual).toEqual([]);
    expect(rufe(ctx, "rueckgaengig").content).toBe("Vorgemerkt: letzte Änderung zurücknehmen.");
    expect(letzte(ctx).type).toBe("undo_last");
  });
});

describe("Mia bleibt Mia", () => {
  it("kein Werkzeug mehr zum Umbenennen", () => {
    expect(HELPER_TOOL_NAMES).not.toContain("assistent_anpassen");
  });

  it("Umbenennen- und Stimmen-Wünsche → freundlich nein; anderes bleibt unberührt", () => {
    expect(stayMiaReply("Ich nenn dich ab jetzt Frieda")).toBe(STAY_MIA);
    expect(stayMiaReply("Sei lieber Theo")).toBe(STAY_MIA);
    expect(stayMiaReply("Nimm eine männliche Stimme")).toMatch(/^Ich bleib lieber Mia 😊 Eine andere Stimme kannst du in den Einstellungen unter „Mia“ wählen\.$/);
    expect(stayMiaReply("Ich hätte lieber eine Frauenstimme")).toMatch(/Eine andere Stimme/);
    expect(stayMiaReply("Mach dich lila")).toBeNull();
    expect(stayMiaReply("Sei leise")).toBeNull();
    expect(stayMiaReply("Wie spät ist es?")).toBeNull();
  });
});
