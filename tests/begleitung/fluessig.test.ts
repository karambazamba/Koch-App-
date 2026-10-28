// Auftrag „Mia schneller und flüssiger“: Stille 1,2 s (Ring passend kürzer),
// Fortsetzung nach Denkpause hängt an, erster Satz wird vor dem Ende
// gesprochen, „Mhm.“ höchstens einmal, Mias Stimme satzweise.
import { describe, expect, it } from "vitest";
import { STILLE_MS, WARTEN_AB_MS } from "@/lib/begleitung/mitschrift";
import { PAUSE_RING_MS } from "@/lib/begleitung/stage";
import { ERKENNER_VERZUG_MS, fuerNachklapp, istNachklapp, NACHKLAPP_MS, zusammen } from "@/lib/begleitung/nachklapp";
import { ersterSatz, MHM, MHM_AB_MS, mhmFaellig, nochZuSagen } from "@/lib/begleitung/satzweise";
import { stueckeFuerStimme } from "@/lib/begleitung/vorlesText";
import { FESTE_SAETZE, festerSatz } from "@/lib/begleitung/stimmeProtokoll";

describe("Stille: abgeschickt nach 1,2 s, Ring passend kürzer", () => {
  it("1,2 s Stille, Ring ab 0,4 s läuft genau bis zum Abschicken", () => {
    expect(STILLE_MS).toBe(1200);
    expect(WARTEN_AB_MS).toBe(400);
    expect(PAUSE_RING_MS).toBe(800);
  });
});

describe("Denkpause: Fortsetzung innerhalb 1,5 s hängt an", () => {
  it("erstes Wort bis 1,5 s (plus Erkenner-Verzug) nach dem Abschicken = Fortsetzung", () => {
    expect(istNachklapp(10_000, 10_000 + 600)).toBe(true);
    expect(istNachklapp(10_000, 10_000 + NACHKLAPP_MS + ERKENNER_VERZUG_MS)).toBe(true);
    expect(istNachklapp(10_000, 10_000 + NACHKLAPP_MS + ERKENNER_VERZUG_MS + 1)).toBe(false);
    expect(istNachklapp(null, 5)).toBe(false);
    expect(istNachklapp(10_000, 9_000)).toBe(false);
  });

  it("zusammensetzen, ohne doppelt (Browser liefert den alten Teil manchmal mit)", () => {
    expect(zusammen("Milch auf die Liste", "und Eier")).toBe("Milch auf die Liste und Eier");
    expect(zusammen("Was gibt es", "Was gibt es morgen zum Essen")).toBe("Was gibt es morgen zum Essen");
    expect(zusammen("Zahnarzt Freitag.", "um 10")).toBe("Zahnarzt Freitag um 10");
    expect(zusammen("", "Hallo")).toBe("Hallo");
    expect(zusammen("Hallo", " ")).toBe("Hallo");
  });
});

describe("Sofort sprechen: erster Satz vor dem Ende", () => {
  it("erster Satz erst, wenn danach schon etwas kommt; Daten, Uhrzeiten, Abkürzungen trennen nicht", () => {
    expect(ersterSatz("Morgen ab 14 Uhr is frei")).toBeNull();
    expect(ersterSatz("Morgen ab 14 Uhr is frei.")).toBeNull();
    expect(ersterSatz("Morgen ab 14 Uhr is frei. Soll")).toBe("Morgen ab 14 Uhr is frei.");
    expect(ersterSatz("Am 21. Oktober um 16.30 Zahnarzt. Danach")).toBe("Am 21. Oktober um 16.30 Zahnarzt.");
    expect(ersterSatz("Z. B. Chili, ca. 30 Min. oder Bolo! Und")).toBe("Z. B. Chili, ca. 30 Min. oder Bolo!");
    expect(ersterSatz("Jo! Ab")).toBe("Jo!");
    expect(ersterSatz(". . Hallo")).toBeNull();
  });

  it("gestreamt: der erste Satz wird gesprochen, bevor die Antwort fertig ist; danach nur der Rest", () => {
    const stuecke = ["Morgen", " ab 14 Uhr", " is frei.", " Soll ich", " den Friseur", " eintragen?"];
    const gesagt: { text: string; anhaengen: boolean; fertig: boolean }[] = [];
    let erster = "";
    let soFar = "";
    stuecke.forEach((s, i) => {
      soFar += s;
      const satz = !erster && ersterSatz(soFar);
      if (satz) {
        erster = satz;
        gesagt.push({ text: satz, anhaengen: false, fertig: i === stuecke.length - 1 });
      }
    });
    const rest = nochZuSagen(erster, soFar);
    gesagt.push({ ...rest, fertig: true });
    expect(gesagt).toEqual([
      { text: "Morgen ab 14 Uhr is frei.", anhaengen: false, fertig: false },
      { text: "Soll ich den Friseur eintragen?", anhaengen: true, fertig: true },
    ]);
  });

  it("neue Runde nach Werkzeugen: ganze Antwort angehängt; nichts gesagt: normal ersetzen", () => {
    expect(nochZuSagen("Schau ich nach.", "Morgen ab 14 Uhr frei.")).toEqual({ text: "Morgen ab 14 Uhr frei.", anhaengen: true });
    expect(nochZuSagen("", "Is drauf.")).toEqual({ text: "Is drauf.", anhaengen: false });
    expect(nochZuSagen("Jo.", "Jo.")).toEqual({ text: "", anhaengen: true });
    expect(nochZuSagen("Morgen  frei.", "Morgen frei. Und sonst?")).toEqual({ text: "Und sonst?", anhaengen: true });
  });
});

