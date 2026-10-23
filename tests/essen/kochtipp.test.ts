// Kochidee (intern `kochtipp`): Gerichte-Quelle, Personen umrechnen, Knopf
// ab dem 3. Nutzungstag, Erzähltes „im Haus“ (die Auswahl: kochidee.test.ts).
import { describe, expect, it } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { cookCandidates, scaleAmount } from "@/lib/essen/kochtipp/pick";
import { isKochtippRequest } from "@/lib/essen/kochtipp/start";
import { hatVisible, loadKochtipp, noteImHaus, noteKochtippDay, noteKochtippShown, rememberKochtipp, unlockKochtipp } from "@/lib/essen/kochtipp/store";

describe("Gerichte-Quelle und Personen", () => {
  it("eigene Rezepte gehören dazu", () => {
    const own = cookCandidates([{ id: "r1", title: "Omas Linsentopf", kind: "kochen", category: "vegetarisch", prepMinutes: 30, servings: 4, ingredients: [{ id: "i", amount: 200, unit: "g", name: "Linsen" }] } as never]);
    expect(own[0]).toMatchObject({ title: "Omas Linsentopf", recipeId: "r1" });
  });

  it("rechnet Mengen auf die Personenzahl um", () => {
    expect(scaleAmount(400, 4, 2)).toBe(200);
    expect(scaleAmount(3, 4, 2)).toBe(1.5);
    expect(scaleAmount(250, 4, 6)).toBe(380);
    expect(scaleAmount(null, 4, 2)).toBeNull();
  });

  it("„Kochidee“, „Kochtipp“, „Was soll ich kochen?“ öffnen die Kochidee", () => {
    expect(isKochtippRequest("Kochidee")).toBe(true);
    expect(isKochtippRequest("Kochtipp")).toBe(true);
    expect(isKochtippRequest("Was soll ich heute kochen?")).toBe(true);
    expect(isKochtippRequest("Ich hab noch 2 Portionen Chili eingefroren")).toBe(false);
  });
});

describe("Mütze schrittweise freischalten", () => {
  const withApp = (since: string | null, fn: () => void) => {
    fakeWindow(since ? { "wasgibts.beispiel": JSON.stringify({ version: 1, since }) } : {});
    try {
      fn();
    } finally {
      noBrowser();
    }
  };

  it("neu: Tag 1 und 2 keine Mütze, ab Tag 3 schon (Kalendertage, nicht Stunden)", () =>
    withApp("2026-10-20", () => {
      noteKochtippDay("2026-10-20");
      noteKochtippDay("2026-10-20");
      expect(hatVisible(loadKochtipp(), false)).toBe(false);
      noteKochtippDay("2026-10-21");
      expect(hatVisible(loadKochtipp(), false)).toBe(false);
      noteKochtippDay("2026-10-23");
      expect(hatVisible(loadKochtipp(), false)).toBe(true);
    }));

  it("Beispiel-Tag zeigt die Mütze, ein echter Tag 1 nicht – „ab Tag 3“ bleibt", () =>
    withApp("2026-10-21", () => {
      noteKochtippDay("2026-10-21");
      expect(hatVisible(loadKochtipp(), false, true)).toBe(true);
      expect(hatVisible(loadKochtipp(), false)).toBe(false);
      expect(loadKochtipp()).toMatchObject({ unlocked: false, popped: false });
    }));

  it("Nachfrage an Tag 1 oder „Alles zeigen“ → sofort", () =>
    withApp("2026-10-21", () => {
      noteKochtippDay("2026-10-21");
      expect(hatVisible(loadKochtipp(), true)).toBe(true);
      expect(hatVisible(loadKochtipp(), false)).toBe(false);
      unlockKochtipp();
      expect(loadKochtipp()).toMatchObject({ unlocked: true, popped: true });
    }));

  it("schon länger als 2 Tage dabei → sofort sichtbar", () =>
    withApp("2026-10-10", () => {
      noteKochtippDay("2026-10-21");
      expect(hatVisible(loadKochtipp(), false)).toBe(true);
    }));

  it("merkt die letzte Wahl und die letzten 10 Gerichte", () =>
    withApp(null, () => {
      rememberKochtipp({ source: "reste", persons: 2, category: null });
      for (let i = 0; i < 12; i++) noteKochtippShown(`G${i}`);
      expect(loadKochtipp().last?.source).toBe("reste");
      expect(loadKochtipp().shown).toHaveLength(10);
      expect(loadKochtipp().shown[0]).toBe("G2");
    }));

  it("Kochidee: Erzähltes „im Haus“ – 3 Tage, ältere Stände ohne Feld bleiben lesbar", () =>
    withApp(null, () => {
      expect(loadKochtipp().haus).toEqual([]);
      noteImHaus(["Hähnchen"], "2026-10-19");
      noteImHaus(["Paprika", "Sahne"], "2026-10-21");
      expect(loadKochtipp().haus.map((h) => h.name)).toEqual(["Hähnchen", "Paprika", "Sahne"]);
      noteImHaus(["Reis"], "2026-10-23");
      expect(loadKochtipp().haus.map((h) => h.name)).toEqual(["Paprika", "Sahne", "Reis"]);
    }));
});
