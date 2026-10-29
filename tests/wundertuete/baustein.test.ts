// Mias Wundertüte (A-022): Baustein und Kachel – für NEUE Nutzer an (S hinter
// Essen + Einkauf), bei bestehenden bleibt alles, wie es ist (Anordnung
// ändert sich nie von selbst, Baustein aus, in der Auswahl anbietbar). Dazu
// S/M, keine Farbwahl, Beispiel-Tag, Mia per Gespräch, Kachel-Oberfläche
// (Tokens, hell/dunkel, Schlicht, reduced-motion).
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { DEFAULT_HOME, ersteStartseite, homeForHaushalt, migrateHome, sanitizeHome, tileMeta, type HomeTile } from "@/lib/core/homeLayout";
import { rasterOf } from "@/lib/heute/raster";
import { farbWaehlbar } from "@/lib/heute/kachelFarben";
import { BAUSTEINE, LAUNCH_AUS } from "@/lib/core/features";
import { demoTiles } from "@/lib/core/demo";
import { kontext, rufe } from "../begleitung/werkzeugKontext";
import { PRUEFSAETZE } from "@/lib/begleitung/pruefstand/saetze";
import { toolDefinitions } from "@/lib/begleitung/toolset";
import { TEXT_STUFEN } from "@/components/wundertuete/WundertueteTile";

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
    // Durchatmen kommt mit v7 für alle dazu (A-051), sonst bleibt alles
    expect(JSON.parse(w.localStorage.getItem("wasgibts.funktionen")!).on).toEqual([...on, "durchatmen"]);
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
    expect(BAUSTEINE.find((b) => b.feature === "wundertuete")?.text).toBe("Jeden Tag was Neues: Witze, Plattdeutsch und Angeberwissen.");
  });
});

