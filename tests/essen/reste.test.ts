// "Was ist noch da?": Gesagtes in Zutaten zerlegen (Regeln), Lebensmittel erkennen
import { describe, expect, it } from "vitest";
import { germanNumber, ruleParseLeftovers } from "@/lib/essen/leftovers/ruleParser";
import { parseLeftovers } from "@/lib/essen/leftovers/parser";
import { findFood, foodName, recognizeFood } from "@/lib/essen/leftovers/foods";

const kurz = (text: string) => ruleParseLeftovers(text).map((p) => [p.amount, p.unit, p.name, p.known]);

describe("Zahlwörter", () => {
  it("einfache, zusammengesetzte und Brüche", () => {
    expect(germanNumber("zwei")).toBe(2);
    expect(germanNumber("Zwanzig")).toBe(20);
    expect(germanNumber("fünfundzwanzig")).toBe(25);
    expect(germanNumber("einundvierzig")).toBe(41);
    expect(germanNumber("zweihundert")).toBe(200);
    expect(germanNumber("hundert")).toBe(100);
    expect(germanNumber("einhundertzwanzig")).toBe(120);
    expect(germanNumber("halbe")).toBe(0.5);
    expect(germanNumber("dutzend")).toBe(12);
  });

  it("Unsinn ergibt null", () => {
    expect(germanNumber("käse")).toBeNull();
    expect(germanNumber("zwölfundzwanzig")).toBeNull();
    expect(germanNumber("käsehundert")).toBeNull();
    expect(germanNumber("käseundzwanzig")).toBeNull();
  });
});

describe("Zerlegen", () => {
  it("Beispiel aus der Beschreibung: Füllwörter, Tippfehler, Einheit", () => {
    expect(kurz("also dann noch zwei Brokoli und äh ein Becher Sahne")).toEqual([
      [2, "", "Brokkoli", true],
      [1, "Becher", "Sahne", true],
    ]);
  });

  it("Ziffern, Zahl mit Einheit in einem Wort und Dezimalkomma", () => {
    expect(kurz("200g Bacon, 1,5 Liter Milch")).toEqual([
      [200, "g", "Bacon", true],
      [1.5, "l", "Milch", true],
    ]);
  });

  it("Brüche und „ein halbes“", () => {
    expect(kurz("½ Gurke")).toEqual([[0.5, "", "Gurke", true]]);
    expect(kurz("ein halbes Brot")).toEqual([[0.5, "", "Brot", true]]);
  });

  it("Mehrzahl/Einzahl passend zur Menge", () => {
    expect(kurz("drei Karotte")).toEqual([[3, "", "Karotten", true]]);
    expect(kurz("1 Eier")).toEqual([[1, "", "Ei", true]]);
    expect(kurz("Eier")).toEqual([[null, "", "Eier", true]]);
  });

  it("Mehrwort-Lebensmittel und Adjektive", () => {
    expect(kurz("saure Sahne")).toEqual([[null, "", "Saure Sahne", true]]);
    expect(kurz("frische Petersilie")).toEqual([[null, "", "Frische Petersilie", true]]);
    expect(kurz("rote Zwiebeln")).toEqual([[null, "", "Rote Zwiebeln", true]]);
  });

  it("zusammengesetzte Wörter werden so übernommen, wie gesagt", () => {
    expect(kurz("Kirschtomaten")).toEqual([[null, "", "Kirschtomaten", true]]);
    expect(kurz("Rinderhackfleisch")).toEqual([[null, "", "Rinderhackfleisch", true]]);
  });

  it("Unbekanntes wird ein Chip mit „Meintest du …?“", () => {
    const [p] = ruleParseLeftovers("Brokolo Zeug");
    expect(p.known).toBe(true); // „Brokolo“ ist ein Tippfehler von Brokkoli
    const unknown = ruleParseLeftovers("Xylophon");
    expect(unknown).toEqual([{ name: "Xylophon", heard: "Xylophon", known: false, suggestion: null, amount: null, unit: "" }]);
    const fast = ruleParseLeftovers("Kse");
    expect(fast[0].known).toBe(false);
    expect(fast[0].suggestion).toBe("Käse");
  });

  it("unbekanntes Adjektiv bleibt beim unbekannten Wort", () => {
    const parts = ruleParseLeftovers("rote Quxe");
    expect(parts).toHaveLength(1);
    expect(parts[0]).toMatchObject({ known: false, heard: "rote Quxe" });
    // Adjektiv am Ende ohne Lebensmittel
    expect(ruleParseLeftovers("Milch frische")[0].name).toBe("Milch");
  });

  it("Zahlwort beginnt einen neuen Abschnitt; Menge gehört zur ersten Zutat", () => {
    expect(kurz("zwei Äpfel drei Birnen")).toEqual([
      [2, "", "Äpfel", true],
      [3, "", "Birnen", true],
    ]);
    expect(kurz("2 Äpfel Bananen")).toEqual([
      [2, "", "Äpfel", true],
      [null, "", "Bananen", true],
    ]);
  });

  it("Füllphrasen und Satzzeichen", () => {
    expect(kurz("Wir haben im Kühlschrank noch ein bisschen Käse; ich glaube Quark!")).toEqual([
      [null, "", "Käse", true],
      [null, "", "Quark", true],
    ]);
    expect(kurz("ähm, also, ja")).toEqual([]);
    expect(kurz("„Milch“")).toEqual([[null, "", "Milch", true]]);
  });

  it("Einheit mit Punkt („Pck.“) trennt nicht (Fehler: „Pck“ wurde ein unbekannter Chip)", () => {
    expect(kurz("2 Pck. Hefe")).toEqual([[2, "Packung", "Hefe", true]]);
    expect(kurz("zwei")).toEqual([[null, "", "Zwei", false]]);
  });

  it("asynchrone Schnittstelle liefert dasselbe", async () => {
    expect(await parseLeftovers("ein Becher Sahne")).toEqual(ruleParseLeftovers("ein Becher Sahne"));
  });
});

describe("Lebensmittel erkennen", () => {
  it("exakt, ohne Akzente und Mehrzahl", () => {
    expect(findFood("creme fraiche")?.food.singular).toBe("Crème fraîche");
    // Umlaute werden für den Vergleich entfernt: „Äpfel“ trifft den Schlüssel von „Apfel“
    expect(findFood("Äpfel")).toMatchObject({ food: { singular: "Apfel", plural: "Äpfel" }, exact: true });
    expect(findFood("Birnen")).toMatchObject({ form: "plural", exact: true });
    expect(findFood("Quatsch")).toBeNull();
  });

  it("unscharf mit Tippfehler, kurze Wörter nicht", () => {
    expect(recognizeFood("Brokoli")).toMatchObject({ known: true, match: { exact: false } });
    expect(recognizeFood("Ei").known).toBe(true);
    expect(recognizeFood("Eu").known).toBe(false);
    expect(recognizeFood("!!!")).toEqual({ known: false, suggestion: null });
  });

  it("Form zur Menge", () => {
    const food = { singular: "Karotte", plural: "Karotten" };
    expect(foodName(food, 1, "", "plural")).toBe("Karotte");
    expect(foodName(food, 3, "", "singular")).toBe("Karotten");
    expect(foodName(food, 3, "kg", "singular")).toBe("Karotte");
    expect(foodName(food, null, "", "plural")).toBe("Karotten");
  });
});
