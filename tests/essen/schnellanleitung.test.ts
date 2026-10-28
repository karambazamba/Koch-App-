// Schnellanleitung (Tafel 122 Nachtrag): alle eingebauten Gerichte haben
// eine fest hinterlegte Kurzfassung, jede Zeile höchstens 8 Wörter, gleiche
// Schrittzahl wie ausführlich, Zeiten bleiben erhalten (Timer-Chip).
import { describe, expect, it } from "vitest";
import { GERICHTE } from "@/lib/essen/gerichte";
import { BUILTIN_COOK, rezeptIdFuer } from "@/lib/essen/kochen";
import { DEMO_RECIPES } from "@/lib/essen/demoDish";
import { KURZ, KURZ_WOERTER, ersterSatz, kurzSchritte, schrittTeile, woerter } from "@/lib/essen/kurz";
import { kurzVonMia } from "@/lib/essen/kurz/mia";
import { stepMinutes } from "@/lib/essen/kochSession";

describe("Kurzfassungen in den Daten", () => {
  it("alle 150 Gerichte haben ein Rezept mit fest hinterlegter Kurzfassung", () => {
    expect(GERICHTE).toHaveLength(150);
    const ohne = GERICHTE.filter((g) => !KURZ[rezeptIdFuer(g.title) ?? ""]).map((g) => g.title);
    expect(ohne).toEqual([]);
  });

  it("auch jedes andere eingebaute Kochrezept und die Beispielgerichte – keine verwaisten Einträge", () => {
    const ids = [...BUILTIN_COOK, ...DEMO_RECIPES].map((r) => r.id);
    expect(ids.filter((id) => !KURZ[id])).toEqual([]);
    expect(Object.keys(KURZ).filter((id) => !ids.includes(id))).toEqual([]);
  });

  it("gleiche Schrittzahl, jede Zeile höchstens 8 Wörter, kein Schlusspunkt", () => {
    for (const r of [...BUILTIN_COOK, ...DEMO_RECIPES]) {
      const kurz = KURZ[r.id];
      expect(kurz, r.id).toHaveLength(r.steps.length);
      for (const line of kurz) {
        expect(woerter(line), `${r.id}: ${line}`).toBeLessThanOrEqual(KURZ_WOERTER);
        expect(line, r.id).not.toMatch(/[.]$/);
        // Passt auf dem iPhone SE in eine Zeile neben Nummer und Kästchen (höchstens ~40 Zeichen)
        expect(line.length, `${r.id}: ${line}`).toBeLessThanOrEqual(42);
      }
    }
  });

  it("Zeiten aus dem Rezept stehen auch in der Kurzfassung (gleicher Timer)", () => {
    for (const r of [...BUILTIN_COOK, ...DEMO_RECIPES]) {
      const kurz = KURZ[r.id];
      r.steps.forEach((step, i) => {
        const lang = stepMinutes(step);
        const chips = schrittTeile(kurz[i]).flatMap((p) => ("min" in p ? [p.min] : []));
        if (lang !== null) expect(chips, `${r.id} #${i + 1}: ${kurz[i]}`).toContain(lang);
        else expect(chips, `${r.id} #${i + 1}: ${kurz[i]}`).toEqual([]);
      });
    }
  });
});

describe("kurzSchritte", () => {
  const base = { id: "eigen-1", steps: ["Reis kochen. Dann abgießen.", "Gemüse schneiden!", "Bei 180 °C ca. 20 Min. backen."] };

  it("eigene Kurzfassung (von Mia) geht vor – nur bei passender Schrittzahl", () => {
    expect(kurzSchritte({ ...base, shortSteps: ["Reis", "Gemüse", "Backen"] })).toEqual(["Reis", "Gemüse", "Backen"]);
    expect(kurzSchritte({ ...base, shortSteps: ["Nur eins"] })).toEqual(["Reis kochen", "Gemüse schneiden", "Bei 180 °C ca. 20 Min. backen"]);
  });

  it("fehlt sie, kürzt die App auf den ersten Satz je Schritt", () => {
    expect(ersterSatz("Reis kochen. Dann abgießen.")).toBe("Reis kochen");
    expect(ersterSatz("Etwa 1.5 kg nehmen.")).toBe("Etwa 1.5 kg nehmen");
    expect(ersterSatz("Ohne Punkt")).toBe("Ohne Punkt");
  });

  it("eingebaute Rezepte nach ID, übernommene („In unsere Rezepte“) nach gleichen Schritten", () => {
    const r = BUILTIN_COOK.find((x) => x.id === "k:bolognese")!;
    expect(kurzSchritte(r)).toEqual(KURZ["k:bolognese"]);
    expect(kurzSchritte({ id: "neu-123", steps: r.steps })).toEqual(KURZ["k:bolognese"]);
  });

  it("kurzVonMia: nur Texte, nur mit gleicher Schrittzahl", () => {
    expect(kurzVonMia(["Reis kochen ", "Gemüse  braten"], 2)).toEqual(["Reis kochen", "Gemüse braten"]);
    expect(kurzVonMia(["Reis kochen"], 2)).toBeUndefined();
    expect(kurzVonMia("Reis", 1)).toBeUndefined();
  });
});

