// Kachel-Farben neu + wählbar (Tafel 108): jede Kachel hat ihre Standardfarbe,
// 8 Töne zur Wahl (Wetter und Essen ohne), „A“ = automatisch, Kontrast ≥ 4,5:1
// (hell, dunkel, Schlicht), Speicher v8 mit Migration und Sicherung, Mia
// („Mach die Notizen blau“).
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { KACHEL_FARBEN, farbWaehlbar, farbeAusWort, gueltigeFarbe, standardFarbe } from "@/lib/heute/kachelFarben";
import { DEFAULT_HOME, applyHomeChange, describeHomeChange, migrateHome, sanitizeHome, type HomeTile } from "@/lib/core/homeLayout";
import { fuelleLuecke, rasterOf } from "@/lib/heute/raster";
import { parseHomeCommand } from "@/lib/begleitung/homeChat";
import { settingsChange } from "@/lib/begleitung/settingsChat";
import { createEmptyProfile } from "@/lib/einstellungen/profile";
import { createBackup, restoreBackup } from "@/lib/core/backup";
import { at, fakeWindow, memoryStorage } from "../helpers";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { ask, context } from "../begleitung/testmodusHilfen";

const css = readFileSync("src/app/globals.css", "utf8");
const block = (start: string) => css.slice(css.indexOf(start), css.indexOf("}", css.indexOf(start)));
const tokens = (text: string) => Object.fromEntries([...text.matchAll(/--app-([\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map((m) => [m[1], m[2].toLowerCase()]));
const light = tokens(block(":root {"));
const dark = tokens(block(':root[data-theme="nacht"] {'));
const darkAuto = tokens(block(':root[data-theme="auto"] {'));

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

beforeEach(() => at("2026-10-21T09:00"));

describe("Palette (Look „Farbig“)", () => {
  const SOLL: Record<string, [string, string]> = {
    termine: ["#dce2f8", "#2c4a9a"],
    aufgaben: ["#d6eedf", "#2f6b45"],
    einkauf: ["#e8f0d0", "#4f6b1f"],
    pinnwand: ["#f8dde6", "#9b3c5a"],
    notizen: ["#f5eacb", "#7a5a12"],
    vorrat: ["#d3ecee", "#1f6b70"],
    sport: ["#e9def6", "#6a4a9a"],
    timer: ["#ece5dc", "#6a5a48"],
  };
  it.each(Object.entries(SOLL))("%s hat seine Standardfarbe aus Tafel 108", (id, [bg, ac]) => {
    expect(light[`tile-${id}`]).toBe(bg);
    expect(light[`tile-${id}-ac`]).toBe(ac);
  });

  it("8 Töne, jeder ist die Standardfarbe genau einer Kachel; Wetter und Essen ohne Auswahl", () => {
    expect(KACHEL_FARBEN.map((f) => f.label)).toEqual(["Lavendel", "Mint", "Salbei", "Rosé", "Vanille", "Aqua", "Flieder", "Sand"]);
    expect(KACHEL_FARBEN.map((f) => f.kachel).sort()).toEqual(Object.keys(SOLL).sort());
    expect(standardFarbe("notizen")).toBe("vanille");
    expect(standardFarbe("wetter")).toBeUndefined();
    expect(farbWaehlbar("wetter")).toBe(false);
    expect(farbWaehlbar("essen")).toBe(false);
    expect(farbWaehlbar("pinnwand")).toBe(true);
  });

  it("alle gleich hell: Flächen liegen nah beieinander", () => {
    const l = KACHEL_FARBEN.map((f) => lum(light[`tile-${f.kachel}`]));
    expect(Math.max(...l) - Math.min(...l)).toBeLessThan(0.1);
  });

  it.each(KACHEL_FARBEN)("$label: Schrift ≥ 4,5:1 auf der Fläche (hell, dunkel) und auf Weiß bzw. dunkler Karte (Schlicht)", (f) => {
    const id = `tile-${f.kachel}`;
    for (const t of [light, dark, darkAuto]) {
      expect(contrast(t[`${id}-ac`], t[id])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.ink, t[id])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t[`${id}-ac`], t.surface)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("Dunkel: eigene dunkle Töne, gleich in „Dunkel“ und „Automatisch“", () => {
    for (const f of KACHEL_FARBEN) {
      expect(lum(dark[`tile-${f.kachel}`])).toBeLessThan(0.05);
      expect(dark[`tile-${f.kachel}`]).toBe(darkAuto[`tile-${f.kachel}`]);
      expect(dark[`tile-${f.kachel}-ac`]).toBe(darkAuto[`tile-${f.kachel}-ac`]);
    }
  });

  it("CSS: data-farbe nutzt Fläche + Schrift der Kachel, steht nach data-tone und vor „Schlicht“", () => {
    const toneAt = css.indexOf('[data-tone="spendentopf"] {');
    const schlichtAt = css.indexOf('[data-look="schlicht"] [data-tone] {');
    for (const f of KACHEL_FARBEN) {
      const rule = `[data-farbe="${f.id}"] { --tile-bg: var(--app-tile-${f.kachel}); --tile-ac: var(--app-tile-${f.kachel}-ac); }`;
      const i = css.indexOf(rule);
      expect(i, f.id).toBeGreaterThan(toneAt);
      expect(i, f.id).toBeLessThan(schlichtAt);
    }
    // Schlicht: Fläche weiß, die gewählte Farbe bleibt nur für Überschrift/Symbol (--tile-ac)
    expect(block('[data-look="schlicht"] [data-tone] {')).toContain("--tile-bg: var(--app-surface)");
    expect(block('[data-look="schlicht"] [data-tone] {')).not.toContain("--tile-ac");
  });

  it("Bearbeiten: die Farbwahl hängt in jeder Kachel mit Auswahl, „A“ zuerst", () => {
    const frame = readFileSync("src/components/heute/EditFrame.tsx", "utf8");
    const wahl = readFileSync("src/components/heute/FarbWahl.tsx", "utf8");
    expect(frame).toContain("data-farbe={tile.farbe}");
    // unter dem Größen-Umschalter in der Kachel; bei XS hinter dem Farb-Knopf über der Kachel
    expect(frame).toMatch(/farbe && !xs && <FarbWahl/);
    expect(frame).toMatch(/farbe && xs && farbeOffen/);
    expect(wahl.indexOf("Farbe automatisch")).toBeLessThan(wahl.indexOf("KACHEL_FARBEN.map"));
    expect(wahl).toContain("border-dashed");
    expect(wahl).toContain("ring-tile-accent");
  });
});

describe("Speichern in der Startseiten-Anordnung (v8/v9)", () => {
  const farbe = (tiles: HomeTile[], id: string) => tiles.find((t) => t.id === id)?.farbe;

  it("Wahl übernimmt, „A“ geht zurück auf automatisch (Feld fehlt)", () => {
    const blau = applyHomeChange(DEFAULT_HOME, { tile: "notizen", action: "farbe", farbe: "lavendel" });
    expect(farbe(blau, "notizen")).toBe("lavendel");
    const auto = applyHomeChange(blau, { tile: "notizen", action: "farbe", farbe: "auto" });
    expect(farbe(auto, "notizen")).toBeUndefined();
    expect("farbe" in auto.find((t) => t.id === "notizen")!).toBe(false);
  });

  it("Wetter und Essen und Unsinn bleiben automatisch", () => {
    expect(farbe(applyHomeChange(DEFAULT_HOME, { tile: "wetter", action: "farbe", farbe: "mint" }), "wetter")).toBeUndefined();
    expect(farbe(applyHomeChange(DEFAULT_HOME, { tile: "essen", action: "farbe", farbe: "mint" }), "essen")).toBeUndefined();
    expect(gueltigeFarbe("termine", "neonpink")).toBeUndefined();
    expect(farbe(sanitizeHome([{ id: "termine", visible: true, size: "M", farbe: "neonpink" }]), "termine")).toBeUndefined();
  });

  it("Farbe bleibt beim Verschieben, Größe ändern, Ausblenden und In-die-Lücke-Stellen; „wie am Anfang“ setzt sie zurück", () => {
    let tiles = applyHomeChange(DEFAULT_HOME, { tile: "pinnwand", action: "farbe", farbe: "aqua" });
    for (const action of ["gross", "nach_unten", "ausblenden", "zeigen"] as const) tiles = applyHomeChange(tiles, { tile: "pinnwand", action });
    expect(farbe(tiles, "pinnwand")).toBe("aqua");
    tiles = applyHomeChange(tiles, { tile: "vorrat", action: "farbe", farbe: "rose" });
    // eine einzelne S hat daneben eine Lücke – Im Haus hineinstellen behält die Farbe
    const shown: HomeTile[] = [{ id: "termine", visible: true, size: "M" }, { id: "pinnwand", visible: true, size: "S" }];
    const luecke = rasterOf(shown).luecken[0];
    expect(luecke).toEqual({ col: 1, row: 2, h: 2 });
    expect(farbe(fuelleLuecke(tiles, shown, luecke, "vorrat"), "vorrat")).toBe("rose");
    expect(farbe(applyHomeChange(tiles, { tile: "termine", action: "standard" }), "pinnwand")).toBeUndefined();
  });

  it("Ansage", () => {
    expect(describeHomeChange({ tile: "notizen", action: "farbe", farbe: "lavendel" })).toBe("Notizen ist jetzt Lavendel.");
    expect(describeHomeChange({ tile: "notizen", action: "farbe", farbe: "auto" })).toBe("Notizen hat wieder die eigene Farbe.");
  });

  it("Migration: v7 → v9 ohne Farben (alles automatisch), v8 behält sie", () => {
    const v7 = migrateHome({ version: 7, tiles: DEFAULT_HOME, tipSeen: true })!;
    expect(v7.version).toBe(9);
    expect(v7.tiles.every((t) => t.farbe === undefined)).toBe(true);
    const v8 = migrateHome({ version: 8, tiles: [{ id: "notizen", visible: true, size: "M", farbe: "sand" }], tipSeen: false })!;
    expect(farbe(v8.tiles, "notizen")).toBe("sand");
  });

  it("Speichern und Sicherung: die Farbe kommt mit zurück", async () => {
    const win = fakeWindow();
    vi.resetModules();
    const home = await import("@/lib/core/homeLayout");
    home.changeHome({ tile: "termine", action: "farbe", farbe: "flieder" });
    expect(JSON.parse(win.localStorage.getItem("wasgibts.startseite")!)).toMatchObject({ version: 9 });
    const backup = createBackup(win.localStorage);
    const fresh = memoryStorage();
    restoreBackup(backup, fresh);
    expect(migrateHome(JSON.parse(fresh.getItem("wasgibts.startseite")!))!.tiles.find((t) => t.id === "termine")?.farbe).toBe("flieder");
  });
});

describe("Mia: „Mach die Notizen blau“", () => {
  it.each([
    ["blau", "lavendel"],
    ["Blaue", "lavendel"],
    ["hellblau", "aqua"],
    ["türkis", "aqua"],
    ["grün", "mint"],
    ["olivgrün", "salbei"],
    ["hellgrün", "salbei"],
    ["gelb", "vanille"],
    ["rosa", "rose"],
    ["pink", "rose"],
    ["lila", "flieder"],
    ["violett", "flieder"],
    ["beige", "sand"],
    ["braun", "sand"],
    ["Lavendel", "lavendel"],
    ["automatisch", "auto"],
    ["Standard", "auto"],
  ])("„%s“ → %s", (wort, ton) => {
    expect(farbeAusWort(wort)).toBe(ton);
  });
  it("kein Teilwort, nichts Erfundenes", () => {
    expect(farbeAusWort("Rotwein")).toBeNull();
    expect(farbeAusWort("regenbogen")).toBeNull();
  });

  it("ohne KI: Satz → Farbe am Ende, sonst nichts abfangen", () => {
    expect(parseHomeCommand("Mach die Notizen blau")).toEqual({ kind: "home", change: { tile: "notizen", action: "farbe", farbe: "lavendel" } });
    expect(parseHomeCommand("Färb die Pinnwand bitte grün")).toEqual({ kind: "home", change: { tile: "pinnwand", action: "farbe", farbe: "mint" } });
    expect(parseHomeCommand("Pinnwand wieder in Standardfarbe")).toEqual({ kind: "home", change: { tile: "pinnwand", action: "farbe", farbe: "auto" } });
    expect(parseHomeCommand("Mach das Wetter blau")?.kind === "home" && parseHomeCommand("Mach das Wetter blau")).toBeFalsy();
    expect(parseHomeCommand("Setz Rotwein auf die Liste")).toBeNull();
    expect(parseHomeCommand("Termin gelbe Tonne Freitag")).toBeNull();
    expect(parseHomeCommand("Meine Farbe im Kalender blau")).toBeNull();
    // Größen bleiben Größen
    expect(parseHomeCommand("Mach die Einkaufsliste wieder klein")).toEqual({ kind: "home", change: { tile: "einkauf", action: "klein" } });
  });

  it("Einstellungen fangen den Satz nicht ab (Mia bleibt orange, Kalenderfarbe bleibt)", () => {
    const p = createEmptyProfile();
    const r = settingsChange("Mach die Notizen blau", p);
    expect(r?.profile.calendarColor ?? "orange").toBe("orange");
    expect(r?.profile.helper.farbe ?? "orange").toBe("orange");
  });

  it("Werkzeug startseite_anpassen mit farbe: nächster Ton, Wetter/Essen ehrlich ablehnen", () => {
    const ctx = kontext();
    expect(rufe(ctx, "startseite_anpassen", { kachel: "notizen", aktion: "farbe", farbe: "blau" }).content).toBe("Vorgemerkt: Startseite – notizen lavendel.");
    expect(ctx.ops.at(-1)).toMatchObject({ type: "home", change: { tile: "notizen", action: "farbe", farbe: "lavendel" } });
    expect(rufe(ctx, "startseite_anpassen", { kachel: "notizen", aktion: "farbe", farbe: "automatisch" }).content).toBe("Vorgemerkt: Startseite – notizen auto.");
    expect(rufe(kontext(), "startseite_anpassen", { kachel: "wetter", aktion: "farbe", farbe: "blau" }).isError).toBe(true);
    expect(rufe(kontext(), "startseite_anpassen", { kachel: "notizen", aktion: "farbe", farbe: "regenbogen" }).isError).toBe(true);
  });

  it("Testmodus ruft dasselbe Werkzeug", async () => {
    const r = await ask(context(), "Mach die Notizen blau", []);
    expect(r.uses[0]).toMatchObject({ name: "startseite_anpassen", input: { kachel: "notizen", aktion: "farbe", farbe: "lavendel" } });
  });
});