describe("Sofort reagieren: „Mhm.“ höchstens einmal", () => {
  const basis = { seitMs: MHM_AB_MS, hatText: false, schonGesagt: false, sofort: false, liest: true, hoert: false };
  it("nach 1,2 s ohne Antwort, einmal, nie beim Sofort-Weg, nie während Mia zuhört, nur beim Vorlesen", () => {
    expect(mhmFaellig(basis)).toBe(true);
    expect(mhmFaellig({ ...basis, seitMs: MHM_AB_MS - 1 })).toBe(false);
    expect(mhmFaellig({ ...basis, schonGesagt: true })).toBe(false);
    expect(mhmFaellig({ ...basis, sofort: true })).toBe(false);
    expect(mhmFaellig({ ...basis, hoert: true })).toBe(false);
    expect(mhmFaellig({ ...basis, liest: false })).toBe(false);
    expect(mhmFaellig({ ...basis, hatText: true })).toBe(false);
    // Ablauf: erster Takt sagt es, jeder weitere nicht mehr
    let schonGesagt = false;
    const gesagt = [1300, 1800, 2500, 4000].filter((seitMs) => {
      const jetzt = mhmFaellig({ ...basis, seitMs, schonGesagt });
      schonGesagt ||= jetzt;
      return jetzt;
    });
    expect(gesagt).toEqual([1300]);
  });

  it("„Mhm.“ und die Sofort-Bestätigungen sind feste Sätze (zwischengespeichert, sofort da)", () => {
    for (const s of [MHM, "Is drauf.", "Läuft.", "Notiert.", "Steht alles drauf.", "Hängt an der Pinnwand.", "Mach ich."]) expect(festerSatz(s), s).toBeGreaterThanOrEqual(0);
    // Die alten Nummern bleiben (sie sind Adressen im Zwischenspeicher)
    expect(FESTE_SAETZE.slice(0, 3)).toEqual(["Steht drin.", "Ist drauf.", "Klappt."]);
    expect(new Set(FESTE_SAETZE).size).toBe(FESTE_SAETZE.length);
  });
});

describe("Mias Stimme satzweise", () => {
  it("erster Satz allein (schneller erster Ton), danach längere Stücke", () => {
    expect(stueckeFuerStimme("Jo. Morgen ab 14 Uhr frei. Soll ich den Friseur eintragen?")).toEqual(["Jo.", "Morgen ab 14 Uhr frei. Soll ich den Friseur eintragen?"]);
    expect(stueckeFuerStimme("")).toEqual([]);
    expect(stueckeFuerStimme("Nur ein Satz")).toEqual(["Nur ein Satz"]);
  });
});

describe("Denkpause nur nach Stille, nicht nach Antippen (Fehler: 5 Runden wurden zu einer)", () => {
  it("von Hand beendet: nichts gemerkt, die nächste Aufnahme ist eine neue Frage", () => {
    const g = fuerNachklapp("Notier dir Runde 1", 10_000, true);
    expect(g).toBeNull();
    expect(istNachklapp(g?.am, 10_300)).toBe(false);
  });
  it("nach Stille abgeschickt: gemerkt, kurz danach hängt es an", () => {
    const g = fuerNachklapp("Was gibt es", 10_000, false);
    expect(g).toEqual({ text: "Was gibt es", am: 10_000 });
    expect(istNachklapp(g?.am, 10_300)).toBe(true);
  });
});
