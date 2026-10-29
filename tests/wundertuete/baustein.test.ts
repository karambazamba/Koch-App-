// Mias Wundertüte (A-022): Baustein und Kachel – für NEUE Nutzer an (S hinter
// Essen + Einkauf), bei bestehenden bleibt alles, wie es ist (Anordnung
// ändert sich nie von selbst, Baustein aus, in der Auswahl anbietbar). Dazu
// S/M, keine Farbwahl, Beispiel-Tag, Mia per Gespräch, Kachel-Oberfläche
// (Tokens, hell/dunkel, Schlicht, reduced-motion).
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { DEFAULT_HOME, ersteStartseite, homeForHaushalt, migrateHome, tileMeta, type HomeTile } from "@/lib/core/homeLayout";
import { rasterOf } from "@/lib/heute/raster";
import { farbWaehlbar } from "@/lib/heute/kachelFarben";
import { BAUSTEINE, LAUNCH_AUS } from "@/lib/core/features";
import { demoTiles } from "@/lib/core/demo";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { toolDefinitions } from "@/lib/begleitung/toolset";
import { ANTWORT_STUFEN, FRAGE_STUFEN } from "@/components/wundertuete/WundertueteTile";

afterEach(() => {
  vi.unstubAllGlobals();
  noBrowser();
});

const shown = (tiles: HomeTile[]) => tiles.filter((t) => t.visible).map((t) => `${t.id}:${t.size}`);

describe("Baustein: neu an, bestehend unverändert", () => {
  it("neuer Nutzer (nichts gespeichert): Baustein an, auch nach dem Launch-Schnitt", async () => {
    fakeWindow();
    vi.resetModules();
    const f = await import("@/lib/core/features");
    expect(f.featureOn("wundertuete")).toBe(true);
    f.launchUebernahme(() => null);
    expect(f.featureOn("wundertuete")).toBe(true);
  });

  it("bestehender Nutzer (Bausteine v6 gespeichert): bleibt aus, nichts geht verloren", async () => {
    const on = ["notizen", "vorrat", "pinnwand", "rezepte"];
    const w = fakeWindow({ "wasgibts.funktionen": JSON.stringify({ version: 6, on, launch: true, imHaus: true }) });
    vi.resetModules();
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(f.featureOn("wundertuete")).toBe(false);
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!).on).toEqual(on);
  });

  it("bestehender Nutzer ohne gespeicherte Bausteine, aber mit eigener Startseite: aus", async () => {
    const home = JSON.stringify({ version: 9, tiles: [{ id: "termine", visible: true, size: "M" }], tipSeen: true });
    fakeWindow({ "wasgibts.startseite": home });
    vi.resetModules();
    const f = await import("@/lib/core/features");
    f.launchUebernahme();
    expect(f.featureOn("wundertuete")).toBe(false);
    expect(f.featureOn("notizen")).toBe(true);
  });

  it("kein Launch-Aus-Baustein, Mia kennt ihn (Mehr Funktionen)", () => {
    expect(LAUNCH_AUS).not.toContain("wundertuete");
    expect(BAUSTEINE.find((b) => b.feature === "wundertuete")?.text).toBe("Jeden Tag was Neues: Angeberwissen, Platt, Rätsel und Spiele für den Tisch.");
  });
});

describe("Kachel: Anordnung", () => {
  it("erster Start: Standard des Haushalts + Wundertüte S direkt hinter Essen + Einkauf", () => {
    expect(shown(ersteStartseite("familie"))).toEqual(["pinnwand:S", "wetter:XS", "notizen:XS", "termine:M", "aufgaben:M", "essen:S", "einkauf:S", "wundertuete:S"]);
    expect(shown(ersteStartseite("allein")).slice(-3)).toEqual(["essen:S", "einkauf:S", "wundertuete:S"]);
    const r = rasterOf(ersteStartseite("familie").filter((t) => t.visible));
    expect(r.plaetze.find((p) => p.key === "wundertuete")).toMatchObject({ col: 0, w: 1, h: 2 });
  });

  it("bestehende Startseite: Wundertüte kommt still unsichtbar dazu, sonst bleibt alles", () => {
    const tiles = [{ id: "termine", visible: true, size: "M" }, { id: "essen", visible: true, size: "S" }, { id: "einkauf", visible: true, size: "S" }];
    const m = migrateHome({ version: 9, tiles, tipSeen: true })!;
    expect(shown(m.tiles)).toEqual(["termine:M", "essen:S", "einkauf:S"]);
    expect(m.tiles.find((t) => t.id === "wundertuete")).toMatchObject({ visible: false, size: "S" });
    expect(DEFAULT_HOME.find((t) => t.id === "wundertuete")?.visible).toBe(false);
  });

  it("Haushaltswechsel schiebt sie nie dazu, behält sie aber, wenn sie da ist", () => {
    expect(shown(homeForHaushalt(DEFAULT_HOME, "familie", "allein"))).not.toContain("wundertuete:S");
    const neu = ersteStartseite("familie");
    expect(shown(homeForHaushalt(neu, "familie", "allein"))).toContain("wundertuete:S");
    expect(shown(homeForHaushalt(neu, "familie", "allein"))).not.toContain("pinnwand:S");
  });

  it("Größen S und M, keine eigene Farbwahl (die Farbe kommt mit der Sorte), NEU in der Auswahl", () => {
    expect(tileMeta("wundertuete")).toMatchObject({ sizes: ["S", "M"], size: "S", feature: "wundertuete", fresh: true });
    expect(farbWaehlbar("wundertuete")).toBe(false);
  });

  it("Beispiel-Tag: zeigt die Wundertüte (feste Karte), bis eigenes Antippen sie leert", () => {
    const state = { version: 1 as const, since: "2026-10-20", cleared: [], done: [], gone: [], asked: false };
    expect(demoTiles(state, "2026-10-20")).toContain("wundertuete");
    expect(demoTiles({ ...state, cleared: ["wundertuete" as const] }, "2026-10-20")).not.toContain("wundertuete");
    // Bleibt nur die Wundertüte übrig, ist der Beispiel-Tag vorbei (sie hält ihn nicht allein am Laufen)
    const rest = ["termine", "aufgaben", "pinnwand", "einkauf", "essen", "notizen", "sport", "vorrat"] as const;
    expect(demoTiles({ ...state, cleared: [...rest] }, "2026-10-20")).toEqual([]);
  });
});

