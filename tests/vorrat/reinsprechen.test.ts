// „Im Haus“ – reinsprechen statt pflegen (Tafel 102): ein Satz, mehrere
// Sachen, rein und raus; Satzteile werden nie zu Sachen (Fehler 28.10.:
// „Gar nicht im Haus“ stand als Artikel). Vorschlag „Hab ich so verstanden:“,
// Testmodus, Prüfstand, Schnelleingabe, Seite (über der Leiste).
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { imHausOps, imHausVerstehen, imHausVorschlag, isImHausFrage, isImHausVorschlag } from "@/lib/vorrat/reinsprechen";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { bewerte } from "@/lib/begleitung/pruefstand/bewerten";
import { stageTopic } from "@/lib/begleitung/stage";
import { ask, afterTools, context } from "../begleitung/testmodusHilfen";
import { at, atFresh, fakeWindow } from "../helpers";

const T = "2026-10-28";
const W = "2026-10-26";

describe("Ein Satz → rein und raus", () => {
  it.each([
    ["Milch und Eier sind da, Thunfisch ist alle", ["Milch", "Eier"], ["Thunfisch"]],
    ["Zucchini gar nicht im Haus", [], ["Zucchini"]],
    ["Gar nicht im Haus: Zucchini", [], ["Zucchini"]],
    ["Wir haben keine Butter mehr", [], ["Butter"]],
    ["Thunfisch haben wir nicht mehr", [], ["Thunfisch"]],
    ["Hab Hack und Paprika gekauft", ["Hack", "Paprika"], []],
    ["Kuchen ist alle, Honig ist noch da", ["Honig"], ["Kuchen"]],
    ["Wir haben noch 4 Joghurt im Kühlschrank", ["Joghurt"], []],
    ["Eier sind aufgebraucht und Brot haben wir auch nicht mehr", [], ["Eier", "Brot"]],
    ["Wir haben Milch, Eier und Thunfisch ist alle", ["Milch", "Eier"], ["Thunfisch"]],
    ["Keine Eier und kein Brot mehr, aber Käse haben wir noch", ["Käse"], ["Eier", "Brot"]],
    ["Äpfel, Bananen und zwei Gurken sind da", ["Äpfel", "Bananen", "Gurken"], []],
    ["Sahne, Quark", ["Sahne", "Quark"], []],
    ["[Im Haus] Die Milch ist leer", [], ["Milch"]],
  ])("„%s“", (satz, rein, raus) => {
    expect(imHausVerstehen(satz)).toEqual({ rein, raus });
  });

  it("nie Satzteile als Sache, Grundsachen und Nicht-Essen bleiben draußen, das Letztgesagte gilt", () => {
    const alle = ["gar nicht im Haus", "ist alle", "haben wir nicht mehr", "nicht mehr da", "kein … mehr"].flatMap((s) => {
      const v = imHausVerstehen(`Zucchini ${s}`);
      return [...v.rein, ...v.raus];
    });
    expect(alle.every((n) => n === "Zucchini")).toBe(true);
    expect(imHausVerstehen("Salz ist alle, Klopapier ist da")).toEqual({ rein: [], raus: [] });
    expect(imHausVerstehen("Milch ist alle, ach nee, Milch ist doch da")).toEqual({ rein: ["Milch"], raus: [] });
    expect(imHausVerstehen("")).toEqual({ rein: [], raus: [] });
  });
});

describe("Vorschlag „Hab ich so verstanden:“", () => {
  it("+ = add_pantry, − = use_pantry und „auf die Liste“ (nicht, wenn es schon draufsteht)", () => {
    const ops = imHausOps({ rein: ["Milch"], raus: ["Thunfisch", "Butter"] }, W, (n) => n === "Butter");
    expect(ops.map((op) => [op.type, "name" in op ? op.name : ""])).toEqual([
      ["add_pantry", "Milch"],
      ["use_pantry", "Thunfisch"],
      ["add_shopping", "Thunfisch"],
      ["use_pantry", "Butter"],
    ]);
    expect(ops[0]).toMatchObject({ place: "kuehlschrank" });
    expect(isImHausVorschlag(ops)).toBe(true);
    expect(isImHausVorschlag([{ id: "x", type: "add_shopping", weekStart: W, name: "Milch", amount: "", section: "kuehlregal" }])).toBe(false);
    expect(new Set(ops.map((op) => op.id)).size).toBe(ops.length);
  });

  it("„Ändern“: neu Gesagtes ersetzt dieselbe Sache, Früheres bleibt", () => {
    const erst = imHausVorschlag("Milch ist da, Zucchini ist alle", [], W, () => false);
    expect(erst.reply).toBe("Passt so?");
    const dann = imHausVorschlag("Zucchini ist doch da", erst.ops, W, () => false);
    expect(dann.ops.map((op) => `${op.type}:${"name" in op ? op.name : ""}`)).toEqual(["add_pantry:Milch", "add_pantry:Zucchini"]);
    expect(imHausVorschlag("ähm", [], W, () => false)).toMatchObject({ ops: [], reply: expect.stringMatching(/^Hab nichts zum Einräumen gehört/) });
  });

  it("Kennzeichen an die KI, Bühnen-Kopf „IM HAUS“", () => {
    expect(isImHausFrage("[Im Haus] Milch ist da")).toBe(true);
    expect(isImHausFrage("Milch ist da")).toBe(false);
    expect(stageTopic("imhaus")).toBe("IM HAUS");
  });
});

