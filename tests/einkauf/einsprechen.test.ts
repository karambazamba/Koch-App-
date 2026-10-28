// Einkauf neu (Tafel 110, Bild 2): einsprechen – nur Lebensmittel und
// Verbrauchsartikel, Füllwörter/Abbrüche/Smalltalk/Namen raus, Korrekturen,
// Mengen, Doppeltes, „bei Rewe“; Bestätigung „Hab ich:“, gemerkte Läden,
// Meldung nach „Passt“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { einkaufOps, einkaufVerstehen, einkaufVorschlag, habIchText, isEinkaufFrage, isEinkaufVorschlag, ladenFuer, passtText } from "@/lib/einkauf/einsprechen";

const K = { products: {}, itemShops: {}, staples: [], shops: [], namen: ["Felix", "Lisa", "Mathis"] };
const W = "2026-10-26";
const namen = (t: string) => einkaufVerstehen(t, K).sachen.map((s) => (s.amount ? `${s.amount} ${s.name}` : s.name) + (s.shop ? ` @${s.shop}` : ""));

describe("Einsprechen filtert", () => {
  it.each([
    ["Milch, Brot und Eier", ["Milch", "Brot", "Eier"]],
    ["äh also Milch, ähm Brot", ["Milch", "Brot"]],
    ["Milch, M…, Eier", ["Milch", "Eier"]],
    ["Milch und äh Tomaten", ["Milch", "Tomaten"]],
    ["Brot, was noch, weiß ich nicht mehr, Käse", ["Brot", "Käse"]],
    ["Sahne, Milch, nee, keine Sahne", ["Milch"]],
    ["Milch, Eier, Sahne, nee doch nicht", ["Milch", "Eier"]],
    ["Milch, nee Hafermilch", ["Hafermilch"]],
    ["Sahne, nee, Schmand", ["Schmand"]],
    ["zwei Milch und drei Bananen", ["2 Milch", "3 Bananen"]],
    ["Milch, Brot, noch eine Milch", ["Milch", "Brot"]],
    ["zwei Milch, Brot und noch zwei Milch", ["4 Milch", "Brot"]],
    ["eine Packung Windeln und Klopapier", ["1 Packung Windeln", "Klopapier"]],
    ["Tomaten und Gurke bei Rewe", ["Tomaten @Rewe", "Gurke @Rewe"]],
    ["Milch, Brot und Käse bei Rewe", ["Milch", "Brot @Rewe", "Käse @Rewe"]],
    ["Mathis wollte noch Joghurt, Joghurt und Bananen", ["Joghurt", "Bananen"]],
    ["Lisa, Milch und schönes Wetter heute", ["Milch"]],
    ["Wir haben keine Windeln mehr und Klopapier ist alle", ["Windeln", "Klopapier"]],
    ["Brötchen für morgen früh", ["Brötchen"]],
    ["", []],
    ["äh, hm, keine Ahnung", []],
  ])("„%s“", (satz, erwartet) => {
    expect(namen(satz)).toEqual(erwartet);
  });

  it("Live-Blase: Ignoriertes durchgestrichen, alles zusammen ergibt den Satz", () => {
    const satz = "äh Milch, M…, Sahne, nee, keine Sahne";
    const { teile } = einkaufVerstehen(satz, K);
    expect(teile.map((t) => t.text).join("")).toBe(satz);
    expect(teile.filter((t) => !t.weg).map((t) => t.text.replace(/[,\s]/g, "")).filter(Boolean)).toEqual(["Milch"]);
    expect(teile.filter((t) => t.weg).map((t) => t.text).join("|")).toMatch(/äh/);
    expect(teile.find((t) => t.text.includes("Sahne") && !t.text.includes("keine"))?.weg).toBe(true);
  });

  it("Kennzeichen an die KI", () => {
    expect(isEinkaufFrage("[Einkauf] Milch")).toBe(true);
    expect(isEinkaufFrage("Milch")).toBe(false);
    expect(namen("[Einkauf] Milch und Brot")).toEqual(["Milch", "Brot"]);
  });
});

