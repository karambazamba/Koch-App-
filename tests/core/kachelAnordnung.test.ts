import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_HOME,
  HOME_ACTIONS,
  HOME_TILES,
  applyHomeChange,
  describeHomeChange,
  migrateHome,
  reorderVisible,
  sanitizeHome,
  standardLayout,
  tileLabel,
  type HomeTile,
  type HomeTileId,
  lonelySToM,
} from "@/lib/core/homeLayout";
import { unitsOf } from "@/lib/core/homeUnits";
import { STANDARD_KREISE } from "@/lib/heute/kreise";
import { rasterOf } from "@/lib/heute/raster";
import { fakeWindow, noBrowser } from "../helpers";

const visible = (tiles: HomeTile[]) => tiles.filter((t) => t.visible).map((t) => t.id);
const sizeOf = (tiles: HomeTile[], id: HomeTileId) => tiles.find((t) => t.id === id)!.size;
const only = (...ids: HomeTileId[]) => sanitizeHome(ids.map((id) => ({ id, visible: true, size: HOME_TILES.find((t) => t.id === id)!.size })));

afterEach(() => {
  noBrowser();
});

/** Anordnung eines bestehenden Nutzers (Standard bis A-050, Tafel 119): Essen + Einkauf als Paar (beide S) */
const ALT = sanitizeHome(
  (
    [
      ["pinnwand", "S"],
      ["wetter", "XS"],
      ["notizen", "XS"],
      ["termine", "M"],
      ["aufgaben", "M"],
      ["essen", "S"],
      ["einkauf", "S"],
    ] as const
  ).map(([id, size]) => ({ id, visible: true, size })),
);

/** Alte Anordnung + „Im Haus“ aus der Kachel-Auswahl (S, an seinem Platz hinter dem Paar) */
const MIT_HAUS = applyHomeChange(ALT, { tile: "vorrat", action: "zeigen" });

describe("Startseite: Prüfen", () => {
  it("Standard (Tafel 140, A-050): Wetter + Notizen XS | Pinnwand S, Termine, Aufgaben, Essen S | Wundertüte S, Einkauf M (ohne Spendentopf, Im Haus, Sport, Timer)", () => {
    expect(DEFAULT_HOME.filter((t) => t.visible).map((t) => `${t.id}:${t.size}`)).toEqual(["wetter:XS", "notizen:XS", "pinnwand:S", "termine:M", "aufgaben:M", "essen:S", "wundertuete:S", "einkauf:M"]);
    // Im Haus dazugewählt: an seinen Platz hinter dem Paar, als S (nur noch S/M wählbar)
    expect(visible(MIT_HAUS)).toEqual(["pinnwand", "wetter", "notizen", "termine", "aufgaben", "essen", "einkauf", "vorrat"]);
    expect(MIT_HAUS.find((t) => t.id === "vorrat")?.size).toBe("S");
    expect(DEFAULT_HOME).toHaveLength(HOME_TILES.length);
  });

  it("wirft Unbekanntes und Doppeltes weg, ergänzt Fehlendes unsichtbar, korrigiert Größen", () => {
    const tiles = sanitizeHome([null, "x", { id: "kladde" }, { id: "wetter", size: "L" }, { id: "wetter", visible: false }, { id: "spendentopf", size: "S" }, { id: "timer", visible: false }]);
    // altes L → M, Spendentopf nur M, Timer ohne Größe → Standard XS
    expect(tiles.slice(0, 3)).toEqual([
      { id: "wetter", visible: true, size: "M" },
      { id: "spendentopf", visible: true, size: "M" },
      { id: "timer", visible: false, size: "XS" },
    ]);
    expect(tiles).toHaveLength(HOME_TILES.length);
    expect(tiles.slice(3).every((t) => !t.visible)).toBe(true);
    expect(sanitizeHome("kaputt")).toHaveLength(HOME_TILES.length);
  });

  it("Essen + Einkauf bleiben beisammen (Essen zuerst), nur wenn beide sichtbar und beide S", () => {
    const paar = (ids: HomeTileId[]) => sanitizeHome(ids.map((id) => ({ id, visible: true, size: id === "termine" ? "M" : "S" })));
    expect(visible(paar(["einkauf", "termine", "essen"]))).toEqual(["essen", "einkauf", "termine"]);
    // Einkauf M (Tafel 140) steht für sich – kein Paar, die Reihenfolge bleibt
    expect(visible(only("einkauf", "termine", "essen"))).toEqual(["einkauf", "termine", "essen"]);
    const hidden = sanitizeHome([{ id: "einkauf", visible: true }, { id: "termine" }, { id: "essen", visible: false }]);
    expect(hidden.map((t) => t.id).slice(0, 3)).toEqual(["einkauf", "termine", "essen"]);
  });
});