describe("Mia: KI zuerst, nie sofort, kein Zustand bleibt hängen", () => {
  it("Testmodus: beide Werkzeuge in einer Runde, danach nur „Passt so?“", async () => {
    const r = await ask(context(), "[Im Haus] Milch ist da, Zucchini gar nicht im Haus");
    expect(r.uses.map((u) => [u.name, u.input])).toEqual([
      ["vorrat_hinzufuegen", { sachen: [{ name: "Milch" }] }],
      ["vorrat_aufgebraucht", { namen: ["Zucchini"] }],
    ]);
    const next = await afterTools(context(), "[Im Haus] Milch ist da", [{ name: "vorrat_hinzufuegen", input: { sachen: [{ name: "Milch" }] } }], { vorrat_hinzufuegen: "ok" });
    expect(next.text).toBe("Passt so? (Testmodus)");
  });

  it("die Werkzeuge kennen die Regel; „Was ist da?“ wird nie sofort eingetragen; Schließen beendet den Modus", () => {
    expect(readFileSync("src/lib/begleitung/pantryTools.ts", "utf8")).toMatch(/nie Satzteile wie 'gar nicht im Haus'/);
    expect(readFileSync("src/components/begleitung/useAskAssistant.ts", "utf8")).toMatch(/!isImHausFrage\(question\) && result\.ops\.every\(isSafeOp\)/);
    expect(readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8")).toMatch(/spontan: null, imHaus: false/);
    expect(readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8")).toMatch(/imHaus: mode === "imhaus"/);
  });

  it("Prüfstand: mindestens 8 „Im Haus“-Sätze; ein Satzteil als Sache fällt durch", () => {
    const im = PRUEFSAETZE.filter((s) => isImHausFrage(s.text));
    expect(im.length).toBeGreaterThanOrEqual(8);
    expect(im.every((s) => s.nieName)).toBe(true);
    const satz = im.find((s) => s.text.includes("Zucchini gar nicht im Haus"))!;
    const schlecht = bewerte(satz, { reply: "Passt so?", ops: [{ id: "1", type: "use_pantry", name: "Zucchini gar nicht im Haus" }] } as never, 100);
    expect(schlecht.gruende).toContain("Satzteil als Sache: Zucchini gar nicht im Haus");
    const gut = bewerte(satz, { reply: "Passt so?", ops: [{ id: "1", type: "use_pantry", name: "Zucchini" }] } as never, 100);
    expect(gut.ok).toBe(true);
  });
});

describe("Schnelleingabe ＋ (Fehler 28.10.)", () => {
  beforeEach(async () => {
    at(`${T}T08:00`);
    vi.resetModules();
    await atFresh(`${T}T08:00`);
    fakeWindow();
  });

  it("„Milch, Eier, Zucchini gar nicht im Haus“ legt nie „Gar nicht im Haus“ an", async () => {
    const p = await import("@/lib/vorrat/pantry");
    const { saveQuick } = await import("@/components/ui/quickSave");
    p.addPantryItems([{ name: "Zucchini" }], T);
    const text = "Milch, Eier, Zucchini gar nicht im Haus";
    expect(saveQuick({ kind: "imhaus", title: text }, text, {})).toBe(true);
    expect(p.loadPantry().map((i) => i.name)).toEqual(["Milch", "Eier"]);
    expect(p.loadPantryAll().some((i) => /haus/i.test(i.name))).toBe(false);
    expect(p.usedPantry(p.loadPantryAll(), T).map((i) => i.name)).toEqual(["Zucchini"]);
  });
});

describe("Seite „Im Haus“", () => {
  const src = readFileSync("src/components/vorrat/PantryView.tsx", "utf8");

  it("„Was ist da?“ holt Mia im Modus „Im Haus“ (kein eigenes Mikro-Feld), Chips mit Symbol, Legende einmal", () => {
    expect(src).toMatch(/Was ist da\?/);
    expect(src).toMatch(/Kurz reinsprechen, ich sortier’s ein\./);
    expect(src).toMatch(/openHelper\("imhaus"\)/);
    expect(src).not.toMatch(/<input|<textarea|useSpeechInput/);
    expect(src).toMatch(/<ItemSymbol/);
    expect(src.match(/bald aufbrauchen\n/g)?.length).toBe(1);
  });

  it("„Was koch ich daraus?“ schwebt über der Leiste, darunter liegt nichts", () => {
    expect(src).toMatch(/fixed inset-x-0[^"]*" style=\{\{ bottom: UEBER_LEISTE \}\}/);
    expect(src).toMatch(/<main className=\{PAGE_MAIN_KNOPF\}>/);
  });
});

describe("Füllt sich selbst – auch in den neuen Gruppen", () => {
  it("Frisches aus Obst & Gemüse und Brot vergisst sich nach seiner Zeit, Vorrat bleibt länger", async () => {
    const { isGone, placeFor } = await import("@/lib/vorrat/haltbar");
    const it8 = (name: string, addedAt: string) => ({ name, place: placeFor(name), addedAt });
    expect(it8("Zucchini", "2026-10-20").place).toBe("obstgemuese");
    expect(isGone(it8("Zucchini", "2026-10-20"), T)).toBe(true);
    expect(isGone(it8("Brot", "2026-10-20"), T)).toBe(true);
    expect(isGone(it8("Kartoffeln", "2026-10-20"), T)).toBe(false);
    expect(isGone(it8("Nudeln", "2026-10-20"), T)).toBe(false);
  });
});
