// Pinnwand (Tafel 69–71): Kachel zeigt genau die 2 neuesten der letzten 2 Tage
// + „+N“; löschen nur eigene; Reaktionen eine je Person (setzen, tauschen,
// entfernen), altes Format wird übernommen, Abgleich und Sicherung tragen sie
// mit; „＋“ pinnt 1:1 (nur Füllwörter weg), bei Einkauf/Termin kurz nachfragen.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyReaction, canDelete, migratePinStore, reactionLine, readReactions, sanitizeMemo, sanitizePin, tileEntries, toggleReaction, type PinMessage } from "@/lib/pinnwand";
import { cleanFillers, pinChoiceLabels, pinIntent, pinnedText, quoteOf } from "@/lib/pinnwand/schreiben";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { STORAGE } from "@/lib/core/storage";

const NOW = Date.parse("2026-10-21T10:30:00Z");
const at = (iso: string, id = iso) => ({ id, at: iso });
const pin = (id: string, author: string, reactions: unknown = {}): PinMessage =>
  sanitizePin({ id, typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: "2026-10-21T08:00:00.000Z", geaendert: "2026-10-21T08:00:00.000Z", data: { text: "Bin um 20 Uhr da", author, reactions, readBy: [] } })!;

describe("Kachel: klein und ruhig", () => {
  it("genau die 2 neuesten der letzten 2 Tage, „+N“ für den Rest", () => {
    const items = [at("2026-10-21T09:00:00Z"), at("2026-10-21T10:00:00Z"), at("2026-10-20T12:00:00Z"), at("2026-10-19T09:00:00Z")];
    const { shown, more } = tileEntries(items, NOW);
    expect(shown.map((i) => i.at)).toEqual(["2026-10-21T10:00:00Z", "2026-10-21T09:00:00Z"]);
    expect(more).toBe(1);
  });

  it("ältere als 2 Tage rutschen still aus der Kachel; ohne mehr kein „+N“", () => {
    expect(tileEntries([at("2026-10-19T10:29:00Z")], NOW)).toEqual({ shown: [], more: 0 });
    expect(tileEntries([at("2026-10-21T09:00:00Z")], NOW).more).toBe(0);
  });

  it("feste Höhe, kein roter Punkt, ＋ oben und Mikro unten getrennt, keine Gesten", () => {
    const src = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
    expect(src).toMatch(/flex h-\[156px\] flex-col overflow-hidden/);
    expect(src).not.toMatch(/Neue Nachricht"|bg-danger|unread/);
    expect(src).toMatch(/h-\[30px\]/);
    expect(src).not.toMatch(/SwipeRow|onPointerDown|onContextMenu/);
    expect(src).toContain("Hinterlasst euch hier Nachrichten");
  });
});

describe("Löschen nur eigene", () => {
  it("nur wer geschrieben hat", () => {
    expect(canDelete(pin("a", "Felix"), "Felix")).toBe(true);
    expect(canDelete(pin("a", "Lisa"), "Felix")).toBe(false);
  });
});

describe("Reaktionen wie bei WhatsApp", () => {
  it("setzen, tauschen, entfernen – eine je Person", () => {
    let r = applyReaction({}, "Felix", "❤️");
    expect(r).toEqual({ Felix: "❤️" });
    r = applyReaction(r, "Felix", "👍");
    expect(r).toEqual({ Felix: "👍" });
    r = applyReaction(applyReaction(r, "Lisa", "❤️"), "Felix", "👍");
    expect(r).toEqual({ Lisa: "❤️" });
  });

  it("Anzeige: Emojis + Namen, keine Zahlen", () => {
    expect(reactionLine({ Lisa: "❤️", Felix: "👍", Jonne: "❤️" })).toBe("❤️ 👍 Lisa, Felix, Jonne");
    expect(reactionLine({})).toBe("");
    expect(reactionLine({ Lisa: "❤️", Felix: "❤️" })).not.toMatch(/\d/);
  });

  it("altes Format (v2: Emoji → Personen) wird übernommen; Unsinn fällt raus", () => {
    expect(readReactions({ "👍": ["Lisa", 3], "❤️": ["Felix"], "🔥": ["x"] })).toEqual({ Lisa: "👍", Felix: "❤️" });
    expect(readReactions({ Lisa: "😂", Felix: "🔥" })).toEqual({ Lisa: "😂" });
    expect(readReactions(null)).toEqual({});
    expect(sanitizeMemo({ id: "m", typ: "memo", erstellt: "2026-10-21T08:00:00Z", data: { dauer: 3, reactions: { "🙏": ["Lisa"] } } })?.data.reactions).toEqual({ Lisa: "🙏" });
  });

  it("Speicher v2 → v3: Reaktionen umgedreht, Nachrichten bleiben", () => {
    const v2 = { version: 2, messages: [{ ...pin("a", "Lisa"), data: { text: "Hallo", author: "Lisa", reactions: { "❤️": ["Felix"] }, readBy: [] } }], memos: [] };
    const v3 = migratePinStore(v2)!;
    expect(v3.version).toBe(3);
    expect(v3.messages[0].data.reactions).toEqual({ Felix: "❤️" });
    expect(v3.messages[0].data.replyTo).toBeNull();
    expect(STORAGE.find((s) => s.key === "wasgibts.pinnwand")).toMatchObject({ version: 3, backup: true });
  });

  it("Abgleich trägt Reaktionen und Antworten mit (verlustfrei hin und zurück)", () => {
    const a = ADAPTERS.find((x) => x.name === "pinnwand")!;
    expect(a.version).toBe(3);
    const m = toggleReaction([pin("a", "Lisa")], "a", "😮", "Felix", "2026-10-21T09:00:00.000Z")[0];
    const withReply = { ...m, data: { ...m.data, replyTo: { id: "x", author: "Felix", text: "Wer holt Jonne?" } } };
    const value = { version: 3, messages: [withReply], memos: [] };
    const back = a.fromDocs(a.toDocs(value), value) as { messages: PinMessage[] };
    expect(back.messages[0].data.reactions).toEqual({ Felix: "😮" });
    expect(back.messages[0].data.replyTo?.text).toBe("Wer holt Jonne?");
  });
});

describe("＋ = Mia schreibt mit", () => {
  it("Füllwörter weg, Sinn 1:1", () => {
    expect(cleanFillers("äh also bin um 20 Uhr da")).toBe("Bin um 20 Uhr da");
    expect(cleanFillers("Also, ähm, Jonne hat heute Turnen, hm, bitte Schuhe mit")).toBe("Jonne hat heute Turnen, bitte Schuhe mit");
    expect(cleanFillers("Wer holt Jonne ab?")).toBe("Wer holt Jonne ab?");
    expect(pinnedText("Bin um 20 Uhr da")).toBe("Steht für alle an der Pinnwand:\n„Bin um 20 Uhr da“\n✓ Angepinnt");
  });

  it("Einkauf oder Termin → kurz nachfragen; Absprachen nie", () => {
    expect(pinIntent("Milch auf die Liste")).toBe("einkauf");
    expect(pinChoiceLabels("einkauf")).toEqual(["An die Pinnwand", "Auf die Einkaufsliste"]);
    expect(pinIntent("Zahnarzt am Freitag um 16 Uhr")).toBe("termin");
    expect(pinChoiceLabels("termin")[1]).toBe("In den Kalender");
    expect(pinIntent("Bin heute um 20 Uhr da")).toBeNull();
    expect(pinIntent("Bin um 20 Uhr da")).toBeNull();
    expect(pinIntent("Wer holt Jonne ab?")).toBeNull();
  });

  it("Antwort trägt ein Zitat (Sprachnachrichten: „Sprachnachricht“)", () => {
    expect(quoteOf(pin("a", "Lisa"))).toEqual({ id: "a", author: "Lisa", text: "Bin um 20 Uhr da" });
    expect(quoteOf({ id: "m", data: { author: "Felix" } }).text).toBe("Sprachnachricht");
  });

  it("Pinnwand-Modus pinnt direkt (keine Vorschau), mit Rückgängig", () => {
    const src = readFileSync("src/components/begleitung/HelperPanel.tsx", "utf8");
    expect(src).toMatch(/if \(chat\.topic === "PINNWAND"\) \{\s*setInput\(""\);\s*pinFlow\(t\);/);
    expect(src).toMatch(/label: "Rückgängig"/);
  });
});

describe("Fehler aus dem Durchklick (Pixel 7)", () => {
  it("Loslassen nach langem Drücken schließt das Menü nicht gleich wieder", () => {
    const src = readFileSync("src/components/pinnwand/ReactionMenu.tsx", "utf8");
    expect(src).toMatch(/onPointerDownCapture=\{\(\) => \(armed\.current = true\)\}/);
    expect(src).toMatch(/if \(!armed\.current && e\.detail !== 0\)/);
  });

  it("Android: langes Drücken kommt als „contextmenu“ – zählt auch; Abbruch beim Halten stoppt es nicht", () => {
    const src = readFileSync("src/components/pinnwand/SwipeRow.tsx", "utf8");
    expect(src).toMatch(/onContextMenu=\{\(e\) => \{\s*e\.preventDefault\(\);/);
    expect(src).toMatch(/onPointerCancel=\{\(\) => \{\s*\/\/[^\n]*\n\s*if \(!start\.current\?\.swiping\) return;/);
  });
});