describe("Startseite: Kachel zeigen", () => {
  it("landet direkt nach der nächsten sichtbaren, die laut Standard davor steht – in Standard-Größe", () => {
    const tiles = applyHomeChange(DEFAULT_HOME, { tile: "timer", action: "zeigen" });
    const v = visible(tiles);
    expect(v.indexOf("timer")).toBe(v.indexOf("einkauf") + 1);
    expect(sizeOf(tiles, "timer")).toBe("XS");
    // schon sichtbar: bleibt, wie es ist
    expect(applyHomeChange(tiles, { tile: "timer", action: "zeigen" })).toEqual(tiles);
  });

  it("nichts davor sichtbar: vor die erste sichtbare Kachel", () => {
    const tiles = applyHomeChange(only("termine", "aufgaben"), { tile: "pinnwand", action: "zeigen" });
    expect(visible(tiles)).toEqual(["pinnwand", "termine", "aufgaben"]);
  });

  it("alles ausgeblendet: ganz an den Anfang", () => {
    const none = sanitizeHome([]);
    const tiles = applyHomeChange(none, { tile: "notizen", action: "zeigen" });
    expect(tiles[0]).toEqual({ id: "notizen", visible: true, size: "XS" });
  });

  it("Paar: Einkauf rechts neben Essen, Essen links neben Einkauf", () => {
    const withoutShop = applyHomeChange(applyHomeChange(ALT, { tile: "einkauf", action: "ausblenden" }), { tile: "essen", action: "nach_oben" });
    expect(visible(withoutShop)[0]).toBe("essen");
    // Einkauf kommt in Standard-Größe (M, Tafel 140) – kein Paar, an seinen Standard-Platz
    const back = applyHomeChange(withoutShop, { tile: "einkauf", action: "zeigen" });
    expect(visible(back).at(-1)).toBe("einkauf");
    const klein = sanitizeHome(applyHomeChange(back, { tile: "einkauf", action: "klein" }));
    expect(visible(klein).slice(0, 2)).toEqual(["essen", "einkauf"]);
    const withoutFood = applyHomeChange(applyHomeChange(ALT, { tile: "essen", action: "ausblenden" }), { tile: "einkauf", action: "nach_unten" });
    const food = applyHomeChange(withoutFood, { tile: "essen", action: "zeigen" });
    expect(visible(food).slice(-2)).toEqual(["essen", "einkauf"]);
  });
});

describe("Startseite: Größe, Ausblenden, Standard", () => {
  it("Größe nur, wie die Kachel sie kennt; alte Namen kompakt/ausführlich gehen weiter", () => {
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "klein" }), "termine")).toBe("S");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "kompakt" }), "termine")).toBe("S");
    // L gibt es nicht mehr: groß/ausführlich = M
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "gross" }), "termine")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "ausfuehrlich" }), "termine")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "wetter", action: "mittel" }), "wetter")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "wetter", action: "klein" }), "wetter")).toBe("S");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "mini" }), "pinnwand")).toBe("S");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "mini" }), "termine")).toBe("S");
    // Spendentopf gibt es nur in M, Im Haus nur S/M (A-050), ganz klein → S
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "spendentopf", action: "klein" }), "spendentopf")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "vorrat", action: "gross" }), "vorrat")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "vorrat", action: "mini" }), "vorrat")).toBe("S");
  });

  it("Größe ändern holt eine ausgeblendete Kachel zurück", () => {
    const tiles = applyHomeChange(DEFAULT_HOME, { tile: "sport", action: "klein" });
    expect(tiles.find((t) => t.id === "sport")).toEqual({ id: "sport", visible: true, size: "S" });
  });

  it("Ausblenden löscht nichts; Standard stellt Reihenfolge und Größen wieder her", () => {
    let tiles = applyHomeChange(DEFAULT_HOME, { tile: "wetter", action: "ausblenden" });
    expect(visible(tiles)).not.toContain("wetter");
    expect(tiles.some((t) => t.id === "wetter")).toBe(true);
    tiles = applyHomeChange(tiles, { tile: "aufgaben", action: "nach_oben" });
    tiles = applyHomeChange(tiles, { tile: "termine", action: "gross" });
    const std = applyHomeChange(tiles, { tile: "post", action: "standard" });
    expect(std.map((t) => t.id)).toEqual(HOME_TILES.map((t) => t.id));
    expect(sizeOf(std, "termine")).toBe("M");
    expect(std.find((t) => t.id === "wetter")!.visible).toBe(false);
    expect(standardLayout(DEFAULT_HOME)).toEqual(DEFAULT_HOME);
  });

  it("unbekannte Kachel: nichts passiert", () => {
    expect(applyHomeChange(DEFAULT_HOME, { tile: "kladde" as HomeTileId, action: "ausblenden" })).toEqual(sanitizeHome(DEFAULT_HOME));
  });
});

