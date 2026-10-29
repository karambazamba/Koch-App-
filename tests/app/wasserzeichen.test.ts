// Wasserzeichen für alle Kacheln ohne eigenes Bild (A-036, Tafel 124 A/125):
// EINE Komponente, Zuordnung als Tabelle über ALLE Kacheln des Katalogs (neue
// Kachel ohne Eintrag = rot), Ausnahmen mit Grund (Wetter, Essen, Pinnwand,
// Spendentopf, Sport mit Stempeln; die Jetzt-Karte ist keine Kachel), seit A-048
// (Tafel 135) in ALLEN Größen – XS klein (110 px) und weiter angeschnitten –, Schlicht ohne.
// Kontrast-Regel: freier Text ohne weißes Kärtchen → leise Deckkraft (9 %).
import { readFileSync, readdirSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_TILES } from "@/lib/core/homeLayout";
import { KachelWasserzeichen, OHNE_WASSERZEICHEN, WASSERZEICHEN_STRICH, WASSERZEICHEN_SYMBOL, type WasserzeichenKachel } from "@/components/ui/KachelWasserzeichen";
import { itemsForDay } from "@/lib/kalender/model";
import type { Note } from "@/lib/notizen/model";
import type { TimerState } from "@/lib/timer/model";
import { at, aufgabe, termin } from "../helpers";

const TODAY = "2026-10-21";
beforeEach(() => at(`${TODAY}T09:00`));

const OHNE = Object.keys(OHNE_WASSERZEICHEN);
const MIT = Object.keys(WASSERZEICHEN_SYMBOL) as WasserzeichenKachel[];

describe("Zuordnung: jede Kachel ohne eigenes Bild hat ein Wasserzeichen", () => {
  it.each(HOME_TILES.map((t) => t.id))("%s: Symbol oder Grund (genau eins)", (id) => {
    expect(OHNE.includes(id) !== MIT.includes(id as WasserzeichenKachel), id).toBe(true);
  });

  it("Ausnahmen genau: Wetter (Himmel), Essen (Foto), Pinnwand (Zettel), Spendentopf (eigenes Bild), Sport (Stempel, A-044)", () => {
    expect(OHNE_WASSERZEICHEN).toEqual({ wetter: "Himmel", essen: "Foto des Gerichts", pinnwand: "Zettel", spendentopf: "eigenes Bild (Topf)", sport: "Stempel sind das Bild" });
    // Keine Altlasten: nur Kacheln, die es gibt
    for (const id of [...OHNE, ...MIT]) expect(HOME_TILES.map((t) => t.id)).toContain(id);
  });

  it("Symbole wie im Auftrag", () => {
    const name = (id: WasserzeichenKachel) => renderToStaticMarkup(createElement(KachelWasserzeichen, { kachel: id, size: "S" })).match(/lucide-([a-z-]+)/)?.[1];
    expect(Object.fromEntries(MIT.map((id) => [id, name(id)]))).toEqual({
      termine: "calendar",
      aufgaben: "circle-check",
      einkauf: "shopping-cart",
      vorrat: "refrigerator",
      notizen: "sticky-note",
      timer: "timer",
      tipps: "map-pin",
      post: "mail",
      wundertuete: "gift",
    });
  });
});

// --- Im Code: jede Kachel mit Symbol zeigt es, die Ausnahmen nie ---------------
const dateien = readdirSync("src/components", { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".tsx") && !f.endsWith("ui/KachelWasserzeichen.tsx"))
  .map((f) => [`src/components/${f}`, readFileSync(`src/components/${f}`, "utf8")] as const);
const nutzer = dateien.filter(([, s]) => s.includes("<KachelWasserzeichen"));