describe("schrittTeile (Timer-Chips)", () => {
  it("„10 Min“, „10 Minuten“, „12 bis 15 Minuten“, „1 Stunde“ werden Chips", () => {
    expect(schrittTeile("Tomaten dazu, 10 Min köcheln")).toEqual([{ text: "Tomaten dazu, " }, { min: 10, text: "10 Min" }, { text: " köcheln" }]);
    expect(schrittTeile("In der Brühe 20 Minuten weich kochen.")[1]).toEqual({ min: 20, text: "20 Minuten" });
    expect(schrittTeile("Spargel 12 bis 15 Minuten garen")[1]).toEqual({ min: 15, text: "12 bis 15 Minuten" });
    expect(schrittTeile("1 Stunde ruhen lassen")[0]).toEqual({ min: 60, text: "1 Stunde" });
  });

  it("ohne Zeit ein Teil, Zahlen ohne Einheit bleiben Text", () => {
    expect(schrittTeile("Reis kochen")).toEqual([{ text: "Reis kochen" }]);
    expect(schrittTeile("Bei 180 °C backen")).toEqual([{ text: "Bei 180 °C backen" }]);
  });
});

describe("ohneZeit / schrittZeiten", () => {
  it("Zeit steht als Chip daneben, der Text bleibt lesbar", async () => {
    const { ohneZeit, schrittZeiten } = await import("@/lib/essen/kurz");
    expect(ohneZeit("Kartoffeln 20 Min kochen")).toBe("Kartoffeln kochen");
    expect(ohneZeit("10 Min backen")).toBe("Backen");
    expect(ohneZeit("Hacksoße kochen, 20 Min")).toBe("Hacksoße kochen");
    expect(ohneZeit("Tomaten dazu, 10 Minuten köcheln, würzen.")).toBe("Tomaten dazu, köcheln, würzen.");
    expect(ohneZeit("Reis kochen")).toBe("Reis kochen");
    expect(schrittZeiten("Spargel 12 bis 15 Minuten garen")).toEqual([{ min: 15, text: "12 bis 15 Minuten" }]);
  });
});

describe("Kurzfassung gespeichert (Kochbuch v3, additiv)", () => {
  it("bleibt beim Laden erhalten, Kaputtes fällt weg; ältere Rezepte ohne bleiben gültig", async () => {
    const { fakeWindow } = await import("../helpers");
    const win = fakeWindow({
      "wasgibts.kochbuch": JSON.stringify({
        version: 3,
        recipes: {
          a: { title: "Suppe", steps: ["Kochen."], shortSteps: ["Kochen"] },
          b: { title: "Brot", steps: ["Backen."], shortSteps: [1] },
          c: { title: "Alt", steps: ["Rühren."] },
        },
      }),
    });
    const { restoreRecipe } = await import("@/lib/essen/cookbook");
    restoreRecipe({ id: "d", title: "Neu", steps: ["x"], shortSteps: ["y"] });
    const saved = JSON.parse(win.localStorage.getItem("wasgibts.kochbuch")!).recipes;
    expect(saved.a.shortSteps).toEqual(["Kochen"]);
    expect(saved.b.shortSteps).toBeUndefined();
    expect(saved.c.shortSteps).toBeUndefined();
    expect(saved.d.shortSteps).toEqual(["y"]);
  });

  it("Mias Rezept (add_recipe) bringt die Kurzfassung ins Kochbuch", async () => {
    const { applyOps } = await import("@/lib/begleitung/ops");
    const data = { recipes: {}, mealPlans: {}, weekPlans: {} } as unknown as Parameters<typeof applyOps>[0];
    const r = applyOps(data, [{ id: "1", type: "add_recipe", recipe: { ref: "rezept-1", title: "Dal", category: "vegetarisch", servings: 4, prepMinutes: 20, ingredients: [], steps: ["A.", "B."], shortSteps: ["A", "B"], note: "" } }]);
    const recipe = Object.values(r.data.recipes)[0];
    expect(recipe.shortSteps).toEqual(["A", "B"]);
  });
});
