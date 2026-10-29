// „Was los?“ (A-055) bei Mia: Fragen erkennen (nie Essen, Wetter, Termine),
// Treffer aus den Veranstaltungen, Werkzeug `was_los`, Prüfstand-Sätze im
// Testmodus (Ziel ≥ 95 %) und Karten in der Antwort.
import { describe, expect, it } from "vitest";
import { wasLosFrage, wasLosTreffer } from "@/lib/region/frage";
import { demoEvents } from "@/lib/region/demo";
import { orteImUmkreis } from "@/lib/region/orte";
import { WAS_LOS_SAETZE } from "@/lib/begleitung/pruefstand/wasLos";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte, quote } from "@/lib/begleitung/pruefstand/bewerten";
import { PRUEF_HEUTE, PRUEF_UHR, pruefHaushalt, pruefVeranstaltungen, pruefWetter } from "@/lib/begleitung/pruefstand/haushalt";
import { runAssistant } from "@/lib/begleitung/engine";
import { createMockModel } from "@/lib/begleitung/mock";

const MI = "2026-10-21";
const lage = { orte: orteImUmkreis("Eutin", 15), umkreis: 15, kategorienAus: [], heute: MI, jetzt: 10 * 60 + 30 };

describe("Fragen erkennen", () => {
  it.each([
    ["Was ist los?", { von: MI, bis: "2026-10-27", filter: "alles", ort: null }],
    ["Was ist heute in Eutin los?", { von: MI, bis: MI, filter: "alles", ort: "Eutin" }],
    ["Was können wir am Wochenende mit den Kindern machen?", { von: "2026-10-23", bis: "2026-10-25", filter: "kinder", ort: null }],
    ["Gibt’s am Samstag was in Malente?", { von: "2026-10-24", bis: "2026-10-24", filter: "alles", ort: "Bad Malente-Gremsmühlen" }],
    ["Gibt es nächste Woche einen Markt?", { von: "2026-10-26", bis: "2026-11-01", filter: "markt", ort: null }],
    ["Was kann man am Samstag draußen unternehmen?", { von: "2026-10-24", bis: "2026-10-24", filter: "draussen", ort: null }],
  ])("%s", (text, erwartet) => {
    expect(wasLosFrage(text, MI)).toMatchObject(erwartet);
  });

  it.each(["Was gibt’s heute?", "Was gibt es heute zu essen?", "Wie wird das Wetter am Wochenende?", "Was steht morgen an?", "Welche Termine hab ich am Samstag?", "Milch auf die Liste", "Was ist mit dir los?", "Was steht auf der Pinnwand?"])("nicht: %s", (text) => {
    expect(wasLosFrage(text, MI)).toBeNull();
  });
});

describe("Treffer", () => {
  const liste = demoEvents(MI);
  it("Zeitraum, Filter, Ort, höchstens 3, mit Tag", () => {
    const wochenende = wasLosTreffer(liste, { von: "2026-10-23", bis: "2026-10-25", filter: "kinder", ort: null }, lage);
    expect(wochenende.map((h) => [h.event.id, h.tag])).toEqual([["demo-kino", "2026-10-23"], ["demo-herbstmarkt", "2026-10-24"], ["demo-laternen", "2026-10-25"]]);
    expect(wasLosTreffer(liste, { von: "2026-10-28", bis: "2026-10-28", filter: "alles", ort: "Bad Malente-Gremsmühlen" }, lage).map((h) => h.event.id)).toEqual(["demo-wochenmarkt"]);
    expect(wasLosTreffer(liste, { von: "2026-10-22", bis: "2026-10-22", filter: "alles", ort: "Bad Malente-Gremsmühlen" }, lage)).toEqual([]);
    // Mehrtägiges zählt am gefragten Tag
    expect(wasLosTreffer(liste, { von: "2026-10-22", bis: "2026-10-22", filter: "alles", ort: null }, lage).map((h) => [h.event.id, h.tag])).toEqual([["demo-fotografien", "2026-10-22"]]);
    // Weiter weg nur mit großem Umkreis bzw. genanntem Ort
    expect(wasLosTreffer(liste, { von: "2026-10-24", bis: "2026-10-24", filter: "draussen", ort: "Heiligenhafen" }, lage).map((h) => h.event.id)).toEqual(["demo-hafenfest"]);
    expect(wasLosTreffer(liste, { von: MI, bis: "2026-11-04", filter: "alles", ort: null }, lage)).toHaveLength(3);
  });
});

describe("Prüfstand „Was los?“ im Testmodus", () => {
  it("10 Sätze im Prüfstand, alle ohne Aktion", () => {
    expect(WAS_LOS_SAETZE).toHaveLength(10);
    for (const s of WAS_LOS_SAETZE) expect(PRUEFSAETZE.find((p) => p.text === s.text)).toMatchObject({ ops: [], waslos: s.waslos });
  });

  it("durch die Mia-Engine (Testmodell): ≥ 95 % richtig, Karten mit Quelle", async () => {
    const results = [];
    for (const satz of PRUEFSAETZE.filter((p) => WAS_LOS_SAETZE.some((w) => w.text === p.text))) {
      const reply = await runAssistant({ deviceId: "pruefstand", today: PRUEF_HEUTE, clock: PRUEF_UHR, messages: [{ role: "user", text: satz.text }], pending: [], data: pruefHaushalt(satz.lage), forecast: pruefWetter(), regionEvents: pruefVeranstaltungen() }, createMockModel(), "mock");
      results.push(bewerte(satz, reply, 100));
    }
    const falsch = results.filter((r) => !r.ok).map((r) => `${r.text}: ${r.gruende.join(", ")} (${r.antwort})`);
    expect(quote(results), falsch.join("\n")).toBeGreaterThanOrEqual(95);
  });

  it("Bewertung: ohne Karten falsch, Karten obwohl nichts passt auch", () => {
    const satz = PRUEFSAETZE.find((p) => p.text === "Was ist los?")!;
    expect(bewerte(satz, { reply: "Heute ist einiges los. Quelle: Kreis Ostholstein.", ops: [] }, 100).gruende).toContain("keine Veranstaltungs-Karten");
    const nichts = PRUEFSAETZE.find((p) => p.text === "Was ist morgen in Malente los?")!;
    const karte = { event: demoEvents(MI)[0], tag: MI };
    expect(bewerte(nichts, { reply: "Da ist was.", ops: [], waslos: [karte] }, 100).gruende).toContain("Veranstaltungen, obwohl keine passen");
  });
});
