// Kochtipp – spontan mit Mia: Antwort verstehen, EIN Gericht wählen,
// Personen umrechnen, Mütze ab dem 3. Nutzungstag.
import { describe, expect, it } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { cookCandidates, parseCookWish, pickCookDish, scaleAmount, understood, usesText, type CookWish } from "@/lib/essen/kochtipp/pick";
import { isKochtippRequest, kochtippStart, sourceChips } from "@/lib/essen/kochtipp/start";
import { hatVisible, loadKochtipp, noteKochtippDay, noteKochtippShown, rememberKochtipp, unlockKochtipp } from "@/lib/essen/kochtipp/store";
import type { PantryItem } from "@/lib/vorrat/pantry";

const item = (name: string, addedAt = "2026-10-21", place: PantryItem["place"] = "kuehlschrank"): PantryItem => ({ id: name, name, amount: null, unit: "", addedAt, place });
const wish = (over: Partial<CookWish> = {}): CookWish => ({ source: null, have: [], without: [], category: null, quick: false, persons: null, ...over });
const ALL = cookCandidates([]);
const pick = (w: CookWish, stock: PantryItem[] = [], extra: { soon?: string[]; exclude?: string[]; avoid?: string[] } = {}) =>
  pickCookDish({ candidates: ALL, stock, wish: w, soon: extra.soon ?? [], exclude: extra.exclude ?? [], avoid: extra.avoid ?? [] });

describe("Antwort verstehen", () => {
  it("Zutaten aus „Ich hab noch …“ – auch gesprochen, ohne Füllwörter", () => {
    expect(parseCookWish("Ich hab noch Hähnchen, Reis und Paprika").have).toEqual(["Hähnchen", "Reis", "Paprika"]);
    expect(parseCookWish("wir haben noch ein bisschen Hack und die Paprika da").have).toEqual(["Hack", "Paprika"]);
    expect(parseCookWish("Nudeln, Zucchini und Feta").have).toEqual(["Nudeln", "Zucchini", "Feta"]);
  });

  it("Art, schnell, Personen, ohne", () => {
    expect(parseCookWish("was mit Fisch")).toMatchObject({ category: "fisch", have: [] });
    expect(parseCookWish("was Schnelles für 4")).toMatchObject({ quick: true, persons: 4 });
    expect(parseCookWish("vegetarisch für zwei")).toMatchObject({ category: "vegetarisch", persons: 2 });
    expect(parseCookWish("lieber ohne Reis").without).toEqual(["Reis"]);
  });

  it("Quelle aus den Schnellantworten", () => {
    expect(parseCookWish("Schau in den Vorrat").source).toBe("vorrat");
    expect(parseCookWish("Reste verwerten").source).toBe("reste");
    expect(parseCookWish("Neu einkaufen").source).toBe("einkauf");
    expect(understood(parseCookWish("Wie wird das Wetter?"))).toBe(false);
  });
});

describe("Gericht wählen", () => {
  it("genannte Zutaten zählen als da → Hähnchen-Gericht, alles im Haus", () => {
    const card = pick(parseCookWish("Ich hab noch Hähnchen, Reis und Paprika"));
    expect(card).toMatchObject({ title: "Hähnchenpfanne mit Reis", badge: "alles", needs: [] });
    expect(usesText(card!.uses)).toBe("nimmt deine Hähnchen, Reis und Paprika");
  });

  it("Vorrat: höchstens eine Zutat auf die Liste", () => {
    const card = pick(wish({ source: "vorrat" }), [item("Nudeln"), item("Zucchini")]);
    expect(card?.needs.length).toBeLessThanOrEqual(1);
    expect(card?.title).toBe("Nudeln mit Zucchini");
    expect(pick(wish({ source: "vorrat" }), [item("Zimtstangen")])).toBeNull();
  });

  it("Reste zuerst: was schon länger im Kühlschrank liegt", () => {
    const card = pick(wish({ source: "reste" }), [item("Kartoffeln", "2026-10-15"), item("Quark", "2026-10-15"), item("Nudeln")], { soon: ["Kartoffeln", "Quark"] });
    expect(card).toMatchObject({ title: "Pellkartoffeln mit Quark", badge: "reste" });
  });

  it("Neu einkaufen: der Vorrat zählt nicht, Einkauf nötig", () => {
    const card = pick(wish({ source: "einkauf", category: "fisch" }), [item("Nudeln"), item("Thunfisch"), item("Tomaten")]);
    expect(card?.category).toBe("fisch");
    expect(card?.badge).toBe("einkauf");
  });

  it("keine Wiederholung, Allergien und „ohne“ strikt", () => {
    const first = pick(parseCookWish("Ich hab noch Hähnchen, Reis und Paprika"))!;
    const next = pick(parseCookWish("Ich hab noch Hähnchen, Reis und Paprika"), [], { exclude: [first.title] });
    expect(next?.title).not.toBe(first.title);
    expect(pick(wish({ have: ["Reis"] }), [], { avoid: ["Reis"] })).toBeNull();
    expect(pick(parseCookWish("Ich hab noch Paprika, lieber ohne Reis"))?.ingredients).not.toContain("Reis");
  });

  it("schnell = höchstens 20 Minuten", () => {
    expect(pick(wish({ source: "einkauf", quick: true }))!.minutes).toBeLessThanOrEqual(20);
  });

  it("eigene Rezepte gehören dazu", () => {
    const own = cookCandidates([{ id: "r1", title: "Omas Linsentopf", kind: "kochen", category: "vegetarisch", prepMinutes: 30, servings: 4, ingredients: [{ id: "i", amount: 200, unit: "g", name: "Linsen" }] } as never]);
    expect(own[0]).toMatchObject({ title: "Omas Linsentopf", recipeId: "r1" });
  });
});

describe("Personen umrechnen", () => {
  it("rechnet Mengen auf die Personenzahl um", () => {
    expect(scaleAmount(400, 4, 2)).toBe(200);
    expect(scaleAmount(3, 4, 2)).toBe(1.5);
    expect(scaleAmount(250, 4, 6)).toBe(380);
    expect(scaleAmount(null, 4, 2)).toBeNull();
  });
});

describe("Mias Anfang", () => {
  it("fragt kurz und nennt die letzte Wahl zuerst", () => {
    expect(kochtippStart(null)).toEqual(["Lust auf was ganz anderes? 😋", "Sag mir, was noch da ist – oder kaufen wir neu ein?"]);
    expect(kochtippStart({ source: "vorrat" })[1]).toMatch(/Wie letztes Mal aus dem Vorrat\?$/);
    expect(sourceChips({ source: "einkauf" })[0]).toBe("Neu einkaufen");
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
});
