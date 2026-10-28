// Pinnwand (Tafel 69–72, Kühlschranktür 106): löschen nur eigene; Reaktionen
// eine je Person (setzen, tauschen, entfernen), altes Format wird übernommen,
// Abgleich und Sicherung tragen sie mit; ＋ und Antworten = „Neuer Zettel“.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyReaction, canDelete, migratePinStore, reactionLine, readReactions, sanitizeMemo, sanitizePin, toggleReaction, type PinMessage } from "@/lib/pinnwand";
import { quoteOf } from "@/lib/pinnwand/schreiben";
import { ADAPTERS } from "@/lib/konten/sync/docs";
import { STORAGE } from "@/lib/core/storage";

const pin = (id: string, author: string, reactions: unknown = {}): PinMessage =>
  sanitizePin({ id, typ: "pinnwand", raum: "familie", besitzer: "lokal", erstellt: "2026-10-21T08:00:00.000Z", geaendert: "2026-10-21T08:00:00.000Z", data: { text: "Bin um 20 Uhr da", author, reactions, readBy: [] } })!;

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

  it("Speicher v2 → v4: Reaktionen umgedreht, Nachrichten bleiben", () => {
    const v2 = { version: 2, messages: [{ ...pin("a", "Lisa"), data: { text: "Hallo", author: "Lisa", reactions: { "❤️": ["Felix"] }, readBy: [] } }], memos: [] };
    const v4 = migratePinStore(v2)!;
    expect(v4.version).toBe(5);
    expect(v4.messages[0].data.reactions).toEqual({ Felix: "❤️" });
    expect(v4.messages[0].data.replyTo).toBeNull();
    expect(STORAGE.find((s) => s.key === "wasgibts.pinnwand")).toMatchObject({ version: 5, backup: true });
  });

  it("Abgleich trägt Reaktionen und Antworten mit (verlustfrei hin und zurück)", () => {
    const a = ADAPTERS.find((x) => x.name === "pinnwand")!;
    expect(a.version).toBe(5);
    const m = toggleReaction([pin("a", "Lisa")], "a", "😮", "Felix", "2026-10-21T09:00:00.000Z")[0];
    const withReply = { ...m, data: { ...m.data, replyTo: { id: "x", author: "Felix", text: "Wer holt Jonne?" } } };
    const value = { version: 5, messages: [withReply], memos: [] };
    const back = a.fromDocs(a.toDocs(value), value) as { messages: PinMessage[] };
    expect(back.messages[0].data.reactions).toEqual({ Felix: "😮" });
    expect(back.messages[0].data.replyTo?.text).toBe("Wer holt Jonne?");
  });
});

describe("Antworten und ＋", () => {
  it("Antwort trägt ein Zitat (Sprachnachrichten: „Sprachnachricht“)", () => {
    expect(quoteOf(pin("a", "Lisa"))).toEqual({ id: "a", author: "Lisa", text: "Bin um 20 Uhr da" });
    expect(quoteOf({ id: "m", data: { author: "Felix" } }).text).toBe("Sprachnachricht");
  });

  it("＋ und Antworten öffnen „Neuer Zettel“ (Antwort mit Bezug „↪ Lisa“) – keine Mia", () => {
    const view = readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8");
    expect(view).toMatch(/onReply=\{\(\) => reply\(heldItem\)\}/);
    expect(view).toMatch(/<NeuerZettel [^>]*quote=\{writing\.quote\}/);
    expect(readFileSync("src/components/pinnwand/NeuerZettel.tsx", "utf8")).toContain("↪ {quote.author}");
    expect(readFileSync("src/components/pinnwand/Zettel.tsx", "utf8")).toContain("↪ {item.pin.data.replyTo.author}");
    for (const f of ["src/components/pinnwand/PinboardTile.tsx", "src/components/pinnwand/PinboardView.tsx", "src/components/pinnwand/boardActions.ts"]) {
      expect(readFileSync(f, "utf8")).not.toMatch(/askMiaFirst|replyOnPinboard|openHelper/);
    }
    expect(readFileSync("src/components/begleitung/HelperPanel.tsx", "utf8")).not.toMatch(/pinFlow|PINNWAND/);
  });
});

describe("Fehler aus dem Durchklick (Pixel 7)", () => {
  it("Loslassen nach langem Drücken schließt das Menü nicht gleich wieder", () => {
    const src = readFileSync("src/components/pinnwand/ReactionMenu.tsx", "utf8");
    expect(src).toMatch(/onPointerDownCapture=\{\(\) => \(armed\.current = true\)\}/);
    expect(src).toMatch(/if \(!armed\.current && e\.detail !== 0\)/);
  });

  it("Android: langes Drücken kommt als „contextmenu“ – öffnet das Menü wie Antippen (an der Tür übernimmt die Wand: Fenster bzw. Ziehen)", () => {
    const src = readFileSync("src/components/pinnwand/Zettel.tsx", "utf8");
    expect(src).toMatch(/onContextMenu=\{\(e\) => \{\s*e\.preventDefault\(\);\s*if \(holdOpens\) onOpen\(\);/);
    expect(readFileSync("src/components/pinnwand/PinboardView.tsx", "utf8")).toMatch(/holdOpens=\{false\}/);
    expect(src).toMatch(/onClick=\{onOpen\}/);
    expect(src).toMatch(/\[-webkit-touch-callout:none\]/);
  });
});

