// S-Kacheln frei kombinierbar: jede S halb breit, eine einzelne S bleibt
// halb (Migration macht eine bisher breite einzelne S einmal zu M), jede
// S-fähige Kachel neben jede andere, Notizen je Größe verschieden.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_HOME, lonelySToM, migrateHome, placeBeside, smallPartners, type HomeTile } from "@/lib/core/homeLayout";
import { rowsOf, unitsOf } from "@/lib/core/homeUnits";
import { notizAnfang, notizZeilen } from "@/lib/heute/notizenKachel";
import type { Note } from "@/lib/notizen/model";

const tiles = (list: [string, string][]): HomeTile[] => list.map(([id, size]) => ({ id, visible: true, size }) as HomeTile);
const rowIds = (t: HomeTile[]) => rowsOf(unitsOf(t.filter((x) => x.visible))).map((r) => r.map((u) => u.tiles.map((x) => `${x.id}:${x.size}`).join("+")).join(" | "));

describe("S-Kacheln", () => {
  it("eine einzelne S bleibt halb: eigene Reihe, das Board zeigt daneben die freie Hälfte", () => {
    expect(rowIds(tiles([["notizen", "S"], ["termine", "M"]]))).toEqual(["notizen:S", "termine:M"]);
    const board = readFileSync("src/components/heute/HomeBoard.tsx", "utf8");
    expect(board).toMatch(/renderUnit\(row\[0\], r \* 2, true, false, false\)/);
    expect(board).toMatch(/data-freie-haelfte/);
    // Bug: zwei Knöpfe „Kachel“ im Bearbeiten – die freie Hälfte heißt anders
    expect(board).toMatch(/aria-label="Kachel daneben stellen"/);
  });

  it("Notizen + Wetter und Notizen + Timer nebeneinander", () => {
    const start = tiles([["wetter", "S"], ["termine", "M"], ["notizen", "M"], ["timer", "M"]]);
    const a = placeBeside(start, "wetter", "notizen");
    expect(rowIds(a.filter((t) => t.visible))[0]).toBe("wetter:S | notizen:S");
    const b = placeBeside(tiles([["timer", "S"], ["notizen", "M"]]), "timer", "notizen");
    expect(rowIds(b)[0]).toBe("timer:S | notizen:S");
    expect(smallPartners("wetter")).toEqual(expect.arrayContaining(["pinnwand", "notizen", "timer"]));
    expect(smallPartners("wetter")).not.toContain("essen");
    expect(placeBeside(start, "wetter", "essen")).toBe(start);
  });

  it("Migration: eine bisher breite einzelne S wird einmal M, Paare bleiben", () => {
    const old = tiles([["pinnwand", "S"], ["wetter", "S"], ["notizen", "S"], ["termine", "M"], ["essen", "S"], ["einkauf", "S"], ["timer", "S"]]);
    const moved = lonelySToM(old);
    expect(moved.map((t) => `${t.id}:${t.size}`)).toEqual(["pinnwand:S", "wetter:S", "notizen:M", "termine:M", "essen:S", "einkauf:S", "timer:M"]);
    expect(migrateHome({ version: 5, tiles: old, tipSeen: true })!.tiles.find((t) => t.id === "notizen")?.size).toBe("M");
    expect(migrateHome({ version: 6, tiles: old, tipSeen: true })!.tiles.find((t) => t.id === "notizen")?.size).toBe("S");
  });

  it("Standard für neue Nutzer bleibt Pinnwand + Wetter (S)", () => {
    expect(rowIds(DEFAULT_HOME)[0]).toBe("pinnwand:S | wetter:S");
  });
});

const note = (id: string, title: string, o: Partial<Note["data"]> = {}, geaendert = "2026-10-27T10:00:00Z"): Note =>
  ({ id, typ: "notiz", raum: "familie", besitzer: "lokal", erstellt: geaendert, geaendert, data: { title, kind: "text", text: "", pinned: false, ...o } }) as Note;

describe("Notizen-Kachel S/M/L", () => {
  const notes = [
    note("a", "WLAN", { text: "abc123\nzweite" }, "2026-10-25T10:00:00Z"),
    note("b", "Geschenkideen", { kind: "liste", items: [{ id: "1", text: "Laufrad", done: true }, { id: "2", text: "Buch" }, { id: "3", text: "Puzzle" }] }, "2026-10-26T10:00:00Z"),
    note("c", "Arzt", { text: "Dr. Berg", pinned: true }, "2026-10-20T10:00:00Z"),
    note("d", "Ideen", { text: "x" }, "2026-10-24T10:00:00Z"),
    note("e", "Rezept", { text: "y" }, "2026-10-23T10:00:00Z"),
    note("f", "Sechs", { text: "z" }, "2026-10-22T10:00:00Z"),
    note("q", "Schnellnotiz", { text: "egal", schnell: true }, "2026-10-27T10:00:00Z"),
  ];
  it("S eine (angeheftete zuerst), M drei, L fünf – ohne Schnellnotiz", () => {
    expect(notizZeilen(notes, "S").map((r) => r.id)).toEqual(["c"]);
    expect(notizZeilen(notes, "M").map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(notizZeilen(notes, "L").map((r) => r.id)).toEqual(["c", "b", "a", "d", "e"]);
  });
  it("Anfang: erste Textzeile bzw. was schon erledigt ist", () => {
    expect(notizAnfang(notes[0])).toBe("abc123");
    expect(notizAnfang(notes[1])).toBe("1 von 3 erledigt");
  });
});