describe("Startseite: Verschieben", () => {
  it("hoch/runter = eine sichtbare Kachel weiter", () => {
    expect(visible(applyHomeChange(ALT, { tile: "termine", action: "hoch" })).slice(0, 4)).toEqual(["pinnwand", "wetter", "termine", "notizen"]);
    expect(visible(applyHomeChange(ALT, { tile: "pinnwand", action: "runter" })).slice(0, 3)).toEqual(["wetter", "pinnwand", "notizen"]);
    // ganz oben bzw. ganz unten: bleibt
    expect(visible(applyHomeChange(ALT, { tile: "pinnwand", action: "hoch" }))).toEqual(visible(ALT));
    expect(visible(applyHomeChange(MIT_HAUS, { tile: "vorrat", action: "runter" }))).toEqual(visible(MIT_HAUS));
  });

  it("ganz nach oben / ganz nach unten", () => {
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "aufgaben", action: "nach_oben" }))[0]).toBe("aufgaben");
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "nach_unten" })).at(-1)).toBe("pinnwand");
  });

  it("Essen + Einkauf wandern zusammen", () => {
    const up = visible(applyHomeChange(ALT, { tile: "einkauf", action: "nach_oben" }));
    expect(up.slice(0, 2)).toEqual(["essen", "einkauf"]);
    // Einkauf M (neuer Standard) wandert allein
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "einkauf", action: "nach_oben" }))[0]).toBe("einkauf");
    const down = visible(applyHomeChange(MIT_HAUS, { tile: "essen", action: "runter" }));
    expect(down.slice(5, 8)).toEqual(["vorrat", "essen", "einkauf"]);
  });

  it("über das Paar hinweg: eine Kachel springt am ganzen Paar vorbei", () => {
    // Im Haus steht direkt hinter Essen + Einkauf → nach oben = vor das Paar
    const up = visible(applyHomeChange(MIT_HAUS, { tile: "vorrat", action: "hoch" }));
    expect(up.slice(4, 8)).toEqual(["aufgaben", "vorrat", "essen", "einkauf"]);
    // Aufgaben direkt davor → nach unten = hinter das Paar
    const down = visible(applyHomeChange(ALT, { tile: "aufgaben", action: "runter" }));
    expect(down.slice(3, 7)).toEqual(["termine", "essen", "einkauf", "aufgaben"]);
  });

  it("Ziehen: sichtbare neu geordnet, ausgeblendete dahinter", () => {
    const tiles = reorderVisible(ALT, ["termine", "pinnwand", "einkauf", "essen", "nix" as HomeTileId]);
    expect(visible(tiles).slice(0, 4)).toEqual(["termine", "pinnwand", "essen", "einkauf"]);
    expect(tiles).toHaveLength(HOME_TILES.length);
  });
});

