// Mia hört zuverlässig zu: nichts geht verloren (simulierte Erkennungs-Ereignisse).
import { describe, expect, it } from "vitest";
import { joinFinals, mitErgebnis, mitNeustart, mitschriftText, neueMitschrift, withoutPrevious, type Ergebnis } from "@/lib/begleitung/mitschrift";

const F = (text: string): Ergebnis => ({ isFinal: true, text });
const I = (text: string): Ergebnis => ({ isFinal: false, text });

describe("Mitschrift", () => {
  it("Pause mitten im Satz (Neustart der Erkennung) → Text wird angehängt, nichts abgeschickt", () => {
    let m = neueMitschrift();
    m = mitErgebnis(m, 0, [F("Trag mir für morgen")]);
    m = mitNeustart(m);
    m = mitErgebnis(m, 0, [I("um 14 Uhr")]);
    m = mitErgebnis(m, 0, [F("um 14 Uhr einen Termin ein")]);
    expect(mitschriftText(m)).toBe("Trag mir für morgen um 14 Uhr einen Termin ein");
  });

  it("Ende ohne finalen Abschnitt → der letzte unfertige Teil kommt mit", () => {
    let m = neueMitschrift();
    m = mitErgebnis(m, 0, [F("Milch"), I(" und Eier")]);
    expect(mitschriftText(m, false)).toBe("Milch");
    expect(mitschriftText(m)).toBe("Milch und Eier");
  });

  it("Neustart sichert auch Unfertiges", () => {
    let m = neueMitschrift();
    m = mitErgebnis(m, 0, [I("Zahnarzt am Freitag")]);
    m = mitNeustart(m);
    m = mitErgebnis(m, 0, [F("um neun")]);
    expect(mitschriftText(m)).toBe("Zahnarzt am Freitag um neun");
  });

  it("Ergebnisliste startet neu bei Index 0 → nichts überschrieben", () => {
    let m = neueMitschrift();
    m = mitErgebnis(m, 0, [F("Ich möchte morgen")]);
    m = mitErgebnis(m, 1, [F("Ich möchte morgen"), F("zum Bäcker")]);
    // Safari fängt die Liste neu an
    m = mitErgebnis(m, 0, [I("und danach")]);
    m = mitErgebnis(m, 0, [F("und danach zur Post")]);
    expect(mitschriftText(m)).toBe("Ich möchte morgen zum Bäcker und danach zur Post");
  });

  it("wachsender Text an Position 0 ist kein Neustart", () => {
    let m = neueMitschrift();
    m = mitErgebnis(m, 0, [F("Hallo")]);
    m = mitErgebnis(m, 0, [F("Hallo Mia")]);
    expect(mitschriftText(m)).toBe("Hallo Mia");
  });

  it("kumulierte fertige Abschnitte (Android) zählen einmal", () => {
    expect(joinFinals(["Milch", "Milch und Eier"])).toBe("Milch und Eier");
    expect(joinFinals(["Milch und Eier", "Milch"])).toBe("Milch und Eier");
  });
});

describe("withoutPrevious", () => {
  it("„Okay“ als eigene Nachricht, dann „Okay ich möchte …“ → nichts abgeschnitten", () => {
    expect(withoutPrevious("Okay ich möchte morgen um 14 Uhr", "Okay", 500)).toBe("Okay ich möchte morgen um 14 Uhr");
    expect(withoutPrevious("Ja genau so", "Ja", 500)).toBe("Ja genau so");
  });

  it("gerade eben Abgeschicktes (mehrere Wörter) wird vorne entfernt, ältere Texte nie", () => {
    expect(withoutPrevious("Milch und Eier und Brot", "Milch und Eier", 1000)).toBe("und Brot");
    expect(withoutPrevious("Milch und Eier und Brot", "Milch und Eier", 60_000)).toBe("Milch und Eier und Brot");
  });
});
