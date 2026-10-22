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
} from "@/lib/core/homeLayout";
import { rowsOf, unitsOf } from "@/lib/core/homeUnits";
import { fakeBrowser, noBrowser } from "./fakeBrowser";

const visible = (tiles: HomeTile[]) => tiles.filter((t) => t.visible).map((t) => t.id);
const sizeOf = (tiles: HomeTile[], id: HomeTileId) => tiles.find((t) => t.id === id)!.size;
const only = (...ids: HomeTileId[]) => sanitizeHome(ids.map((id) => ({ id, visible: true, size: HOME_TILES.find((t) => t.id === id)!.size })));

afterEach(() => {
  noBrowser();
});

describe("Startseite: Prüfen", () => {
  it("Standard: Pinnwand + Wetter, Termine, Aufgaben, Essen + Einkauf, Spendentopf", () => {
    expect(visible(DEFAULT_HOME).slice(0, 7)).toEqual(["pinnwand", "wetter", "termine", "aufgaben", "essen", "einkauf", "spendentopf"]);
    expect(DEFAULT_HOME).toHaveLength(HOME_TILES.length);
  });

  it("wirft Unbekanntes und Doppeltes weg, ergänzt Fehlendes unsichtbar, korrigiert Größen", () => {
    const tiles = sanitizeHome([null, "x", { id: "kladde" }, { id: "wetter", size: "L" }, { id: "wetter", visible: false }, { id: "spendentopf", size: "S" }, { id: "morgen", visible: false }]);
    expect(tiles.slice(0, 3)).toEqual([
      { id: "wetter", visible: true, size: "L" },
      { id: "spendentopf", visible: true, size: "M" },
      { id: "morgen", visible: false, size: "M" },
    ]);
    expect(tiles).toHaveLength(HOME_TILES.length);
    expect(tiles.slice(3).every((t) => !t.visible)).toBe(true);
    expect(sanitizeHome("kaputt")).toHaveLength(HOME_TILES.length);
  });

  it("Essen + Einkauf bleiben beisammen (Essen zuerst), nur wenn beide sichtbar", () => {
    expect(visible(only("einkauf", "termine", "essen"))).toEqual(["essen", "einkauf", "termine"]);
    const hidden = sanitizeHome([{ id: "einkauf", visible: true }, { id: "termine" }, { id: "essen", visible: false }]);
    expect(hidden.map((t) => t.id).slice(0, 3)).toEqual(["einkauf", "termine", "essen"]);
  });
});

describe("Startseite: Kachel zeigen", () => {
  it("landet direkt nach der nächsten sichtbaren, die laut Standard davor steht – in Standard-Größe", () => {
    const tiles = applyHomeChange(DEFAULT_HOME, { tile: "timer", action: "zeigen" });
    const v = visible(tiles);
    expect(v.indexOf("timer")).toBe(v.indexOf("spendentopf") + 1);
    expect(sizeOf(tiles, "timer")).toBe("M");
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
    expect(tiles[0]).toEqual({ id: "notizen", visible: true, size: "M" });
  });

  it("Paar: Einkauf rechts neben Essen, Essen links neben Einkauf", () => {
    const withoutShop = applyHomeChange(applyHomeChange(DEFAULT_HOME, { tile: "einkauf", action: "ausblenden" }), { tile: "essen", action: "nach_oben" });
    expect(visible(withoutShop)[0]).toBe("essen");
    const back = applyHomeChange(withoutShop, { tile: "einkauf", action: "zeigen" });
    expect(visible(back).slice(0, 2)).toEqual(["essen", "einkauf"]);
    const withoutFood = applyHomeChange(applyHomeChange(DEFAULT_HOME, { tile: "essen", action: "ausblenden" }), { tile: "einkauf", action: "nach_unten" });
    const food = applyHomeChange(withoutFood, { tile: "essen", action: "zeigen" });
    expect(visible(food).slice(-2)).toEqual(["essen", "einkauf"]);
  });
});

