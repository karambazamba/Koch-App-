// Vorschläge erst anschauen, dann nehmen (A-038): Vorschau-Zustand, „Nehmen“
// aus der Vorschau = „Nehmen“ auf der Karte, Rezept genau einmal laden und
// übernehmen (Testmodus über den echten Server-Weg), Hinweis nur einmal,
// Mias Wochenplan-Vorschlag bekommt das Rezept, alle Auswahl-Stellen nutzen
// denselben Hook.
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { bekanntesRezept, ladeReducer, nehmenMitRezept, vorschauRezept, zeigeHinweis, HINWEIS_TEXT, type Vorschlag } from "@/lib/essen/vorschau";
import { alsRezept, geladenFuer, ladeRezept, rezeptAusOps, vergissGeladene, vorschauBitte, vorschauTitel } from "@/lib/essen/vorschau/laden";
import { rezeptInVorschlag } from "@/lib/essen/vorschau/wochenplan";
import { applyOps, selectedOps, type ChangeOp, type NewRecipe } from "@/lib/begleitung/ops";
import { runAssistant } from "@/lib/begleitung/engine";
import { createMockModel } from "@/lib/begleitung/mock";
import { pruefHaushalt, PRUEF_HEUTE, PRUEF_UHR, pruefWetter } from "@/lib/begleitung/pruefstand/haushalt";
import { needsLargeModel } from "@/lib/begleitung/modellwahl";
import { takeForDay } from "@/lib/essen/spontanTake";
import { takeOutcome } from "@/lib/essen/kochtipp/idee";
import { listenMenge, type CookCard } from "@/lib/essen/kochtipp/pick";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { fakeWindow } from "../helpers";

const NEU: NewRecipe = {
  ref: "rezept-1",
  title: "Kürbisrisotto",
  category: "vegetarisch",
  servings: 4,
  prepMinutes: 35,
  ingredients: [
    { amount: 300, unit: "g", name: "Risottoreis" },
    { amount: 500, unit: "g", name: "Hokkaido" },
  ],
  steps: ["Kürbis würfeln.", "Reis anschwitzen, Brühe angießen, 20 Minuten rühren."],
  shortSteps: ["Kürbis würfeln", "Reis rühren, 20 Min"],
  note: "",
};
const OHNE: Vorschlag = { title: "Kürbisrisotto", category: "vegetarisch", minutes: 35, needs: ["Hokkaido"] };

beforeEach(() => vergissGeladene());

describe("Vorschau-Zustand", () => {
  it("„Mia schreibt das Rezept …“ → Rezept bzw. Fehler → Nochmal", () => {
    expect(ladeReducer("fertig", "start")).toBe("laeuft");
    expect(ladeReducer("laeuft", "geschafft")).toBe("fertig");
    expect(ladeReducer("laeuft", "fehlgeschlagen")).toBe("fehler");
    expect(ladeReducer("fehler", "start")).toBe("laeuft");
    // ein spätes Fehlschlagen ändert ein fertiges Rezept nicht
    expect(ladeReducer("fertig", "fehlgeschlagen")).toBe("fertig");
  });

  it("eingebaute Gerichte haben ihr Rezept sofort (über den Titel), KI-Vorschläge ohne Rezept nicht", () => {
    const eingebaut = bekanntesRezept({ title: "Spaghetti Bolognese", category: "fleisch", minutes: 30 }, {});
    expect(eingebaut?.ingredients.length).toBeGreaterThan(0);
    expect(bekanntesRezept(OHNE, {})).toBeUndefined();
    expect(vorschauRezept(OHNE, {})).toBeUndefined();
  });
});