describe("Kacheln im Code", () => {
  it("jede Kachel mit Symbol (außer „bald“) setzt ihr Wasserzeichen", () => {
    const gesetzt = new Set(nutzer.flatMap(([, s]) => [...s.matchAll(/<KachelWasserzeichen kachel="([a-z]+)"/g)].map((m) => m[1])));
    const erwartet = MIT.filter((id) => !HOME_TILES.find((t) => t.id === id)?.soon);
    expect([...gesetzt].sort()).toEqual([...erwartet].sort());
  });

  it("Wetter, Essen, Pinnwand, Spendentopf, Sport und die Jetzt-Karte ohne Wasserzeichen", () => {
    for (const f of ["wetter/WeatherTile.tsx", "essen/DishTile.tsx", "pinnwand/PinboardTile.tsx", "spendentopf/SpendentopfTile.tsx", "sport/SportTile.tsx", "heute/JetztCard.tsx"]) {
      expect(readFileSync(`src/components/${f}`, "utf8"), f).not.toContain("KachelWasserzeichen");
    }
  });

  it("die Kachel ist eine eigene Ebene (isolate), ihre Fenster stehen daneben", () => {
    for (const [f, s] of nutzer) {
      for (const m of s.matchAll(/<KachelWasserzeichen /g)) {
        const section = s.lastIndexOf("<section", m.index);
        expect(s.slice(section, s.indexOf(">", section)), f).toContain("isolate");
      }
    }
    // Fenster in der Kachel wären unter späteren Kacheln gefangen
    const mini = readFileSync("src/components/heute/MiniCards.tsx", "utf8");
    const termine = mini.slice(mini.indexOf("export function TermineSection"), mini.indexOf("export function TaskLine"));
    expect(termine.indexOf("{overlays}")).toBeGreaterThan(termine.indexOf("</section>"));
    const tipps = readFileSync("src/components/tipps/TipsTile.tsx", "utf8");
    expect(tipps.indexOf("<TipSheet")).toBeGreaterThan(tipps.lastIndexOf("</section>"));
    const home = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    const einkauf = home.slice(home.indexOf("export function ShoppingTile"), home.indexOf("const DEMO_NOTIZ"));
    expect(einkauf.indexOf("<QuickAddButton")).toBeGreaterThan(einkauf.lastIndexOf("</section>"));
  });
});

describe("Komponente", () => {
  it("unten rechts angeschnitten, leicht gedreht, Strich 1,3, still, hinter dem Inhalt", () => {
    const html = renderToStaticMarkup(createElement(KachelWasserzeichen, { kachel: "termine", size: "M" }));
    const span = html.match(/^<span [^>]*>/)?.[0] ?? "";
    for (const c of ["pointer-events-none", "-z-10", "-bottom-[30px]", "-right-[30px]", "aspect-square", "h-[min(150px,calc(100%-10px))]", "-rotate-[8deg]", 'aria-hidden="true"', 'data-kachel="termine"']) expect(span).toContain(c);
    expect(span).not.toContain("data-art");
    expect(html).toContain(`stroke-width="${WASSERZEICHEN_STRICH}"`);
    expect(WASSERZEICHEN_STRICH).toBe(1.3);
    expect(html).not.toMatch(/animate-|transition|style=/);
  });

  it("XS (A-048): klein 110 px, rechts 50 / unten 34 px angeschnitten, eigene Deckkraft; frei: leise Deckkraft", () => {
    const xs = renderToStaticMarkup(createElement(KachelWasserzeichen, { kachel: "notizen", size: "XS" })).match(/^<span [^>]*>/)?.[0] ?? "";
    for (const c of ["h-[110px]", "w-[110px]", "-right-[50px]", "-bottom-[34px]", "-z-10", "-rotate-[8deg]", 'data-groesse="XS"', 'data-art="xs"']) expect(xs).toContain(c);
    expect(xs).not.toContain("min(150px");
    expect(renderToStaticMarkup(createElement(KachelWasserzeichen, { kachel: "notizen", size: "S", frei: true }))).toContain('data-art="frei"');
  });
});