describe("Startseite: Größe, Ausblenden, Standard", () => {
  it("Größe nur, wie die Kachel sie kennt; alte Namen kompakt/ausführlich gehen weiter", () => {
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "klein" }), "termine")).toBe("S");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "kompakt" }), "termine")).toBe("S");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "gross" }), "termine")).toBe("L");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "ausfuehrlich" }), "termine")).toBe("L");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "wetter", action: "mittel" }), "wetter")).toBe("M");
    // Spendentopf gibt es nur in M, Vorrat nicht in L
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "spendentopf", action: "klein" }), "spendentopf")).toBe("M");
    expect(sizeOf(applyHomeChange(DEFAULT_HOME, { tile: "vorrat", action: "gross" }), "vorrat")).toBe("S");
  });

  it("Größe ändern holt eine ausgeblendete Kachel zurück", () => {
    const tiles = applyHomeChange(DEFAULT_HOME, { tile: "sport", action: "gross" });
    expect(tiles.find((t) => t.id === "sport")).toEqual({ id: "sport", visible: true, size: "L" });
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
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "termine", action: "hoch" })).slice(0, 3)).toEqual(["pinnwand", "termine", "wetter"]);
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "runter" })).slice(0, 3)).toEqual(["wetter", "pinnwand", "termine"]);
    // ganz oben bzw. ganz unten: bleibt
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "hoch" }))).toEqual(visible(DEFAULT_HOME));
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "vorrat", action: "runter" }))).toEqual(visible(DEFAULT_HOME));
  });

  it("ganz nach oben / ganz nach unten", () => {
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "aufgaben", action: "nach_oben" }))[0]).toBe("aufgaben");
    expect(visible(applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "nach_unten" })).at(-1)).toBe("pinnwand");
  });

  it("Essen + Einkauf wandern zusammen", () => {
    const up = visible(applyHomeChange(DEFAULT_HOME, { tile: "einkauf", action: "nach_oben" }));
    expect(up.slice(0, 2)).toEqual(["essen", "einkauf"]);
    const down = visible(applyHomeChange(DEFAULT_HOME, { tile: "essen", action: "runter" }));
    expect(down.slice(4, 7)).toEqual(["spendentopf", "essen", "einkauf"]);
  });

  it("über das Paar hinweg: eine Kachel springt am ganzen Paar vorbei", () => {
    // Spendentopf steht direkt hinter Essen + Einkauf → nach oben = vor das Paar
    const up = visible(applyHomeChange(DEFAULT_HOME, { tile: "spendentopf", action: "hoch" }));
    expect(up.slice(3, 7)).toEqual(["aufgaben", "spendentopf", "essen", "einkauf"]);
    // Aufgaben direkt davor → nach unten = hinter das Paar
    const down = visible(applyHomeChange(DEFAULT_HOME, { tile: "aufgaben", action: "runter" }));
    expect(down.slice(2, 6)).toEqual(["termine", "essen", "einkauf", "aufgaben"]);
  });

  it("Ziehen: sichtbare neu geordnet, ausgeblendete dahinter", () => {
    const tiles = reorderVisible(DEFAULT_HOME, ["termine", "pinnwand", "einkauf", "essen", "nix" as HomeTileId]);
    expect(visible(tiles).slice(0, 4)).toEqual(["termine", "pinnwand", "essen", "einkauf"]);
    expect(tiles).toHaveLength(HOME_TILES.length);
  });
});

describe("Startseite: Texte", () => {
  it("beschreibt jede Aktion kurz", () => {
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
  it("v4 bleibt, v3 bekommt einmal den Spendentopf ans Ende der sichtbaren", () => {
    expect(migrateHome({ version: 4, tiles: DEFAULT_HOME, tipSeen: true })).toEqual({ version: 4, tiles: DEFAULT_HOME, tipSeen: true });
    const v3 = migrateHome({ version: 3, tiles: [{ id: "termine", visible: true, size: "M" }, { id: "wetter", visible: true, size: "S" }, { id: "notizen", visible: false, size: "M" }] })!;
    expect(visible(v3.tiles)).toEqual(["termine", "wetter", "spendentopf"]);
    expect(v3.tipSeen).toBe(false);
    // Spendentopf schon sichtbar: nichts ändern
    const keep = migrateHome({ version: 3, tiles: [{ id: "spendentopf", visible: true }, { id: "termine", visible: true }] })!;
    expect(visible(keep.tiles)).toEqual(["spendentopf", "termine"]);
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
    const off = migrateHome({ version: 2, tiles: [{ id: "kladde", visible: false }, { id: "notizen", visible: false }, { id: "termine" }] })!;
    expect(off.tiles.find((t) => t.id === "notizen")!.visible).toBe(false);
  });

  it("Unbekanntes → null", () => {
    expect(migrateHome(null)).toBeNull();
    expect(migrateHome({ version: 7 })).toBeNull();
    expect(migrateHome({ version: 2, tiles: "x" })!.tiles).toHaveLength(HOME_TILES.length);
  });
});

describe("Startseite: Speicher", () => {
  it("ohne Daten = Standard; Änderung speichern und zurücknehmen", async () => {
    const win = fakeBrowser();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    expect(home.loadHomeTiles()).toEqual(home.DEFAULT_HOME);
    const undo = home.changeHome({ tile: "wetter", action: "gross" });
    expect(sizeOf(home.loadHomeTiles(), "wetter")).toBe("L");
    expect(JSON.parse(win.localStorage.getItem("wasgibts.startseite")!).version).toBe(4);
    undo();
    expect(sizeOf(home.loadHomeTiles(), "wetter")).toBe("S");
  });

  it("Lotte nutzt eine Kachel → sie kommt dazu (einmal)", async () => {
    fakeBrowser();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    expect(home.unlockHomeTile("sport")).toBe(true);
    expect(home.unlockHomeTile("sport")).toBe(false);
    expect(visible(home.loadHomeTiles())).toContain("sport");
  });

  it("Hinweis gesehen bleibt bei späteren Änderungen", async () => {
    const win = fakeBrowser();
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

describe("Startseite: Einheiten und Reihen", () => {
  it("Essen + Einkauf (beide S) = eine Einheit; zwei einzelne S nebeneinander", () => {
    const units = unitsOf(DEFAULT_HOME.filter((t) => t.visible));
    expect(units.map((u) => u.key)).toEqual(["pinnwand", "wetter", "termine", "aufgaben", "essen+einkauf", "spendentopf", "vorrat"]);
    const rows = rowsOf(units).map((r) => r.map((u) => u.key));
    expect(rows).toEqual([["pinnwand", "wetter"], ["termine"], ["aufgaben"], ["essen+einkauf"], ["spendentopf"], ["vorrat"]]);
  });

  it("Essen in M ist kein Paar mehr", () => {
    const tiles = applyHomeChange(DEFAULT_HOME, { tile: "essen", action: "mittel" }).filter((t) => t.visible);
    expect(unitsOf(tiles).map((u) => u.key)).toContain("essen");
    expect(unitsOf(tiles).map((u) => u.key)).toContain("einkauf");
  });
});