describe("Startseite: Texte", () => {
  it("beschreibt jede Aktion kurz", () => {
    expect(describeHomeChange({ tile: "wetter", action: "mini" })).toBe("Wetter ist jetzt ganz klein.");
    expect(describeHomeChange({ tile: "wetter", action: "klein" })).toBe("Wetter ist jetzt klein.");
    expect(describeHomeChange({ tile: "wetter", action: "kompakt" })).toBe("Wetter ist jetzt klein.");
    expect(describeHomeChange({ tile: "wetter", action: "mittel" })).toBe("Wetter ist jetzt mittelgroß.");
    expect(describeHomeChange({ tile: "wetter", action: "ausfuehrlich" })).toBe("Wetter ist jetzt groß.");
    expect(describeHomeChange({ tile: "wetter", action: "gross" })).toBe("Wetter ist jetzt groß.");
    expect(describeHomeChange({ tile: "notizen", action: "zeigen" })).toContain("steht jetzt auf der Startseite");
    expect(describeHomeChange({ tile: "notizen", action: "ausblenden" })).toContain("Startseite bearbeiten");
    expect(describeHomeChange({ tile: "notizen", action: "standard" })).toBe("Die Startseite steht wieder wie am Anfang.");
    expect(describeHomeChange({ tile: "notizen", action: "hoch" })).toBe("Notizen ist verschoben.");
    expect(tileLabel("kladde" as HomeTileId)).toBe("kladde");
    expect(HOME_ACTIONS).toContain("nach_unten");
  });
});

describe("Startseite: Migration", () => {
  it("v5 bleibt, v4 bekommt einmal Notizen ans Ende der sichtbaren, v3 zusätzlich den Spendentopf", () => {
    expect(migrateHome({ version: 5, tiles: ALT, tipSeen: true })).toEqual({ version: 10, tiles: lonelySToM(ALT), tipSeen: true, kreise: STANDARD_KREISE });
    const v4 = migrateHome({ version: 4, tiles: [{ id: "termine", visible: true, size: "M" }, { id: "notizen", visible: false, size: "M" }, { id: "wetter", visible: true, size: "S" }], tipSeen: true })!;
    expect(visible(v4.tiles)).toEqual(["termine", "wetter", "notizen"]);
    const v3 = migrateHome({ version: 3, tiles: [{ id: "termine", visible: true, size: "M" }, { id: "wetter", visible: true, size: "S" }, { id: "notizen", visible: false, size: "M" }] })!;
    expect(visible(v3.tiles)).toEqual(["termine", "wetter", "spendentopf", "notizen"]);
    expect(v3.tipSeen).toBe(false);
    // Spendentopf schon sichtbar: nichts ändern
    const keep = migrateHome({ version: 3, tiles: [{ id: "spendentopf", visible: true }, { id: "termine", visible: true }] })!;
    expect(visible(keep.tiles)).toEqual(["spendentopf", "termine", "notizen"]);
  });

  it("v1: Aufgaben direkt hinter Termine, Hinweis gilt als gesehen", () => {
    const m = migrateHome({ version: 1, tiles: [{ id: "termine", visible: false }, { id: "essen" }, 7] })!;
    expect(m.tiles.slice(0, 2).map((t) => [t.id, t.visible])).toEqual([
      ["termine", false],
      ["aufgaben", false],
    ]);
    expect(m.tipSeen).toBe(true);
    const keep = migrateHome({ version: 1, tiles: [{ id: "aufgaben" }, { id: "termine" }] })!;
    expect(keep.tiles.map((t) => t.id).slice(0, 2)).toEqual(["aufgaben", "termine"]);
  });

  it("v2: Kladde wird Notizen an derselben Stelle", () => {
    const m = migrateHome({ version: 2, tiles: [{ id: "termine" }, { id: "kladde" }, { id: "notizen", visible: false }, { id: "essen" }], tipSeen: true })!;
    expect(visible(m.tiles).slice(0, 3)).toEqual(["termine", "notizen", "essen"]);
    expect(m.tipSeen).toBe(true);
    // Notizen schon sichtbar: Kladde fällt weg, Notizen bleibt, wo es war
    const shown = migrateHome({ version: 2, tiles: [{ id: "kladde" }, { id: "termine" }, { id: "notizen" }] })!;
    expect(visible(shown.tiles).slice(0, 2)).toEqual(["termine", "notizen"]);
    // Kladde ausgeblendet: Notizen bleibt, wie es war
    // Kladde ausgeblendet: Notizen kommt trotzdem (gehört zu 1.0) – ans Ende der sichtbaren
    const off = migrateHome({ version: 2, tiles: [{ id: "kladde", visible: false }, { id: "notizen", visible: false }, { id: "termine" }] })!;
    expect(visible(off.tiles).at(-1)).toBe("notizen");
  });

  it("v6 → v7 (Tafel 98): „Ausblick morgen“ fällt still weg, die übrige Anordnung bleibt", () => {
    const v6 = [
      { id: "pinnwand", visible: true, size: "S" },
      { id: "wetter", visible: true, size: "S" },
      { id: "termine", visible: true, size: "M" },
      { id: "morgen", visible: true, size: "M" },
      { id: "aufgaben", visible: true, size: "L" },
      { id: "essen", visible: true, size: "S" },
      { id: "einkauf", visible: true, size: "S" },
    ];
    const m = migrateHome({ version: 6, tiles: v6, tipSeen: true })!;
    expect(m.version).toBe(10);
    expect(m.tipSeen).toBe(true);
    expect(m.tiles.some((t) => (t.id as string) === "morgen")).toBe(false);
    expect(m.tiles.filter((t) => t.visible).map((t) => [t.id, t.size])).toEqual([
      ["pinnwand", "S"],
      ["wetter", "S"],
      ["termine", "M"],
      ["aufgaben", "M"],
      ["essen", "S"],
      ["einkauf", "S"],
    ]);
    // Auch aus alten Sicherungen (v1–v5) nie mehr
    for (const version of [1, 2, 3, 4, 5]) expect(migrateHome({ version, tiles: [{ id: "morgen", visible: true }, { id: "termine" }] })!.tiles.some((t) => (t.id as string) === "morgen")).toBe(false);
    expect(HOME_TILES.some((t) => (t.id as string) === "morgen")).toBe(false);
  });

  it("Unbekanntes → null", () => {
    expect(migrateHome(null)).toBeNull();
    expect(migrateHome({ version: 11 })).toBeNull();
    expect(migrateHome({ version: 2, tiles: "x" })!.tiles).toHaveLength(HOME_TILES.length);
  });
});

