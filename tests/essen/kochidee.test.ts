// Kochidee (Tafel 64 C/65): Knopf je Lage, drei Vorschläge ohne Frage –
// Vorhandenes zuerst, nie das geplante Gericht –, frei erzählen („Ich hab
// Hähnchen gekauft …“), „nicht schon wieder Hähnchen“, Texte ohne Druck.
import { describe, expect, it } from "vitest";
import { cookCandidates } from "@/lib/essen/kochtipp/pick";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { readFileSync } from "node:fs";
import { EMPTY_TALK, ideaHello, ideaResult, ideaUnderstood, ingredientLine, kochideeButton, mergeTalk, parseIdeaTalk, pickIdeas, rankIdeas, rememberedText, startIdeas, takeOutcome, talkKeywords, type IdeaTalk } from "@/lib/essen/kochtipp/idee";
import type { PantryItem } from "@/lib/vorrat/pantry";

const item = (name: string): PantryItem => ({ id: name, name, addedAt: "2026-10-21", place: "kuehlschrank" });
const ALL = cookCandidates(BUILTIN_COOK);
const ideas = (talk: IdeaTalk, extra: { stock?: PantryItem[]; exclude?: string[]; avoid?: string[] } = {}) =>
  pickIdeas({ candidates: ALL, stock: extra.stock ?? [], talk, soon: [], exclude: extra.exclude ?? [], avoid: extra.avoid ?? [] });

describe("Knopf auf der Essen-Kachel", () => {
  it("geplant → „Was anderes?“, frei → „Idee“ – mit VoiceOver-Satz", () => {
    expect(kochideeButton("Pasta mit Tomaten & Burrata", "Mia")).toEqual({ kind: "anders", label: "Was anderes?", aria: "Was anderes kochen? Mia schlägt Alternativen vor" });
    expect(kochideeButton(null, "Mia")).toEqual({ kind: "idee", label: "Idee", aria: "Kochidee – Mia schlägt dir ein Gericht vor" });
  });
});

describe("Drei Vorschläge ohne Frage", () => {
  it("zuerst, was am meisten aus dem Vorrat nutzt", () => {
    const stock = [item("Hähnchenbrust"), item("Reis"), item("Paprika"), item("Sahne")];
    const [first] = ideas(EMPTY_TALK, { stock });
    expect(first.title).toBe("Hähnchenpfanne mit Reis");
    expect(first.uses).toEqual(expect.arrayContaining(["Hähnchenbrust", "Reis", "Paprika"]));
    expect(ingredientLine(first)).toBe("alles im Haus");
  });

  it("das geplante Gericht und die letzten 7 Tage kommen nie", () => {
    const stock = [item("Hähnchenbrust"), item("Reis"), item("Paprika")];
    const titles = rankIdeas({ candidates: ALL, stock, talk: EMPTY_TALK, soon: [], exclude: ["Hähnchenpfanne mit Reis", "Kürbissuppe"], avoid: [] }).map((c) => c.title);
    expect(titles).not.toContain("Hähnchenpfanne mit Reis");
    expect(titles).not.toContain("Kürbissuppe");
  });

  it("Allergien und „mag nicht“ strikt", () => {
    expect(ideas(EMPTY_TALK, { avoid: ["Nudeln"] }).some((c) => /nudel|pasta/i.test(c.title))).toBe(false);
  });

  it("Vorhandenes zuerst, dann die Mischung – nie doppelt, immer drei", () => {
    const ranked = rankIdeas({ candidates: ALL, stock: [item("Kürbis")], talk: EMPTY_TALK, soon: [], exclude: [], avoid: [] });
    const mix = ranked.filter((c) => !c.uses.length).slice(-3);
    const out = startIdeas(ranked, mix);
    expect(out).toHaveLength(3);
    expect(out[0].uses.length).toBeGreaterThan(0);
    expect(new Set(out.map((c) => c.title)).size).toBe(3);
  });

  it("Mias erster Satz – geplant und frei", () => {
    expect(ideaHello("Pasta mit Tomaten & Burrata", undefined)).toBe("Lust auf was anderes als Pasta mit Tomaten & Burrata?");
    const card = ideas(EMPTY_TALK, { stock: [item("Hähnchenbrust"), item("Reis"), item("Paprika")] })[0];
    expect(ideaHello(null, card)).toMatch(/^Wie wär’s damit\? .+ hast du noch\.$/);
  });
});