describe("Bestätigung „Hab ich:“", () => {
  it("je Sache ein add_shopping, Laden genannt oder gemerkt, sonst ohne Laden", () => {
    const ops = einkaufOps([{ name: "Milch", amount: "2", shop: "" }, { name: "Tomaten", amount: "", shop: "Rewe" }, { name: "Spinat", amount: "", shop: "" }], W);
    expect(ops.map((op) => op.type)).toEqual(["add_shopping", "add_shopping", "add_shopping"]);
    expect(ops[0]).toMatchObject({ name: "Milch", amount: "2", section: "kuehlregal" });
    expect(isEinkaufVorschlag(ops)).toBe(true);
    const s = { itemShops: { milch: "Edeka" }, shopRules: {}, products: {} };
    expect(ops.map((op) => ladenFuer(op, s))).toEqual(["Edeka", "Rewe", ""]);
    expect(habIchText(9)).toBe("Hab ich: 9 Sachen");
    expect(habIchText(1)).toBe("Hab ich: 1 Sache");
    expect(passtText(9, 3)).toBe("9 drauf · 3 ohne Laden");
    expect(passtText(2, 0)).toBe("2 drauf");
    expect(isEinkaufVorschlag([])).toBe(false);
  });

  it("„Weiter erzählen“: Früheres bleibt, Korrektur nimmt auch Früheres, Doppeltes ersetzt", () => {
    const erst = einkaufVorschlag("Milch, Sahne und Brot", [], W, K);
    expect(erst.reply).toBe("Passt so?");
    const dann = einkaufVorschlag("nee, keine Sahne, aber zwei Milch", erst.ops, W, K);
    expect(dann.ops.map((op) => (op.type === "add_shopping" ? `${op.amount}${op.name}` : ""))).toEqual(["Brot", "2Milch"]);
    expect(einkaufVorschlag("ähm", [], W, K)).toMatchObject({ ops: [], reply: expect.stringMatching(/^Hab nichts für die Liste gehört/) });
    const letztes = einkaufVorschlag("nee doch nicht", erst.ops, W, K);
    expect(letztes.ops.map((op) => ("name" in op ? op.name : ""))).toEqual(["Milch", "Sahne"]);
  });
});

describe("Prüfstand Einsprechen", () => {
  it("mindestens 10 Sätze; der Versteher (Testmodus, ohne KI) besteht alle", async () => {
    const { PRUEFSAETZE } = await import("@/lib/begleitung/pruefstand/saetze");
    const { bewerte } = await import("@/lib/begleitung/pruefstand/bewerten");
    const saetze = PRUEFSAETZE.filter((s) => isEinkaufFrage(s.text));
    expect(saetze.length).toBeGreaterThanOrEqual(10);
    const ohne = { products: {}, itemShops: {}, staples: [] };
    const fehler = saetze.map((s) => bewerte(s, { reply: "Passt so?", ops: einkaufOps(einkaufVerstehen(s.text, ohne).sachen, W) }, 100)).filter((r) => !r.ok);
    expect(fehler.map((r) => `${r.text}: ${r.gruende.join("; ")}`)).toEqual([]);
  });

  it("falsche Sachen, falsche Zahl und fehlende Menge fallen durch", async () => {
    const { PRUEFSAETZE } = await import("@/lib/begleitung/pruefstand/saetze");
    const { bewerte } = await import("@/lib/begleitung/pruefstand/bewerten");
    const sahne = PRUEFSAETZE.find((s) => s.text.includes("keine Sahne"))!;
    const schlecht = bewerte(sahne, { reply: "Passt so?", ops: einkaufOps([{ name: "Sahne", amount: "", shop: "" }, { name: "Butter", amount: "", shop: "" }], W) }, 100);
    expect(schlecht.gruende).toEqual(expect.arrayContaining(["2 statt 1 Sachen (Sahne, Butter)", "Satzteil als Sache: Sahne"]));
    const zwei = PRUEFSAETZE.find((s) => s.text.includes("Zwei Milch"))!;
    expect(bewerte(zwei, { reply: "Passt so?", ops: einkaufOps([{ name: "Milch", amount: "", shop: "" }, { name: "Joghurt", amount: "3", shop: "" }], W) }, 100).gruende).toContain("Menge 2 nicht übernommen");
  });
});

