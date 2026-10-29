// Festes Raster der Startseite (Tafel 118): XS = halb breit + halb hoch, S =
// halb breit + quadratisch, M = ganz breit + so hoch wie S; dicht gefüllt in
// der gespeicherten Reihenfolge, zwei XS als Paar, Lücken nur ohne Partner,
// Höhe nie vom Inhalt; Bearbeiten = Fertig-Ansicht; Timer nur, solange er
// läuft; Standard je Haushalt (Tafel 119) und Haushaltswechsel.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DEFAULT_HOME, HOME_TILES, TILE_SIZES, applyHomeChange, defaultHome, homeForHaushalt, lonelySToM, migrateHome, sanitizeHome, standardLayout, type HomeTile, type HomeTileId, type TileSize } from "@/lib/core/homeLayout";
import { unitsOf } from "@/lib/core/homeUnits";
import { SPAN, fuelleLuecke, grundZeile, groesseFuer, packe, passtInLuecke, pfeilZu, rasterOf, trennZeile, type Raster } from "@/lib/heute/raster";
import { notizAnfang, notizZeilen } from "@/lib/heute/notizenKachel";
import type { Note } from "@/lib/notizen/model";

const tiles = (list: [string, string][]): HomeTile[] => list.map(([id, size]) => ({ id, visible: true, size }) as HomeTile);
const at = (r: Raster) => r.plaetze.map((p) => `${p.key}@${p.col},${p.row}${p.w === 2 ? "+" : ""}`);
const shown = (t: HomeTile[]) => t.filter((x) => x.visible);
const sizeOf = (t: HomeTile[], id: HomeTileId) => t.find((x) => x.id === id)?.size;