describe("Frei erzählen", () => {
  const SATZ = "Ich hab Hähnchen gekauft, Paprika und Sahne sind noch da, was Cremiges";

  it("Zutaten und Wunsch erkannt", () => {
    const t = parseIdeaTalk(SATZ);
    expect(t.have).toEqual(["Hähnchen", "Paprika", "Sahne"]);
    expect(t.moods).toEqual(["cremig"]);
    expect(ideaUnderstood(t)).toBe(true);
    expect(talkKeywords(t)).toEqual(["Hähnchen", "Paprika", "Sahne", "cremig"]);
    expect(rememberedText(t.have)).toBe("Hähnchen, Paprika und Sahne merk ich mir als „im Haus“ ✓");
  });

  it("ohne KI: drei passende eingebaute Gerichte, das beste zuerst", () => {
    const out = ideas(parseIdeaTalk(SATZ));
    expect(out).toHaveLength(3);
    expect(out[0].title).toMatch(/Hähnchen/);
    for (const c of out) expect(c.uses.length > 0 || /sahne|käse|kokos|creme|risotto/i.test(c.ingredients.join(" "))).toBe(true);
    expect(ideaResult(out[0])).toBe(`Dann mach doch ${out[0].title}!`);
  });

  it("kurz wie im Clip: „Hähnchen gekauft, was Cremiges?“ (früher: Grießbrei)", () => {
    for (const satz of ["Hähnchen gekauft, was Cremiges?", "Hab Hähnchen gekauft. Was Cremiges?", "Grad Hähnchen geholt, was Cremiges"]) {
      const t = parseIdeaTalk(satz);
      expect(t.have).toEqual(["Hähnchen"]);
      expect(t.moods).toEqual(["cremig"]);
      const out = ideas(t);
      expect(out).toHaveLength(3);
      expect(out[0].title).toMatch(/Hähnchen/);
    }
  });

  it("„nicht schon wieder Hähnchen“ → kein Hähnchen mehr", () => {
    const t = mergeTalk(parseIdeaTalk(SATZ), parseIdeaTalk("nicht schon wieder Hähnchen"));
    expect(t.have).toEqual(["Paprika", "Sahne"]);
    const out = ideas(t);
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((c) => /hähnchen/i.test(`${c.title} ${c.ingredients.join(" ")}`))).toBe(false);
  });

  it("„Ich hab noch Hähnchen, Reis und Paprika“ – Liste über Kommas", () => {
    expect(parseIdeaTalk("Ich hab noch Hähnchen, Reis und Paprika").have).toEqual(["Hähnchen", "Reis", "Paprika"]);
  });

  it("„lieber ohne Sahne“, „für 3“, „was Schnelleres“, „Was mit Kürbis“", () => {
    expect(parseIdeaTalk("Lieber ohne Sahne").not).toEqual(["Sahne"]);
    expect(parseIdeaTalk("für 3").persons).toBe(3);
    expect(parseIdeaTalk("was Schnelleres").quick).toBe(true);
    const k = parseIdeaTalk("Was mit Kürbis");
    expect(k.want).toEqual(["Kürbis"]);
    expect(ideas(k).every((c) => /kürbis/i.test(`${c.title} ${c.ingredients.join(" ")}`))).toBe(true);
    expect(ideaUnderstood(parseIdeaTalk("Wie spät ist es?"))).toBe(false);
  });

  it("Zutaten-Zeile ohne Druck-Wörter: grün „alles im Haus“ oder „auf die Liste: …“", () => {
    for (const c of ideas(EMPTY_TALK)) expect(ingredientLine(c)).toMatch(/^(alles im Haus|auf die Liste: .+)$/);
  });
});

describe("„Nehmen“", () => {
  const card = { title: "Hähnchen-Curry", minutes: 25, category: "fleisch" as const, ingredients: ["Hähnchen", "Currypaste"], uses: ["Hähnchen"], needs: ["Currypaste"], badge: "fast" as const };

  it("geplant → ersetzt heute, das alte zurück zu den Ideen, Fehlendes auf die Liste", () => {
    expect(takeOutcome(card, "Pasta mit Tomaten & Burrata", false, "2026-10-21", "2026-10-22")).toEqual({ date: "2026-10-21", backToIdeas: "Pasta mit Tomaten & Burrata", toList: ["Currypaste"] });
  });

  it("frei → heute; nach dem Abendessen → morgen (dann bleibt das heutige stehen)", () => {
    expect(takeOutcome(card, null, false, "2026-10-21", "2026-10-22")).toMatchObject({ date: "2026-10-21", backToIdeas: null });
    expect(takeOutcome(card, "Pasta", true, "2026-10-21", "2026-10-22")).toMatchObject({ date: "2026-10-22", backToIdeas: null });
  });
});

describe("Nichts davor, Mia ist der Knopf", () => {
  const read = (f: string) => readFileSync(f, "utf8");
  it("kein Mikrofon-Symbol und kein Pfeil in der Kochidee", () => {
    for (const f of ["src/components/essen/kochtipp/KochideeViews.tsx", "src/components/essen/kochtipp/KochideeKnopf.tsx"]) expect(read(f), f).not.toMatch(/\b(Mic|MicOff|ArrowRight|ChevronRight|ArrowUp)\b/);
  });

  it("Kochidee öffnet ohne Mikro und ohne Zugangscode davor", () => {
    const helper = read("src/components/begleitung/KitchenHelper.tsx");
    const block = helper.slice(helper.indexOf('if (mode === "kochtipp")'), helper.indexOf('if (mode !== "spontan")'));
    expect(block).not.toMatch(/setStart\(\{ listen/);
    // Der Testcode steht nie im Gespräch (eigener Bildschirm, `CodeScreen`)
    expect(read("src/components/begleitung/ChatHistory.tsx")).not.toMatch(/AccessCodeCard/);
  });
});