describe("Mia im Modus „Einkauf“: KI zuerst, nie sofort, kein Zustand bleibt hängen", () => {
  const read = (p: string) => readFileSync(p, "utf8");

  it("Einsprechen holt Mia zuhörend auf die Bühne („EINKAUF“, „Zähl einfach auf.“), Schließen beendet den Modus", async () => {
    const { stageTopic } = await import("@/lib/begleitung/stage");
    expect(stageTopic("einkauf")).toBe("EINKAUF");
    const kh = read("src/components/begleitung/KitchenHelper.tsx");
    expect(kh).toMatch(/einkauf: mode === "einkauf"/);
    expect(kh).toMatch(/listen: mode === "voice" \|\| mode === "imhaus" \|\| mode === "einkauf"/);
    expect(kh).toMatch(/spontan: null, imHaus: false, einkauf: false/);
    expect(read("src/components/begleitung/ChatHistory.tsx")).toContain('chat.einkauf ? "Zähl einfach auf."');
  });

  it("KI bekommt „[Einkauf] …“, ohne KI versteht die App selbst; erst „Hab ich:“, nie sofort eingetragen", () => {
    expect(read("src/components/begleitung/useModusChat.ts")).toMatch(/chat\.einkauf \? \{ prefix: EINKAUF_PREFIX, lokal: einkaufLokal \}/);
    expect(read("src/components/begleitung/useModusChat.ts")).toMatch(/if \(ready\) void ask\(`\$\{art\.prefix\} \$\{t\}`, t, art\.lokal\)/);
    expect(read("src/components/begleitung/useAskAssistant.ts")).toMatch(/!isEinkaufFrage\(question\) && !isImHausFrage\(question\) && result\.ops\.every\(isSafeOp\)/);
    expect(read("src/lib/begleitung/shoppingTools.ts")).toMatch(/Nachricht beginnt mit '\[Einkauf\]'/);
  });

  it("Bestätigung: Chips mit ×, Farbpunkt = gemerkter Laden, „Passt“ / „Weiter erzählen“; Live-Blase streicht durch", () => {
    const karte = read("src/components/einkauf/EinsprechenKarte.tsx");
    expect(karte).toContain("Weiter erzählen");
    expect(karte).toContain("Passt");
    expect(karte).toMatch(/<X className/);
    expect(karte).toMatch(/ladenFuer\(op, settings\)/);
    expect(karte).toMatch(/<s key=\{i\}/);
    const hist = read("src/components/begleitung/ChatHistory.tsx");
    expect(hist).toMatch(/chat\.einkauf \? <EinsprechenLive text=\{heard\} \/> : heard/);
    expect(hist).toMatch(/chat\.einkauf && isEinkaufVorschlag\(chat\.proposal\.ops\) && \(\s*<EinsprechenKarte/);
  });

  it("„Passt“: Meldung „9 drauf · 3 ohne Laden · Rückgängig“", () => {
    const panel = read("src/components/begleitung/HelperPanel.tsx");
    expect(panel).toMatch(/const meldung = passtMeldung\(selected\)/);
    expect(panel).toMatch(/showToast\(\{ text: meldung, undo: run/);
    expect(read("src/components/begleitung/KitchenHelper.tsx")).toMatch(/return run;/);
  });

  it("Testmodus: ein Werkzeug-Aufruf mit allen Sachen (Menge, Laden), danach nur „Passt so?“", async () => {
    const { ask, afterTools, context } = await import("../begleitung/testmodusHilfen");
    const r = await ask(context(), "[Einkauf] Äh zwei Milch, Sahne, nee keine Sahne, und Tomaten und Gurke bei Rewe");
    expect(r.uses.map((u) => u.name)).toEqual(["einkaufsliste_hinzufuegen"]);
    expect(r.uses[0].input.artikel).toEqual([{ name: "Milch", menge: "2" }, { name: "Tomaten", laden: "Rewe" }, { name: "Gurke", laden: "Rewe" }]);
    const next = await afterTools(context(), "[Einkauf] Milch", [{ name: "einkaufsliste_hinzufuegen", input: { woche: "aktuell", artikel: [{ name: "Milch" }] } }], { einkaufsliste_hinzufuegen: "ok" });
    expect(next.text).toBe("Passt so? (Testmodus)");
    const leer = await ask(context(), "[Einkauf] äh, keine Ahnung");
    expect(leer.text).toMatch(/^Hab nichts für die Liste gehört/);
  });
});