describe("Rezept nachladen: genau einmal, gemerkt, still nochmal", () => {
  it("zwei Vorschauen gleichzeitig → eine Frage; danach gemerkt (auch für „Nehmen“)", async () => {
    const frage = vi.fn(async () => NEU);
    const [a, b] = await Promise.all([ladeRezept("Kürbisrisotto", frage), ladeRezept("kürbisrisotto ", frage)]);
    expect(frage).toHaveBeenCalledTimes(1);
    expect(frage).toHaveBeenCalledWith(vorschauBitte("Kürbisrisotto"));
    expect(a).toBe(b);
    await ladeRezept("Kürbisrisotto", frage);
    expect(frage).toHaveBeenCalledTimes(1);
    expect(vorschauRezept(OHNE, {})?.ingredients.map((i) => i.name)).toEqual(["Risottoreis", "Hokkaido"]);
    expect(geladenFuer("Kürbisrisotto")?.rezept.shortSteps).toEqual(NEU.shortSteps);
  });

  it("Fehler: einmal still nochmal; geht beides schief → null, „Nochmal“ fragt neu", async () => {
    const wackelt = vi.fn().mockRejectedValueOnce(new Error("weg")).mockResolvedValueOnce(NEU);
    expect(await ladeRezept("Kürbisrisotto", wackelt)).not.toBeNull();
    expect(wackelt).toHaveBeenCalledTimes(2);
    vergissGeladene();
    const kaputt = vi.fn(async () => {
      throw new Error("aus");
    });
    expect(await ladeRezept("Kürbisrisotto", kaputt)).toBeNull();
    expect(kaputt).toHaveBeenCalledTimes(2);
    expect(await ladeRezept("Kürbisrisotto", vi.fn(async () => NEU))).not.toBeNull();
  });

  it("Fehlertext wie überall: „Hat grad nicht geklappt. Nochmal?“", () => {
    const quelle = readFileSync("src/components/essen/vorschau/RezeptVorschau.tsx", "utf8");
    expect(quelle).toContain("Hat grad nicht geklappt. Nochmal?");
    expect(quelle).toContain("schreibt das Rezept …");
    expect(tidyMiaText("Hat grad nicht geklappt. Nochmal?")).toBe("Hat grad nicht geklappt. Nochmal?");
  });

  it("Testmodus über den echten Server-Weg: genau ein neues Rezept, nichts eingetragen, großes Modell", async () => {
    const req = { deviceId: "vorschau", today: PRUEF_HEUTE, clock: PRUEF_UHR, messages: [{ role: "user" as const, text: vorschauBitte("Kürbisrisotto") }], pending: [], data: pruefHaushalt(), forecast: pruefWetter(), tipsThisWeek: 0, shoppingNames: [] };
    expect(needsLargeModel(req)).toBe(true);
    expect(vorschauTitel(vorschauBitte("Kürbisrisotto"))).toBe("Kürbisrisotto");
    const reply = await runAssistant(req as never, createMockModel(), "mock");
    expect(reply.ops.map((o) => o.type)).toEqual(["add_recipe"]);
    const neu = rezeptAusOps(reply.ops, "Kürbisrisotto");
    expect(neu?.title).toBe("Kürbisrisotto");
    expect(neu?.shortSteps?.length).toBe(neu?.steps.length);
  });
});

describe("„Nehmen“ aus der Vorschau = „Nehmen“ auf der Karte", () => {
  const profile = { ...createEmptyProfile(), shoppingDay: "samstag" as const };
  const today = new Date("2026-10-21T10:30:00");
  const eintragen = (card: { title: string; category: "vegetarisch"; recipeId?: string }) => (id?: string) => takeForDay({ profile, weekPlans: {}, mealPlans: {}, recipes: {} }, today, id ? { ...card, recipeId: id } : card, "2026-10-21", { spontan: true });

  it("Rezept gibt’s schon: beide Wege tragen genau gleich ein, nichts wird gespeichert", () => {
    const card = { title: "Spaghetti Bolognese", category: "vegetarisch" as const };
    const v: Vorschlag = { ...card, minutes: 30 };
    const ergebnisse: unknown[] = [];
    const speichern = vi.fn();
    nehmenMitRezept(v, {}, (id) => ergebnisse.push(eintragen(card)(id)), speichern); // Karte
    nehmenMitRezept(v, {}, (id) => ergebnisse.push(eintragen(card)(id)), speichern); // Vorschau
    expect(ergebnisse[0]).toEqual(ergebnisse[1]);
    expect(JSON.stringify(ergebnisse[0])).toContain("Spaghetti Bolognese");
    expect(speichern).not.toHaveBeenCalled();
  });

  it("KI-Vorschlag: das eben geschriebene Rezept kommt mit (ins Kochbuch, Plan zeigt darauf) – ohne neu zu fragen", async () => {
    const frage = vi.fn(async () => NEU);
    await ladeRezept("Kürbisrisotto", frage);
    const speichern = vi.fn();
    const nehmen = vi.fn();
    nehmenMitRezept(OHNE, {}, nehmen, speichern);
    const gemerkt = geladenFuer("Kürbisrisotto")!;
    expect(speichern).toHaveBeenCalledWith(gemerkt.rezept);
    expect(nehmen).toHaveBeenCalledWith(gemerkt.rezept.id, gemerkt);
    expect(frage).toHaveBeenCalledTimes(1);
    const r = eintragen({ title: "Kürbisrisotto", category: "vegetarisch" })(gemerkt.rezept.id);
    expect(r.ok && JSON.stringify(r.weeks)).toContain(gemerkt.rezept.id);
    // schon im Kochbuch → nicht doppelt
    nehmenMitRezept(OHNE, { [gemerkt.rezept.id]: gemerkt.rezept }, nehmen, speichern);
    expect(speichern).toHaveBeenCalledTimes(1);
  });

  it("fehlende Zutaten gehen auf die Liste – mit Mengen aus Mias Rezept, umgerechnet", async () => {
    await ladeRezept("Kürbisrisotto", async () => NEU);
    const card: CookCard = { title: "Kürbisrisotto", minutes: 35, category: "vegetarisch", ingredients: ["Hokkaido"], uses: [], needs: ["Hokkaido"], badge: "einkauf" };
    const { toList, date } = takeOutcome(card, null, false, "2026-10-21", "2026-10-22");
    expect(date).toBe("2026-10-21");
    expect(toList).toEqual(["Hokkaido"]);
    expect(listenMenge("Hokkaido", geladenFuer("Kürbisrisotto")!.rezept, 2)).toEqual({ amount: "250 g" });
    expect(listenMenge("Hokkaido", undefined, 2)).toEqual({ amount: "" });
    // Über Einkauf neu: auf die Packung gerundet, Rezeptmenge als Hinweis
    const milch = { ...geladenFuer("Kürbisrisotto")!.rezept, servings: 2, ingredients: [{ id: "m", amount: 250, unit: "ml", name: "Milch" }] };
    expect(listenMenge("Milch", milch, 2)).toEqual({ amount: "", rezeptMenge: "250 ml" });
  });
});