describe("Kachel: Oberfläche", () => {
  const code = readFileSync("src/components/wundertuete/WundertueteTile.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");

  it("M = gleiche Karte, Frage größer; Schrift passt sich an, nie „…“ oder abgeschnitten (A-045)", () => {
    expect(FRAGE_STUFEN.S[0]).toBe(17);
    expect(FRAGE_STUFEN.M[0]).toBe(21);
    for (const stufen of [...Object.values(FRAGE_STUFEN), ...Object.values(ANTWORT_STUFEN)]) expect([...stufen].sort((a, b) => b - a)).toEqual(stufen);
    expect(code).not.toMatch(/line-clamp|truncate/);
    expect(code).toContain("useSchriftEinpassen");
    expect(code).toContain('data-name="kurz"');
  });

  it("Farben nur über Tokens (data-tone der Sorte, hell/dunkel und Schlicht kommen mit), kein Emoji", () => {
    expect(code).not.toMatch(/#[0-9a-f]{3,6}\b|var\(--color-|rgb\(/i);
    expect(code).toMatch(/data-tone=\{meta\.tone\}/);
    expect(code).toMatch(/border-tile-accent bg-surface/);
    expect(code).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("Drehen weich (0,8 s, cubic-bezier(.16,1,.3,1), nur transform), reduced-motion = Überblenden", () => {
    expect(css).toMatch(/\.wt-dreh \{[^}]*transition: transform 0\.8s cubic-bezier\(\.16,1,\.3,1\)/);
    const reduced = css.slice(css.indexOf(".wt-neu {"));
    expect(reduced).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.wt-dreh, \.wt-karte\[data-seite="hinten"\] \.wt-dreh \{ transform: none; transition: none; \}/);
    expect(reduced).toMatch(/opacity: 0;/);
  });

  it("Rückseite: „Nochmal tippen = Neues“ und Teilen; Kopf mit Symbol und Sorte", () => {
    expect(code).toContain("Nochmal tippen = Neues");
    expect(code).toMatch(/label="Teilen"/);
    expect(code).toMatch(/Beispiel/);
  });

  it("Beispiel-Tag: „Beispiel“ nur für VoiceOver, kein eigenes Schild (das eine steht an der Pinnwand, Tafel 119)", () => {
    expect(code).toContain('demo ? " · Beispiel" : ""');
    expect(code).not.toMatch(/>\s*Beispiel\s*</);
  });
});

describe("Mia per Gespräch", () => {
  it("Werkzeug wundertuete_karte ist angemeldet und liest nur aus dem Pool", () => {
    expect(toolDefinitions().map((t) => t.name)).toContain("wundertuete_karte");
    const ctx = kontext();
    const wissen = rufe(ctx, "wundertuete_karte", { sorte: "angeberwissen" });
    expect(wissen.content).toMatch(/^Angeberwissen: .+\nAntwort: .+/);
    expect(wissen.content).not.toContain("**");
    expect(ctx.ops).toEqual([]);
  });

  it("Rätsel: erst die Frage, Lösung auf „Lösung“ (über die vorgelesene Frage)", () => {
    const ctx = kontext();
    const r = rufe(ctx, "wundertuete_karte", { sorte: "raetsel" });
    expect(r.content).toMatch(/antwort_knoepfe \['Lösung'\]/);
    const frage = r.content.split("\n")[0].replace(/^Rätselstunde: /, "");
    expect(rufe(ctx, "wundertuete_karte", { sorte: "raetsel", frage }).content).toMatch(/^Lösung \(nur das sagen, kurz\): /);
    expect(rufe(ctx, "wundertuete_karte", { sorte: "raetsel", frage: "Was ist ein Quatschrätsel ohne Lösung?" }).content).toMatch(/keine Lösung/);
  });

  it("Tischrunde und Wer zuerst: nur die Frage; Heute vor 100 Jahren nur am belegten Tag", () => {
    expect(rufe(kontext(), "wundertuete_karte", { sorte: "tischrunde" }).content).toMatch(/^Tischrunde: .+\nNur das vorlesen/);
    expect(rufe(kontext(), "wundertuete_karte", { sorte: "werzuerst" }).content).toMatch(/^Wer zuerst: Wer zuerst /);
    expect(rufe(kontext(), "wundertuete_karte", { sorte: "heute100" }).content).toMatch(/keine Karte/);
    expect(rufe(kontext({}, { today: "2026-10-14" }), "wundertuete_karte", { sorte: "heute100" }).content).toMatch(/Pu der Bär/);
  });

  it("Prüfstand-Sätze für die Wundertüte", () => {
    const texte = PRUEFSAETZE.map((s) => s.text);
    for (const t of ["Erzähl mir was Unnützes", "Angeberwissen", "Gib uns eine Tischfrage", "Rätsel!"]) expect(texte).toContain(t);
  });
});
