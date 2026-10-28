// Navigation neu (Tafel 96): Leiste unten. Zuordnung jeder Seite zu ihrem
// Bereich, Reiter von jeder Unterseite (zurück im Verlauf bzw. neu), aktiver
// Reiter = Hauptseite bzw. nach oben, Brücke zum Pager, ohne Leiste,
// Wischen vom linken Rand, Ausblenden per CSS, Hinweis einmal.
import { existsSync, readFileSync } from "node:fs";
import { fakeWindow } from "../helpers";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bereichVon, bereichWaehlen, hauptseite, istHauptseite, leisteVersteckt, pagerAnmelden, randZurueck, tabSchritt } from "@/lib/core/leiste";
import { naechsterHinweis } from "@/lib/core/hinweise";
import { LEISTE_NEU } from "@/lib/heute/miaName";
import { tidyMiaText } from "@/lib/begleitung/tidy";

const HEUTE = ["/pinnwand", "/einkaufsliste", "/einkaufsliste/laden", "/notizen", "/aufgaben", "/wetter", "/profil", "/profil/daten", "/spendentopf", "/vorrat"];
const KALENDER = ["/tag?datum=2026-10-21", "/woche/check", "/?seite=kalender", "/?seite=woche"];
const ESSEN = ["/kochbuch", "/kochbuch/rezept?id=sp", "/wochenplan", "/?seite=essen"];

describe("Zuordnung", () => {
  it("jede Seite leuchtet unter ihrem Bereich", () => {
    for (const u of ["/", "/?seite=heute", ...HEUTE]) expect(bereichVon(u), u).toBe("heute");
    for (const u of KALENDER) expect(bereichVon(u), u).toBe("kalender");
    for (const u of ESSEN) expect(bereichVon(u), u).toBe("essen");
  });

  it("Hauptseiten sind die drei auf „/“", () => {
    expect(istHauptseite("/?seite=essen")).toBe(true);
    expect(istHauptseite("/kochbuch")).toBe(false);
    expect([hauptseite("heute"), hauptseite("kalender"), hauptseite("essen")]).toEqual(["/", "/?seite=kalender", "/?seite=essen"]);
  });
});

describe("Reiter antippen", () => {
  it("jeder Reiter von jeder Unterseite: im Verlauf zurück zur Hauptseite, sonst neu", () => {
    for (const u of [...HEUTE, ...ESSEN.filter((x) => !istHauptseite(x)), "/tag?datum=2026-10-21"])
      for (const tab of ["kalender", "heute", "essen"] as const) {
        expect(tabSchritt(tab, u, 2), `${tab} von ${u}`).toEqual({ art: "zurueck", schritte: 2 });
        expect(tabSchritt(tab, u, null), `${tab} von ${u}`).toEqual({ art: "neu", url: hauptseite(tab) });
      }
  });

  it("auf der Hauptseite: anderer Bereich = wechseln, aktiver = nach oben", () => {
    expect(tabSchritt("kalender", "/", null)).toEqual({ art: "wechseln" });
    expect(tabSchritt("heute", "/", 3)).toEqual({ art: "oben" });
    expect(tabSchritt("essen", "/?seite=essen", null)).toEqual({ art: "oben" });
  });

  it("Brücke zum Pager: sofort, sonst gemerkt bis er da ist (dann „bleiben“)", () => {
    const calls: [string, boolean][] = [];
    bereichWaehlen("essen");
    const off = pagerAnmelden((b, gemerkt) => calls.push([b, gemerkt]));
    bereichWaehlen("kalender");
    off();
    bereichWaehlen("heute");
    expect(calls).toEqual([
      ["essen", true],
      ["kalender", false],
    ]);
    const off2 = pagerAnmelden((b, gemerkt) => calls.push([b, gemerkt]));
    off2();
    expect(calls.at(-1)).toEqual(["heute", true]);
  });

  it("Reiter-Wunsch überlebt ein neues Dokument (Rücksprung mit Neuladen landete auf Heute statt Kalender)", async () => {
    const win = fakeWindow();
    vi.stubGlobal("window", win);
    try {
      vi.resetModules();
      (await import("@/lib/core/leiste")).bereichWaehlen("kalender");
      vi.resetModules();
      const frisch = await import("@/lib/core/leiste");
      const calls: [string, boolean][] = [];
      frisch.pagerAnmelden((b, gemerkt) => calls.push([b, gemerkt]))();
      expect(calls).toEqual([["kalender", true]]);
      expect(win.sessionStorage.getItem("wasgibts.reiterwunsch")).toBeNull();
    } finally {
      vi.unstubAllGlobals();
      vi.resetModules();
    }
  });

  it("Pager: gleicher Reiter = weich nach oben, gemerkt = bleiben (Scrollhöhe)", () => {
    const src = readFileSync("src/components/heute/HomePager.tsx", "utf8");
    expect(src).toMatch(/if \(gemerkt\) return;/);
    expect(src).toMatch(/behavior: reduced \? "auto" : "smooth"/);
  });
});