describe("Raster: Größen (Tafel 118)", () => {
  it("XS 1 × 1, S 1 × 2, M 2 × 2; L gibt es nicht mehr", () => {
    expect(SPAN).toEqual({ XS: { w: 1, h: 1 }, S: { w: 1, h: 2 }, M: { w: 2, h: 2 } });
    expect(TILE_SIZES).toEqual(["XS", "S", "M"]);
    expect(HOME_TILES.flatMap((t) => t.sizes)).not.toContain("L");
  });

  it("erlaubte Größen je Kachel wie in der Tafel; Umschalter zeigt nur diese", () => {
    const sizes = Object.fromEntries(HOME_TILES.map((t) => [t.id, t.sizes.join("/")]));
    expect(sizes).toMatchObject({ wetter: "XS/S/M", timer: "XS/S", notizen: "XS/S/M", vorrat: "S/M", sport: "XS/S/M", pinnwand: "S/M", essen: "S/M", einkauf: "S/M", termine: "S/M", aufgaben: "S/M", spendentopf: "M", tipps: "M" });
    for (const t of HOME_TILES) {
      expect(t.sizes).toContain(t.size);
      expect([...t.sizes].sort((a, b) => TILE_SIZES.indexOf(a) - TILE_SIZES.indexOf(b))).toEqual(t.sizes);
    }
    const frame = readFileSync("src/components/heute/EditFrame.tsx", "utf8");
    expect(frame).toMatch(/meta\.sizes\.map\(\(s\) =>/);
  });

  it("Grund-Zeile aus der Breite: zwei Zeilen + Abstand = S = quadratisch, auf jedem Gerät", () => {
    for (const w of [375, 393, 412]) {
      const board = w - 32;
      const s = (board - 8) / 2;
      expect(Math.abs(2 * grundZeile(board) + 8 - s)).toBeLessThanOrEqual(0.5);
    }
  });

  it("ganz schmal (iPhone SE 1, 320 px): S mindestens 168 px hoch, damit nichts abgeschnitten wird (A-045)", () => {
    expect(grundZeile(320 - 32)).toBe(80);
    expect(2 * grundZeile(320 - 32) + 8).toBe(168);
    expect(readFileSync("src/lib/heute/raster.ts", "utf8")).toMatch(/max\(\$\{ZEILE_MIN\}px, calc/);    // Einkauf: Laden-Namen ganz, die Symbole weichen auf dem schmalen Board
    expect(readFileSync("src/components/heute/HomeTiles.tsx", "utf8")).toMatch(/<ItemSymbol [^>]*@max-\[320px\]:hidden/);
  });
});

describe("Raster: dicht und stabil füllen", () => {
  it("Familie (Tafel 140): Wetter XS über Notizen XS | Pinnwand S, Termine, Aufgaben, Essen | Wundertüte, Einkauf breit", () => {
    const r = rasterOf(shown(defaultHome("familie")));
    expect(at(r)).toEqual(["wetter@0,0", "notizen@0,1", "pinnwand@1,0", "termine@0,2+", "aufgaben@0,4+", "essen@0,6", "wundertuete@1,6", "einkauf@0,8+"]);
    expect(r.luecken).toEqual([]);
    expect(r.rows).toBe(10);
  });

  it("allein (Tafel 140): Wetter XS über Notizen XS | Wundertüte S, Termine, Aufgaben, Essen breit, Einkauf breit", () => {
    const r = rasterOf(shown(defaultHome("allein")));
    expect(at(r)).toEqual(["wetter@0,0", "notizen@0,1", "wundertuete@1,0", "termine@0,2+", "aufgaben@0,4+", "essen@0,6+", "einkauf@0,8+"]);
    expect(r.luecken).toEqual([]);
  });

  it("zwei S nebeneinander bündig, XS-Paare übereinander neben einer S", () => {
    const r = rasterOf(tiles([["pinnwand", "S"], ["wetter", "S"], ["timer", "XS"], ["notizen", "XS"], ["sport", "S"]]));
    expect(at(r)).toEqual(["pinnwand@0,0", "wetter@1,0", "timer@0,2", "notizen@0,3", "sport@1,2"]);
    expect(r.luecken).toEqual([]);
  });

  it("einzelne S/XS ziehen die nächste passende Kachel nach oben", () => {
    // S, dann M (passt nicht daneben), dann XS → XS füllt die Hälfte neben der S
    const r = rasterOf(tiles([["pinnwand", "S"], ["termine", "M"], ["wetter", "XS"]]));
    expect(at(r)).toEqual(["pinnwand@0,0", "termine@0,2+", "wetter@1,0"]);
    // die Lücke unter dem XS bleibt ruhig leer (im Bearbeiten „＋ Kachel“)
    expect(r.luecken).toEqual([{ col: 1, row: 1, h: 1 }]);
  });

  it("zwei XS nebeneinander als halbe Zeile – nur vor etwas Breitem (sonst übereinander)", () => {
    const r = rasterOf(tiles([["wetter", "XS"], ["timer", "XS"], ["termine", "M"]]));
    expect(at(r)).toEqual(["wetter@0,0", "timer@1,0", "termine@0,1+"]);
    expect(r.luecken).toEqual([]);
    expect(at(rasterOf(tiles([["wetter", "XS"], ["timer", "XS"]])))).toEqual(["wetter@0,0", "timer@1,0"]);
    expect(at(rasterOf(tiles([["wetter", "XS"], ["timer", "XS"], ["notizen", "S"]])))).toEqual(["wetter@0,0", "timer@0,1", "notizen@1,0"]);
  });

  it("Lücke ohne Partner: eine S allein am Ende hat daneben eine S-Lücke", () => {
    const r = rasterOf(tiles([["termine", "M"], ["notizen", "S"]]));
    expect(r.luecken).toEqual([{ col: 1, row: 2, h: 2 }]);
  });

  it("Essen + Einkauf (beide S) sind EINE Einheit von voller Breite – auch nach einer einzelnen S", () => {
    const r = rasterOf(tiles([["notizen", "S"], ["essen", "S"], ["einkauf", "S"]]));
    expect(at(r)).toEqual(["notizen@0,0", "essen+einkauf@0,2+"]);
    expect(unitsOf(tiles([["essen", "M"], ["einkauf", "S"]])).map((u) => u.key)).toEqual(["essen", "einkauf"]);
  });

  it("Höhe nie vom Inhalt: das Raster hängt nur von Reihenfolge und Größen ab", () => {
    const a = rasterOf(shown(DEFAULT_HOME));
    const b = packe(unitsOf(shown(DEFAULT_HOME)));
    expect(a).toEqual(b);
    const board = readFileSync("src/components/heute/HomeBoard.tsx", "utf8");
    expect(board).toMatch(/gridTemplateRows: rowsCss/);
    expect(board).toMatch(/"--zeile"/);
    expect(board).not.toMatch(/style=\{ghost \? \{ height/);
  });

  it("Größenwechsel: die Nachbarn rücken sofort nach", () => {
    const alt = tiles([["pinnwand", "S"], ["wetter", "XS"], ["notizen", "XS"], ["termine", "M"], ["aufgaben", "M"], ["essen", "S"], ["einkauf", "S"]]);
    const big = shown(applyHomeChange(alt, { tile: "wetter", action: "mittel" }));
    expect(at(rasterOf(alt))[1]).toBe("wetter@1,0");
    expect(at(rasterOf(big))).toEqual(["pinnwand@0,0", "wetter@0,2+", "notizen@1,0", "termine@0,4+", "aufgaben@0,6+", "essen+einkauf@0,8+"]);
  });
});

describe("Bearbeiten = Fertig-Ansicht (Pinnwand-Streifen-Fehler)", () => {
  it("dasselbe Raster in beiden Modi, Pinnwand S immer 1 × 2", () => {
    const board = readFileSync("src/components/heute/HomeBoard.tsx", "utf8");
    // Das Raster wird einmal gerechnet (nicht je Modus), jede Kachel füllt ihren Platz
    expect(board).toMatch(/const raster = packe\(preview\)/);
    expect(board).not.toMatch(/half && !editing/);
    expect(board).toMatch(/\[&>div>\*\]:h-full/);
    const frame = readFileSync("src/components/heute/EditFrame.tsx", "utf8");
    // Knöpfe liegen IN der Kachel (kein Zusatzplatz darunter, kein Einzug links)
    expect(frame).not.toMatch(/pl-3/);
    expect(frame).toMatch(/absolute z-10 flex items-end/);
    const pin = readFileSync("src/components/pinnwand/PinboardTile.tsx", "utf8");
    expect(pin).not.toMatch(/h-\[156px\]|min-h-\[120px\]/);
    expect(pin).toMatch(/flex h-full flex-col/);
    const p = rasterOf(shown(DEFAULT_HOME)).plaetze.find((x) => x.key === "pinnwand")!;
    expect([p.w, p.h]).toEqual([1, 2]);
  });
});

describe("Lücke füllen („＋ Kachel“)", () => {
  const start = tiles([["pinnwand", "S"], ["termine", "M"], ["wetter", "XS"]]);
  const all = sanitizeHome(start);
  it("nur passende Kacheln: XS-Lücke → XS-fähige, nie Essen/Einkauf", () => {
    const l = rasterOf(start).luecken[0];
    expect(passtInLuecke("notizen", l)).toBe(true);
    expect(passtInLuecke("termine", l)).toBe(false);
    expect(passtInLuecke("essen", { col: 1, row: 0, h: 2 })).toBe(false);
    expect(groesseFuer("pinnwand", { col: 1, row: 0, h: 2 })).toBe("S");
    expect(groesseFuer("wetter", { col: 1, row: 0, h: 2 })).toBe("S");
    expect(groesseFuer("pinnwand", l)).toBeNull();
  });
  it("die Kachel landet genau in der Lücke, die anderen bleiben stehen", () => {
    const l = rasterOf(start).luecken[0];
    const next = fuelleLuecke(all, start, l, "notizen");
    const r = rasterOf(shown(next));
    expect(at(r).sort()).toEqual(["notizen@1,1", "pinnwand@0,0", "termine@0,2+", "wetter@1,0"]);
    expect(sizeOf(next, "notizen")).toBe("XS");
    expect(r.luecken).toEqual([]);
  });
  it("Farbe bleibt beim Hineinstellen", () => {
    const colored = sanitizeHome([...start, { id: "notizen", visible: false, size: "M", farbe: "rose" }]);
    const l = rasterOf(start).luecken[0];
    expect(fuelleLuecke(colored, start, l, "notizen").find((t) => t.id === "notizen")?.farbe).toBe("rose");
  });
});

describe("Mias Tipp unter einer Kachel", () => {
  it("an der ersten Grenze, über die keine Kachel reicht; Pfeil links/rechts/mittig", () => {
    const list = shown(DEFAULT_HOME);
    const r = rasterOf(list);
    const u = unitsOf(list);
    expect(trennZeile(r, "wetter")).toBe(2);
    expect(trennZeile(r, "termine")).toBe(4);
    expect(trennZeile(r, "fehlt")).toBeNull();
    expect(pfeilZu(u, r, "pinnwand")).toBe("rechts");
    expect(pfeilZu(u, r, "notizen")).toBe("links");
    expect(pfeilZu(u, r, "termine")).toBe("mitte");
    expect(pfeilZu(u, r, "einkauf")).toBe("mitte");
    expect(pfeilZu(u, r, "essen")).toBe("links");
    expect(pfeilZu(u, r, "wundertuete")).toBe("rechts");
    // das Paar Essen + Einkauf (beide S): je nach Hälfte
    const alt = tiles([["termine", "M"], ["essen", "S"], ["einkauf", "S"]]);
    expect(pfeilZu(unitsOf(alt), rasterOf(alt), "einkauf")).toBe("rechts");
    expect(pfeilZu(u, r, "sport")).toBeNull();
  });
});

describe("Timer: kein fester Platz", () => {
  it("ein laufender Timer steht im Kreis oben, nie als Kachel dazwischen (A-050)", () => {
    expect(DEFAULT_HOME.find((t) => t.id === "timer")?.visible).toBe(false);
    const today = readFileSync("src/components/heute/TodayPage.tsx", "utf8");
    expect(today).not.toMatch(/mitLaufendemTimer/);
    expect(today).toMatch(/<KreisReihe /);
  });
});

describe("Standard je Haushalt (Tafel 140, A-050)", () => {
  it("Familie und zu zweit gleich, allein ohne Pinnwand mit Wundertüte daneben; nie Sport, Timer, Im Haus als Kachel", () => {
    const vis = (h: "familie" | "paar" | "allein") => shown(defaultHome(h)).map((t) => `${t.id}:${t.size}`);
    expect(vis("familie")).toEqual(["wetter:XS", "notizen:XS", "pinnwand:S", "termine:M", "aufgaben:M", "essen:S", "wundertuete:S", "einkauf:M"]);
    expect(vis("paar")).toEqual(vis("familie"));
    expect(vis("allein")).toEqual(["wetter:XS", "notizen:XS", "wundertuete:S", "termine:M", "aufgaben:M", "essen:M", "einkauf:M"]);
    expect(defaultHome("allein")).toHaveLength(HOME_TILES.length);
  });

  it("„Standard-Anordnung wiederherstellen“ je Haushalt", () => {
    const moved = applyHomeChange(defaultHome("allein"), { tile: "termine", action: "nach_unten" });
    expect(shown(standardLayout(moved, "allein")).map((t) => t.id)).toEqual(shown(defaultHome("allein")).map((t) => t.id));
    // ohne Angabe: Pinnwand sichtbar = Familie
    expect(standardLayout(DEFAULT_HOME)).toEqual(DEFAULT_HOME);
  });

  it("Haushaltswechsel: unveränderte Standard-Anordnung wechselt mit, eigene bleibt", () => {
    expect(homeForHaushalt(defaultHome("familie"), "familie", "allein")).toEqual(defaultHome("allein"));
    expect(homeForHaushalt(defaultHome("allein"), "allein", "paar")).toEqual(defaultHome("paar"));
    // selbst geändert: nichts überschreiben – nur Pinnwand bei „allein“ ausgeblendet (alle Standard-Kacheln sind schon da)
    const own = applyHomeChange(DEFAULT_HOME, { tile: "aufgaben", action: "nach_oben" });
    const solo = homeForHaushalt(own, "familie", "allein");
    expect(shown(solo).map((t) => t.id)).toEqual(shown(own).map((t) => t.id).filter((id) => id !== "pinnwand"));
    expect(solo.find((t) => t.id === "pinnwand")).toBeDefined();
    // zurück zu zweit: fehlende Standard-Kacheln (Pinnwand) kommen dazu, der Rest bleibt
    const back = homeForHaushalt(solo, "allein", "paar");
    expect(shown(back).map((t) => t.id).filter((id) => id !== "pinnwand")).toEqual(shown(solo).map((t) => t.id));
    expect(shown(back).some((t) => t.id === "pinnwand")).toBe(true);
    // Farben bleiben
    const colored = applyHomeChange(DEFAULT_HOME, { tile: "notizen", action: "farbe", farbe: "rose" });
    expect(homeForHaushalt(colored, "familie", "allein").find((t) => t.id === "notizen")?.farbe).toBe("rose");
  });
});

describe("Migration v8 → v9 (Tafel 118)", () => {
  it("Anordnung und Größen bleiben, L → M, nicht Erlaubtes auf die nächste erlaubte, keine Kachel verschwindet", () => {
    const v8 = [
      { id: "pinnwand", visible: true, size: "L" },
      { id: "wetter", visible: true, size: "S" },
      { id: "timer", visible: true, size: "M" },
      { id: "sport", visible: true, size: "L" },
      { id: "termine", visible: true, size: "L", farbe: "mint" },
      { id: "notizen", visible: false, size: "L" },
      { id: "vorrat", visible: true, size: "M" },
      { id: "tipps", visible: false, size: "L" },
    ];
    const m = migrateHome({ version: 8, tiles: v8, tipSeen: true })!;
    expect(m.version).toBe(10);
    // v10 (A-050): Im Haus aus der Anordnung (wählbar S/M), Timer/Sport in S/M bleiben Kacheln
    expect(m.tiles.slice(0, 8).map((t) => `${t.id}:${t.size}:${t.visible}`)).toEqual(["pinnwand:M:true", "wetter:S:true", "timer:S:true", "sport:M:true", "termine:M:true", "notizen:M:false", "vorrat:M:false", "tipps:M:false"]);
    expect(m.tiles.find((t) => t.id === "termine")?.farbe).toBe("mint");
    expect(m.tiles).toHaveLength(HOME_TILES.length);
  });

  it("v5: eine bisher breite einzelne S wird einmal M, Paare bleiben", () => {
    const old = tiles([["pinnwand", "S"], ["wetter", "S"], ["notizen", "S"], ["termine", "M"], ["essen", "S"], ["einkauf", "S"], ["timer", "S"]]);
    const moved = lonelySToM(old);
    expect(moved.map((t) => `${t.id}:${t.size}`)).toEqual(["pinnwand:S", "wetter:S", "notizen:M", "termine:M", "essen:S", "einkauf:S", "timer:S"]);
    expect(migrateHome({ version: 5, tiles: old, tipSeen: true })!.tiles.find((t) => t.id === "notizen")?.size).toBe("M");
    expect(migrateHome({ version: 6, tiles: old, tipSeen: true })!.tiles.find((t) => t.id === "notizen")?.size).toBe("S");
  });

  it("alte Sicherung (v0.47, Startseite v4): alle Kacheln bleiben, Größen erlaubt", () => {
    const backup = JSON.parse(readFileSync("tests/fixtures/sicherung-v0.47.json", "utf8"));
    const m = migrateHome(JSON.parse(backup.data["wasgibts.startseite"]))!;
    expect(m.version).toBe(10);
    expect(m.tiles).toHaveLength(HOME_TILES.length);
    expect(shown(m.tiles).map((t) => t.id)).toEqual(expect.arrayContaining(["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "spendentopf", "notizen"]));
    // Im Haus nur ausgeblendet (A-050), nie gelöscht
    expect(m.tiles.find((t) => t.id === "vorrat")?.visible).toBe(false);
    for (const t of m.tiles) expect(HOME_TILES.find((x) => x.id === t.id)!.sizes).toContain(t.size);
  });

  it("jede gespeicherte Größe landet in einer erlaubten (auch Unsinn)", () => {
    for (const t of HOME_TILES)
      for (const size of ["XS", "S", "M", "L", "XXL", 3] as unknown as TileSize[]) {
        const fixed = sanitizeHome([{ id: t.id, visible: true, size }]).find((x) => x.id === t.id)!;
        expect(t.sizes).toContain(fixed.size);
      }
  });
});

const note = (id: string, title: string, o: Partial<Note["data"]> = {}, geaendert = "2026-10-27T10:00:00Z"): Note =>
  ({ id, typ: "notiz", raum: "familie", besitzer: "lokal", erstellt: geaendert, geaendert, data: { title, kind: "text", text: "", pinned: false, ...o } }) as Note;

describe("Notizen-Kachel XS/S/M", () => {
  const notes = [
    note("a", "WLAN", { text: "abc123\nzweite" }, "2026-10-25T10:00:00Z"),
    note("b", "Geschenkideen", { kind: "liste", items: [{ id: "1", text: "Laufrad", done: true }, { id: "2", text: "Buch" }, { id: "3", text: "Puzzle" }] }, "2026-10-26T10:00:00Z"),
    note("c", "Arzt", { text: "Dr. Berg", pinned: true }, "2026-10-20T10:00:00Z"),
    note("d", "Ideen", { text: "x" }, "2026-10-24T10:00:00Z"),
    note("q", "Schnellnotiz", { text: "egal", schnell: true }, "2026-10-27T10:00:00Z"),
  ];
  it("XS eine (angeheftete zuerst), S und M drei – ohne Schnellnotiz", () => {
    expect(notizZeilen(notes, "XS").map((r) => r.id)).toEqual(["c"]);
    expect(notizZeilen(notes, "S").map((r) => r.id)).toEqual(["c", "b", "a"]);
    expect(notizZeilen(notes, "M").map((r) => r.id)).toEqual(["c", "b", "a"]);
  });
  it("Anfang: erste Textzeile bzw. was schon erledigt ist", () => {
    expect(notizAnfang(notes[0])).toBe("abc123");
    expect(notizAnfang(notes[1])).toBe("1 von 3 erledigt");
  });
});