// --- Kontrast-Regel an echten Kacheln (ohne Browser) ---------------------------
const store = vi.hoisted(() => ({ notes: [] as unknown[], timers: null as unknown }));
vi.mock("@/lib/notizen", async (orig) => ({ ...(await orig<object>()), useNotes: () => store.notes }));
vi.mock("@/lib/timer/store", async (orig) => ({ ...(await orig<object>()), useTimers: () => store.timers }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

/** Öffnendes Tag des Wasserzeichens einer Kachel */
const zeichen = (html: string) => html.match(/<span class="kachel-wasserzeichen[^>]*>/)?.[0] ?? "";

describe("freier Text ohne Kärtchen → 9 % (data-art=frei), weiße Liste → volle Deckkraft", () => {
  it("Notizen S: Zeilen stehen frei; leiser Text mit Freistellung", async () => {
    store.notes = [{ id: "n1", typ: "notiz", title: "WLAN", text: "Router im Flur", data: { text: "Router im Flur" }, createdAt: `${TODAY}T08:00:00.000Z`, updatedAt: `${TODAY}T08:00:00.000Z` } as unknown as Note];
    const { NotesTile } = await import("@/components/heute/HomeTiles");
    const html = renderToStaticMarkup(createElement(NotesTile, { size: "S" }));
    expect(zeichen(html)).toContain('data-kachel="notizen"');
    expect(zeichen(html)).toContain('data-art="frei"');
    // XS (A-048): kleines Wasserzeichen; die Vorschau (A-060, 2 Zeilen, weich ausgeblendet) stellt sich je Zeile frei
    const xs = renderToStaticMarkup(createElement(NotesTile, { size: "XS" }));
    expect(zeichen(xs)).toContain('data-groesse="XS"');
    expect(xs).toMatch(/data-zeile="true" data-notiz-zeile="true"><span class="notiz-ausblenden[^"]*" data-ausblenden="true" data-notiz-vorschau="true"><span class="kachel-frei /);
  });

  // A-048/Tafel 140: leer überall „Schnell notieren …“ (XS früher „Schnell notieren.“ mit Stift, S/M „Schnell was aufschreiben.“)
  it("Notizen leer: XS, S und M derselbe Leertext „Schnell notieren …“, als Platzhalter markiert, ohne Stift im Text", async () => {
    store.notes = [];
    const { NotesTile } = await import("@/components/heute/HomeTiles");
    for (const size of ["XS", "S", "M"] as const) {
      const html = renderToStaticMarkup(createElement(NotesTile, { size }));
      expect(html, size).toContain('<span class="kachel-frei" data-platzhalter-text="true">Schnell notieren\u00a0…</span>');
      expect(html, size).not.toMatch(/aufschreiben|Schnell notieren\./);
      // Der Stift ist nur der Knopf oben rechts („Schnellnotiz schreiben“)
      expect(html.match(/lucide-pen-line/g), size).toHaveLength(1);
    }
    const schnell = readFileSync("src/components/notizen/Schnellnotiz.tsx", "utf8");
    expect(schnell).toContain('placeholder="Schnell notieren …"');
  });

  it("Timer S: frei; der Name (grau) freigestellt", async () => {
    store.timers = { timers: [{ id: "t1", name: "Nudeln", emoji: "", durationMs: 600000, endsAt: Date.parse(`${TODAY}T09:10:00+02:00`) }], stopwatch: null, hintSeen: true, firstAt: null } as unknown as TimerState;
    const { TimerTile } = await import("@/components/timer/TimerTile");
    const html = renderToStaticMarkup(createElement(TimerTile, { size: "S" }));
    expect(zeichen(html)).toContain('data-kachel="timer"');
    expect(zeichen(html)).toContain('data-art="frei"');
    expect(html).toMatch(/class="kachel-frei[^"]*text-muted"/);
  });

  it("Termine: weiße Liste voll, leer (freier Satz) leise", async () => {
    const { TermineSection } = await import("@/components/heute/MiniCards");
    const rows = itemsForDay([termin({ title: "Zahnarzt", date: TODAY, start: "15:00", end: "16:00" })], TODAY, TODAY).map((item) => ({ item, state: null }));
    const voll = renderToStaticMarkup(createElement(TermineSection, { rows, href: "/", today: TODAY, size: "S" }));
    expect(zeichen(voll)).toContain('data-kachel="termine"');
    expect(zeichen(voll)).not.toContain("data-art");
    const leer = renderToStaticMarkup(createElement(TermineSection, { rows: [], href: "/", today: TODAY, size: "S" }));
    expect(zeichen(leer)).toContain('data-art="frei"');
    expect(leer).toContain('<span class="kachel-frei">Termin eintragen</span>');
  });

  it("Aufgaben: mit leiser Zeile „Arbeit · … für morgen“ leise", async () => {
    const { AufgabenSection } = await import("@/components/heute/MiniCards");
    const items = itemsForDay([aufgabe({ title: "Müll raus" })], TODAY, TODAY);
    const voll = renderToStaticMarkup(createElement(AufgabenSection, { items, today: TODAY, size: "S" }));
    expect(zeichen(voll)).toContain('data-kachel="aufgaben"');
    expect(zeichen(voll)).not.toContain("data-art");
    const abends = renderToStaticMarkup(createElement(AufgabenSection, { items, today: TODAY, size: "S", arbeitMorgen: 3 }));
    expect(zeichen(abends)).toContain('data-art="frei"');
    expect(abends).toMatch(/data-arbeit-morgen="true"><span class="kachel-frei">/);
  });
});

describe("Wundertüte (A-036, Tafel 140)", () => {
  it("Geschenk über KachelWasserzeichen (leise, die Schrift steht frei), bei Platt ein Anker im selben Stil", () => {
    const s = readFileSync("src/components/wundertuete/WundertueteTile.tsx", "utf8");
    expect(s).toContain('{meta.symbol === "anchor" ? <Anker /> : <KachelWasserzeichen kachel="wundertuete" size={size} frei />}');
    expect(s).toMatch(/data-symbol="anchor" data-art="frei"/);
    expect(s).toContain('className="kachel-frei"');
  });
});