describe("Kachel: Anordnung", () => {
  it("erster Start (Tafel 140): Wundertüte S neben Essen (Familie) bzw. neben Wetter/Notizen (allein)", () => {
    expect(shown(ersteStartseite("familie"))).toEqual(["wetter:XS", "notizen:XS", "pinnwand:S", "termine:M", "aufgaben:M", "essen:S", "wundertuete:S", "einkauf:M"]);
    expect(shown(ersteStartseite("allein")).slice(0, 3)).toEqual(["wetter:XS", "notizen:XS", "wundertuete:S"]);
    const r = rasterOf(ersteStartseite("familie").filter((t) => t.visible));
    expect(r.plaetze.find((p) => p.key === "wundertuete")).toMatchObject({ col: 1, w: 1, h: 2 });
  });

  it("bestehende Startseite: Wundertüte kommt still unsichtbar dazu, sonst bleibt alles", () => {
    const tiles = [{ id: "termine", visible: true, size: "M" }, { id: "essen", visible: true, size: "S" }, { id: "einkauf", visible: true, size: "S" }];
    const m = migrateHome({ version: 9, tiles, tipSeen: true })!;
    expect(shown(m.tiles)).toEqual(["termine:M", "essen:S", "einkauf:S"]);
    expect(m.tiles.find((t) => t.id === "wundertuete")).toMatchObject({ visible: false, size: "S" });
  });

  it("Haushaltswechsel schiebt sie nie dazu, behält sie aber, wenn sie da ist", () => {
    // Anordnung eines bestehenden Nutzers ohne Wundertüte: sie kommt nie von selbst dazu
    const alt = sanitizeHome(DEFAULT_HOME.map((t) => (t.id === "wundertuete" ? { ...t, visible: false } : t)));
    expect(shown(homeForHaushalt(alt, "familie", "allein"))).not.toContain("wundertuete:S");
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

describe("Kachel: Oberfläche (A-052, Tafel 137/140)", () => {
  const code = readFileSync("src/components/wundertuete/WundertueteTile.tsx", "utf8");
  const seite = readFileSync("src/components/wundertuete/WundertueteSeite.tsx", "utf8");
  const css = readFileSync("src/app/globals.css", "utf8");

  it("M = gleiche Karte, Schrift größer; passt sich an, nie „…“ oder abgeschnitten (A-045)", () => {
    expect(TEXT_STUFEN.S[0]).toBe(19);
    expect(TEXT_STUFEN.M[0]).toBe(23);
    for (const stufen of Object.values(TEXT_STUFEN)) expect([...stufen].sort((a, b) => b - a)).toEqual(stufen);
    expect(code).not.toMatch(/line-clamp|truncate/);
    expect(code).toContain("useSchriftEinpassen");
    expect(code).toContain('data-name="kurz"');
  });

  // A-059 (Tafel 145): die Lösung erst nach Antippen – die Karte dreht sich in der Kachel um; zur Seite nur über „Mehr ›“
  it("keine Punkte; Antippen dreht die Karte (0,6 s, reduziert Überblenden), hinten Lösung im weißen Feld, Seite nur über „Mehr ›“", () => {
    expect(code).not.toMatch(/function Punkte|data-punkte|tippAktion/);
    expect(code).toContain('role="button"');
    expect(code).toContain("onClick={drehen}");
    expect(code).toContain("aria-pressed={gedreht}");
    // Link zur Seite nur auf der Rückseite, als eigene Tippfläche ≥ 44 px
    expect(code).toMatch(/\{gedreht && \(\s*<Link href="\/wundertuete" className="[^"]*min-h-11 min-w-11/);
    expect(code.match(/href="\/wundertuete"/g)).toHaveLength(2); // Karte (Mehr ›) und „kommt bald“
    expect(code).toContain("data-pointe");
    expect(code).toContain("bg-tile-inner");
    expect(css).toContain(".wt-dreh { transform-style: preserve-3d; transition: transform 0.6s cubic-bezier(.16,1,.3,1); }");
    expect(css).toContain(".wt-karte[data-gedreht] .wt-dreh { transform: rotateY(180deg); }");
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\n  \.wt-dreh, [^}]*transform: none; transition: none; \}/);
    expect(css).toContain('.wt-karte section:not([data-eng]) [data-hinweis="kurz"], .wt-karte section[data-eng] [data-hinweis="voll"] { display: none; }');
  });

  it("Kachel-Schrift: nie getrennt, immer volle Farbe (kein Grau)", () => {
    expect(code).toContain("break-normal hyphens-none");
    expect(code).not.toMatch(/hyphens-auto|text-muted|text-faint|text-tile-label|opacity-/);
  });

  it("Wasserzeichen je Sorte: Anker bei Platt, sonst Geschenk; Farben nur über Tokens, kein Emoji", () => {
    expect(code).toMatch(/SYMBOL: Record<SorteMeta\["symbol"\], LucideIcon> = \{ gift: Gift, anchor: Anchor \}/);
    expect(code).toContain('{meta.symbol === "anchor" ? <Anker /> : <KachelWasserzeichen kachel="wundertuete" size={size} frei />}');
    expect(code).not.toMatch(/#[0-9a-f]{3,6}\b|var\(--color-|rgb\(/i);
    expect(code).toMatch(/data-tone=\{meta\.tone\}/);
    expect(code).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it("Seite: Filter, „Noch eine ›“, „Nie doppelt. <Name> legt immer neue nach.“, Lösung groß", () => {
    expect(seite).toContain("FILTER.map");
    expect(seite).toContain("Noch eine");
    expect(seite).toContain("Nie doppelt. {name} legt immer neue nach.");
    expect(seite).toContain("data-loesung");
    expect(seite).toContain("data-verdeckt");
    expect(seite).toContain("KOMMT_BALD[filter]");
  });

  it("Beispiel-Tag: „Beispiel“ nur für VoiceOver, kein eigenes Schild (das eine steht an der Pinnwand, Tafel 119)", () => {
    expect(code).toContain('demo ? " · Beispiel" : ""');
    expect(code).not.toMatch(/>\s*Beispiel\s*</);
  });
});

describe("Mia per Gespräch", () => {
  it("Werkzeug wundertuete_karte ist angemeldet und liest nur aus den Paketen", () => {
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
    const frage = r.content.split("\n")[0].replace(/^Rätsel: /, "");
    expect(rufe(ctx, "wundertuete_karte", { sorte: "raetsel", frage }).content).toMatch(/^Lösung \(nur das sagen, kurz\): /);
    expect(rufe(ctx, "wundertuete_karte", { sorte: "raetsel", frage: "Was ist ein Quatschrätsel ohne Lösung?" }).content).toMatch(/keine Lösung/);
  });

  it("Witz: Anfang und Pointe; Platt mit Antwort", () => {
    expect(rufe(kontext(), "wundertuete_karte", { sorte: "witz" }).content).toMatch(/^Witz: .+\nPointe: .+/);
    expect(rufe(kontext(), "wundertuete_karte", { sorte: "platt" }).content).toMatch(/^Platt för Plietsche: .+\nAntwort: /);
  });

  it("Prüfstand-Sätze für Wundertüte und Rätsel", () => {
    const texte = PRUEFSAETZE.map((s) => s.text);
    for (const t of ["Erzähl mir was Unnützes", "Angeberwissen", "Erzähl mal einen Witz", "Rätsel!"]) expect(texte).toContain(t);
  });
});