describe("Leiste und Kopf", () => {
  it("drei Reiter mit Linien-Symbolen, Mia rechts in der Leiste, kein Segment-Umschalter, kein Haus, kein Zahnrad", () => {
    const leiste = readFileSync("src/components/ui/Leiste.tsx", "utf8");
    expect(leiste).toMatch(/Calendar, LayoutGrid, Utensils/);
    expect(leiste).toContain("<MiaButton");
    expect(leiste).toMatch(/-top-\[30px\]/);
    const pager = readFileSync("src/components/heute/HomePager.tsx", "utf8");
    expect(pager).not.toMatch(/role="tablist"|Settings|<House|MiaButton/);
    expect(existsSync("src/components/ui/HomeButton.tsx")).toBe(false);
    expect(readFileSync("src/components/heute/TodayPage.tsx", "utf8")).toMatch(/label: "Einstellungen"[\s\S]*label: "Startseite bearbeiten"/);
  });

  it("ohne Leiste: erster Start, Notiz-Editor, Kochmodus, Anmelden, Rechtsseiten", () => {
    for (const p of ["/notizen/bearbeiten", "/kochbuch/kochen", "/anmelden", "/beitreten", "/datenschutz", "/impressum", "/nutzungsbedingungen"]) expect(leisteVersteckt(p, true), p).toBe(true);
    expect(leisteVersteckt("/", false)).toBe(true);
    // Einladungs-Link: Anmelden ohne Leiste – sonst wirkte „Heute“ schon gewählt, bevor das Beitreten fertig ist
    for (const p of ["/e/0123456789abcdef0123456789abcdef", "/einladung"]) expect(leisteVersteckt(p, true), p).toBe(true);
    for (const p of ["/einkaufsliste", "/essen"]) expect(leisteVersteckt(p, true), p).toBe(false);
    for (const p of ["/", "/pinnwand", "/kochbuch/rezept", "/tag"]) expect(leisteVersteckt(p, true), p).toBe(false);
  });

  it("weich weg bei Tastatur, Fenstern, Vollbild-Schritten, Bearbeiten; Bühne nur unsichtbar; reduced-motion nur Überblenden", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css).toMatch(/\.leiste \{ transition: transform \.9s var\(--mia-ease\), opacity \.9s var\(--mia-ease\); \}/);
    expect(css).toMatch(/body:has\(\[role="dialog"\]\[aria-modal\], \[role="alertdialog"\], \[data-code-screen\], \[data-zustimmung\], \[data-edit-leiste\]\) \.leiste/);
    expect(css).toMatch(/\.leiste\[data-buehne\][^{]*\{ opacity: 0; transform: none !important;/);
    expect(css).toMatch(/\.leiste, \.leiste\[data-weg\] \{ transition: opacity \.4s ease; transform: none !important; \}/);
    expect(readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8")).toMatch(/<Leiste name=\{helperName\(profile\)\} weg=\{typing\} buehne=\{open\} \/>/);
  });

  it("Leiste liest die Adresse nur innerhalb von Suspense (sonst bricht der Build beim Vorrendern ab)", () => {
    expect(readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8")).toMatch(/<Suspense fallback=\{null\}>\s*<Leiste /);
  });

  it("Platz unten: Leiste + Mia + Luft; Schwebendes sitzt über der Leiste", () => {
    const st = readFileSync("src/components/ui/styles.ts", "utf8");
    expect(st).toMatch(/FAB_CLEARANCE = "pb-\[calc\(max\(0\.75rem,env\(safe-area-inset-bottom\)\)\+66px\+30px\+1rem\)\]"/);
    expect(readFileSync("src/components/begleitung/KitchenHelper.tsx", "utf8")).toMatch(/bottom: UEBER_LEISTE/);
  });
});

describe("Wischen vom linken Rand", () => {
  it("nur vom Rand, weit genug, kaum senkrecht", () => {
    expect(randZurueck(8, 120, 10)).toBe(true);
    expect(randZurueck(40, 120, 10)).toBe(false);
    expect(randZurueck(8, 40, 0)).toBe(false);
    expect(randZurueck(8, 90, 120)).toBe(false);
  });
});

describe("Öffnen = Startseite: Bühne schließt nach langer Pause", () => {
  afterEach(() => vi.restoreAllMocks());
  it("NavigationMemory schließt die Bühne nach mehr als 5 Minuten", () => {
    const src = readFileSync("src/components/core/NavigationMemory.tsx", "utf8");
    expect(src).toMatch(/if \(weg !== null && now\(\)\.getTime\(\) - weg > HEIM_MS\) closeHelper\(\);/);
  });
});

describe("Einmal erklärt", () => {
  it("wer die App schon hatte, hört es einmal; ab morgen weg; nicht im Beispiel-Tag", () => {
    const opts = { today: "2026-10-28", since: "2026-10-01", demo: false, gezeigt: {} };
    expect(naechsterHinweis({ "leiste-neu": true }, opts)).toBe("leiste-neu");
    expect(naechsterHinweis({ "leiste-neu": true }, { ...opts, gezeigt: { "leiste-neu": "2026-10-27" } })).toBeNull();
    expect(naechsterHinweis({ "leiste-neu": true }, { ...opts, demo: true })).toBeNull();
    expect(naechsterHinweis({ "leiste-neu": true }, { ...opts, since: "2026-10-28" })).toBeNull();
    expect(tidyMiaText(LEISTE_NEU)).toBe(LEISTE_NEU);
  });
});