describe("Mias Wochenplan-Vorschlag: Rezept hängt am Gericht", () => {
  it("Text-Gericht → neues KI-Rezept, „Passt“ legt es an und trägt es ein", () => {
    const ops: ChangeOp[] = [{ id: "op1", type: "set_meal", slot: { weekStart: "2026-10-19", weekday: "Freitag" }, dish: { kind: "text", title: "Kürbisrisotto", category: null } }];
    const next = rezeptInVorschlag(ops, "op1", NEU);
    expect(next.map((o) => o.type)).toEqual(["add_recipe", "set_meal"]);
    const chosen = selectedOps(next, new Set(["op1"]));
    expect(chosen).toHaveLength(2);
    const { data } = applyOps(pruefHaushalt(), chosen);
    const recipe = Object.values(data.recipes).find((r) => r.title === "Kürbisrisotto");
    expect(recipe).toBeDefined();
    expect(JSON.stringify(data.mealPlans)).toContain(recipe!.id);
    // ohne Wahl kommt auch das Rezept nicht
    expect(selectedOps(next, new Set())).toHaveLength(0);
  });

  it("Rezept aus Mias Vorschlag lässt sich anzeigen", () => {
    expect(alsRezept(NEU).ingredients.map((i) => i.id)).toEqual(["rezept-1-0", "rezept-1-1"]);
  });
});

describe("Hinweis „Antippen zum Reinschauen.“", () => {
  it("nur unter der ersten Karte, nur solange noch nie gezeigt", () => {
    expect(HINWEIS_TEXT).toBe("Antippen zum Reinschauen.");
    expect(zeigeHinweis(false, 0)).toBe(true);
    expect(zeigeHinweis(false, 1)).toBe(false);
    expect(zeigeHinweis(true, 0)).toBe(false);
    expect(zeigeHinweis(undefined, 0)).toBe(false);
  });

  it("einmal gezeigt = gemerkt (Einmal-Hinweise im Speicher-Verzeichnis)", async () => {
    vi.resetModules();
    fakeWindow();
    const h = await import("@/lib/core/hints");
    expect(h.hintSeen("vorschau-antippen")).toBe(false);
    h.markHintSeen("vorschau-antippen");
    h.markHintSeen("vorschau-antippen");
    expect(h.hintSeen("vorschau-antippen")).toBe(true);
    expect(JSON.parse(localStorage.getItem("wasgibts.einmalhinweise")!).seen.filter((s: string) => s === "vorschau-antippen")).toHaveLength(1);
    expect(readFileSync("src/lib/core/storage.ts", "utf8")).toContain("wasgibts.einmalhinweise");
  });
});

describe("Überall dasselbe Verhalten (Quelltext)", () => {
  const stellen = ["src/components/begleitung/ChatHistory.tsx", "src/components/essen/SwapSheet.tsx", "src/components/essen/sieben/TagFenster.tsx", "src/components/begleitung/ProposalCard.tsx"];
  it.each(stellen)("%s nutzt den einen Hook useVorschau", (datei) => {
    const quelle = readFileSync(datei, "utf8");
    expect(quelle).toContain("useVorschau(");
    expect(quelle).toContain("vorschau.fenster");
  });

  it("Vorschau = Bausteine der Rezeptseite in EINEM Fenster (Sheet), Bewegung nur Deckkraft, reduziert = aus", () => {
    const quelle = readFileSync("src/components/essen/vorschau/RezeptVorschau.tsx", "utf8");
    expect(quelle).toContain("<Sheet");
    expect(quelle).toContain("<RezeptZutaten");
    expect(quelle).toContain("<RezeptSchritte");
    expect(quelle).toContain("Zurück zu den Ideen");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/@keyframes vorschau-schreibt \{ from \{ opacity: 1; \} to \{ opacity: \.45; \} \}/);
    expect(css).toContain(".kochidee-wippen, .vorschau-schreibt { animation: none; }");
  });

  it("Spontan kochen (IdeaCards) und Kochidee (Zeile, Karussell) öffnen die Vorschau", () => {
    expect(readFileSync("src/components/essen/IdeaCards.tsx", "utf8")).toContain("onPreview");
    const views = readFileSync("src/components/essen/kochtipp/KochideeViews.tsx", "utf8");
    expect(views.match(/data-vorschau-oeffnen/g)?.length).toBeGreaterThanOrEqual(2);
  });
});
