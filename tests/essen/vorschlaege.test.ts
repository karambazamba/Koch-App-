// Kochidee: „Oder worauf hast du Lust?“ – Vorschlags-Knöpfe statt der Karte
// „Ganz was anderes?“ (Video 27.10. 21:14). Passend zu Vorrat, Jahreszeit und
// Tageszeit; jeder Satz wird ohne KI verstanden und bringt drei Gerichte;
// Mias Antwort darauf: kurzer Satz + drei neue Karten.
import { describe, expect, it } from "vitest";
import { cookCandidates } from "@/lib/essen/kochtipp/pick";
import { BUILTIN_COOK } from "@/lib/essen/kochen";
import { EMPTY_TALK, ideaUnderstood, mergeTalk, parseIdeaTalk, pickIdeas, type IdeaTalk } from "@/lib/essen/kochtipp/idee";
import { ideaReply, ideaSuggestions, seasonOf } from "@/lib/essen/kochtipp/vorschlaege";
import { chipClass } from "@/components/ui/styles";
import type { PantryItem } from "@/lib/vorrat/pantry";

const ALL = cookCandidates(BUILTIN_COOK);
const item = (name: string, addedAt = "2026-10-21"): PantryItem => ({ id: name, name, addedAt, place: "kuehlschrank" });
const cards = (talk: IdeaTalk) => pickIdeas({ candidates: ALL, stock: [], talk, soon: [], exclude: [], avoid: [] });
const fits = (talk: IdeaTalk) => cards(talk).length >= 3;
const OKT = 9;

describe("Jahreszeit", () => {
  it("März–Mai Frühling, Juni–August Sommer, September–November Herbst, sonst Winter", () => {
    expect([0, 2, 5, 8, 9, 11].map(seasonOf)).toEqual(["Winter", "Frühling", "Sommer", "Herbst", "Herbst", "Winter"]);
  });
});

describe("Vorschläge unter den Ideen", () => {
  it("Herbstabend ohne Vorrat: wie im Auftrag – Hähnchen, Kürbis, Schnelles, ohne Fleisch", () => {
    expect(ideaSuggestions({ hour: 18, month: OKT, stock: [], talk: EMPTY_TALK, fits })).toEqual(["Ich hab Hähnchen gekauft", "Was mit Kürbis", "Was Schnelles", "Ohne Fleisch"]);
  });

  it("vormittags im Herbst lieber deftig, im Sommer leicht", () => {
    expect(ideaSuggestions({ hour: 10, month: OKT, stock: [], talk: EMPTY_TALK, fits })).toContain("Was Deftiges");
    const sommer = ideaSuggestions({ hour: 15, month: 6, stock: [], talk: EMPTY_TALK, fits });
    expect(sommer).toContain("Was Leichtes");
    expect(sommer.some((s) => /Zucchini|Tomaten|Paprika/.test(s))).toBe(true);
  });

  it("Vorrat zuerst: was bald weg muss, sonst das Neueste", () => {
    const stock = [item("Reis", "2026-10-10"), item("Hähnchenbrust", "2026-10-20")];
    expect(ideaSuggestions({ hour: 18, month: OKT, stock, talk: EMPTY_TALK, fits })[0]).toBe("Was mit Hähnchenbrust");
    expect(ideaSuggestions({ hour: 18, month: OKT, stock, soon: ["Reis"], talk: EMPTY_TALK, fits })[0]).toBe("Was mit Reis");
  });

  it("drei bis vier, nie doppelt, jeder Satz ohne KI verstanden und mit drei Gerichten", () => {
    for (const [hour, month] of [[8, 0], [12, 3], [15, 6], [19, 9], [23, 11]]) {
      const out = ideaSuggestions({ hour, month, stock: [], talk: EMPTY_TALK, fits });
      expect(out.length, `${hour} Uhr, Monat ${month}`).toBeGreaterThanOrEqual(3);
      expect(out.length).toBeLessThanOrEqual(4);
      expect(new Set(out).size).toBe(out.length);
      for (const s of out) {
        expect(ideaUnderstood(parseIdeaTalk(s)), s).toBe(true);
        expect(cards(parseIdeaTalk(s)), s).toHaveLength(3);
      }
    }
  });

  it("nach „Ohne Fleisch“: nichts, was schon gesagt ist oder zu keinem Gericht führt", () => {
    const talk = parseIdeaTalk("Ohne Fleisch");
    const out = ideaSuggestions({ hour: 18, month: OKT, stock: [], talk, fits });
    expect(out).not.toContain("Ohne Fleisch");
    expect(out).not.toContain("Ich hab Hähnchen gekauft");
    for (const s of out) expect(fits(mergeTalk(talk, parseIdeaTalk(s))), s).toBe(true);
  });

  it("Knöpfe weiß mit Rand und Text in Orange – nie Pastell", () => {
    const c = chipClass(false, "vorschlag");
    expect(c).toContain("bg-surface");
    expect(c).toContain("border-accent");
    expect(c).toContain("text-accent-strong");
    expect(c).not.toMatch(/bg-accent-soft|bg-tile/);
  });
});

describe("Mias Antwort auf einen Vorschlag: kurzer Satz + drei neue Karten", () => {
  it("„Was mit Kürbis“ im Herbst → „Kürbis geht immer im Herbst:“ und drei Kürbis-Gerichte", () => {
    const talk = parseIdeaTalk("Was mit Kürbis");
    const out = cards(talk);
    expect(out).toHaveLength(3);
    for (const c of out) expect(`${c.title} ${c.ingredients.join(" ")}`).toMatch(/kürbis/i);
    expect(ideaReply(talk, out[0], OKT)).toBe("Kürbis geht immer im Herbst:");
    expect(ideaReply(talk, out[0], 4)).toBe("Mit Kürbis geht das hier:");
  });

  it("Schnelles, ohne Fleisch, Stimmung – je ein kurzer Satz; Erzähltes bleibt „Dann mach doch …!“", () => {
    const [first] = cards(EMPTY_TALK);
    expect(ideaReply(parseIdeaTalk("Was Schnelles"), first, OKT)).toBe("Geht fix:");
    expect(ideaReply(parseIdeaTalk("Ohne Fleisch"), first, OKT)).toBe("Ganz ohne Fleisch:");
    expect(ideaReply(parseIdeaTalk("Was Deftiges"), first, OKT)).toBe("Schön deftig:");
    expect(ideaReply(parseIdeaTalk("Ich hab Hähnchen gekauft"), first, OKT)).toBe(`Dann mach doch ${first.title}!`);
    expect(ideaReply(parseIdeaTalk("Was Schnelles"), undefined, OKT)).toBe("Dafür hab ich grad nichts Passendes. Was anderes?");
  });

  it("Ton: kurz, ohne Gedankenstrich, ohne Druck-Wörter", () => {
    const [first] = cards(EMPTY_TALK);
    for (const s of ["Was mit Kürbis", "Was Schnelles", "Ohne Fleisch", "Was Cremiges", "Was Leichtes", "Was mit Fisch", "Was Scharfes"]) {
      const t = ideaReply(parseIdeaTalk(s), first, OKT);
      expect(t.length, s).toBeLessThanOrEqual(40);
      expect(t).not.toMatch(/[–—]|fehlt|offen|musst|solltest/);
    }
  });
});