describe("Startseite: Speicher", () => {
  it("ohne Daten = Standard; Änderung speichern und zurücknehmen", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    expect(home.loadHomeTiles()).toEqual(home.DEFAULT_HOME);
    const undo = home.changeHome({ tile: "wetter", action: "gross" });
    expect(sizeOf(home.loadHomeTiles(), "wetter")).toBe("M");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.startseite")!).version).toBe(10);
    undo();
    expect(sizeOf(home.loadHomeTiles(), "wetter")).toBe("XS");
  });

  it("Lotte nutzt eine Kachel → sie kommt dazu (einmal)", async () => {
    fakeWindow();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    expect(home.unlockHomeTile("sport")).toBe(true);
    expect(home.unlockHomeTile("sport")).toBe(false);
    expect(visible(home.loadHomeTiles())).toContain("sport");
  });

  it("Hinweis gesehen bleibt bei späteren Änderungen", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    home.markHomeTipSeen();
    home.saveHomeTiles(home.applyHomeChange(home.loadHomeTiles(), { tile: "notizen", action: "zeigen" }));
    expect(JSON.parse(win.localStorage.getItem("wasgibts.startseite")!).tipSeen).toBe(true);
  });

  it("Bearbeiten-Modus anfordern – auch vor dem Zeichnen, genau einmal", async () => {
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    home.requestHomeEdit();
    const open = vi.fn();
    const off = home.onHomeEditRequest(open);
    await Promise.resolve();
    expect(open).toHaveBeenCalledTimes(1);
    home.requestHomeEdit();
    expect(open).toHaveBeenCalledTimes(2);
    off();
    home.requestHomeEdit();
    expect(open).toHaveBeenCalledTimes(2);
  });
});

describe("Startseite: Einheiten und Raster", () => {
  it("Essen + Einkauf (beide S) = eine Einheit; dicht gefüllt im Raster", () => {
    const units = unitsOf(MIT_HAUS.filter((t) => t.visible));
    expect(units.map((u) => u.key)).toEqual(["pinnwand", "wetter", "notizen", "termine", "aufgaben", "essen+einkauf", "vorrat"]);
    const r = rasterOf(MIT_HAUS.filter((t) => t.visible));
    expect(r.plaetze.map((p) => `${p.key}@${p.col},${p.row}`)).toEqual(["pinnwand@0,0", "wetter@1,0", "notizen@1,1", "termine@0,2", "aufgaben@0,4", "essen+einkauf@0,6", "vorrat@0,8"]);
  });

  it("Essen in M ist kein Paar mehr", () => {
    const tiles = applyHomeChange(ALT, { tile: "essen", action: "mittel" }).filter((t) => t.visible);
    expect(unitsOf(tiles).map((u) => u.key)).toContain("essen");
    expect(unitsOf(tiles).map((u) => u.key)).toContain("einkauf");
  });
});
