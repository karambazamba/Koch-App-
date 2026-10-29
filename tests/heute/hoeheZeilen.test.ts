// A-048, Klarstellung Tafel 135: Termine, Aufgaben, Einkauf S und Notizen
// wachsen und schrumpfen mit dem Inhalt – 1 Eintrag = Kopf + 1 Zeile, 2 = 2,
// 3 = 3, mehr = 3 Zeilen + „+n (weitere)“ im Kopf, leer = Kopf + EIN
// freundlicher Satz in einer Zeile; darunter immer 14 px (pb-3.5).
// Geprüft mit 0, 1, 2, 3 und 5 Einträgen.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { itemsForDay } from "@/lib/kalender/model";
import type { Note } from "@/lib/notizen/model";
import { kachelLaeden, tileRows } from "@/lib/einkauf/shopGroups";
import { at, aufgabe, termin } from "../helpers";

const TODAY = "2026-10-21";
beforeEach(() => at(`${TODAY}T09:00`));

const store = vi.hoisted(() => ({ notes: [] as unknown[] }));
vi.mock("@/lib/notizen", async (orig) => ({ ...(await orig<object>()), useNotes: () => store.notes }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

const ANZAHL = [0, 1, 2, 3, 5] as const;
/** Erwartete Zeilen: höchstens 3 */
const zeilen = (n: number) => Math.min(n, 3);
const count = (html: string, re: RegExp) => html.match(re)?.length ?? 0;
/** Zeilen der weißen Liste (je `<li … data-zeile`) */
const listenZeilen = (html: string) => count(html, /<li [^>]*data-zeile="true"/g);
const weitere = (html: string) => html.match(/data-weitere="true">([^<]*(?:<!-- -->[^<]*)*)</)?.[1].replace(/<!-- -->/g, "") ?? null;

describe.each(ANZAHL)("%i Einträge", (n) => {
  it("Termine: Kopf + min(n, 3) Zeilen, Rest „+n weitere“, leer ein Satz; unten 14 px", async () => {
    const { TermineSection } = await import("@/components/heute/MiniCards");
    const entries = Array.from({ length: n }, (_, i) => termin({ title: `Termin ${i + 1}`, date: TODAY, start: `${String(10 + i).padStart(2, "0")}:00`, end: `${String(10 + i).padStart(2, "0")}:30` }));
    const rows = itemsForDay(entries, TODAY, TODAY).map((item) => ({ item, state: null }));
    const html = renderToStaticMarkup(createElement(TermineSection, { rows, href: "/", today: TODAY, size: "M" }));
    expect(listenZeilen(html)).toBe(zeilen(n));
    expect(weitere(html)).toBe(n > 3 ? `+${n - 3} weitere` : null);
    // leer: EIN Satz in einer 30-px-Zeile – so hoch wie ein Eintrag
    if (!n) expect(html).toMatch(/class="flex h-\[30px\] items-center[^"]*" aria-label="Termin eintragen" data-zeile="true"/);
    expect(html).toContain("pb-3.5");
  });

  it("Aufgaben: Kopf + min(n, 3) Zeilen, Rest „+n weitere“, leer ein Satz", async () => {
    const { AufgabenSection } = await import("@/components/heute/MiniCards");
    const items = itemsForDay(Array.from({ length: n }, (_, i) => aufgabe({ title: `Aufgabe ${i + 1}` })), TODAY, TODAY);
    const html = renderToStaticMarkup(createElement(AufgabenSection, { items, today: TODAY, size: "M" }));
    expect(listenZeilen(html)).toBe(zeilen(n));
    expect(weitere(html)).toBe(n > 3 ? `+${n - 3} weitere` : null);
    if (!n) expect(html).toContain("Aufgabe eintragen");
    expect(html).toContain("pb-3.5");
  });

  it("Notizen S: Kopf + min(n, 3) Zeilen, Rest „+n“, leer „Schnell notieren …“ in einer Zeile", async () => {
    store.notes = Array.from({ length: n }, (_, i) => ({ id: `n${i}`, typ: "notiz", data: { title: `Notiz ${i + 1}`, kind: "text", text: "", pinned: false }, erstellt: `${TODAY}T0${i}:00:00.000Z`, geaendert: `${TODAY}T0${i}:00:00.000Z` }) as unknown as Note);
    const { NotesTile } = await import("@/components/heute/HomeTiles");
    const html = renderToStaticMarkup(createElement(NotesTile, { size: "S" }));
    expect(count(html, /data-notiz-zeile="true"/g)).toBe(zeilen(n));
    expect(weitere(html)).toBe(n > 3 ? `+${n - 3}` : null);
    if (!n) expect(html).toMatch(/min-h-\[30px\] items-center whitespace-nowrap[^"]*" data-zeile="true" data-notiz-leer="true"><span class="kachel-frei" data-platzhalter-text="true">Schnell notieren/);
    expect(html).toContain("pb-3.5");
  });

  it("Einkauf S: min(n, 3) Läden, „+n“ erst ab dem 4. Laden", () => {
    const shops = ["Edeka", "Rewe", "Lidl", "Aldi", "Penny"].slice(0, n);
    const items = shops.flatMap((shop, i) => Array.from({ length: n - i }, (_, k) => ({ name: `${shop}${k}`, shop })));
    for (const mine of [true, false]) {
      const r = tileRows(items, mine ? shops : [], kachelLaeden({ mine, ohneDa: false, inhalt: true }));
      expect(r.rows).toHaveLength(zeilen(n));
      expect(r.restZahl > 0).toBe(n > 3);
    }
  });
});

describe("Einkauf leer, Höhe der Kachel", () => {
  it("leer: EIN freundlicher Satz in einer Zeile, unten 14 px", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("src/components/heute/HomeTiles.tsx", "utf8");
    expect(src).toContain('<span className="kachel-frei">{size === "M" ? einkaufLeerM() : "Was braucht ihr?"}</span>');
    expect(src).toContain("Liste ist leer. Plus tippen oder ${helperName()} sagen.");
    // Fehler aus `pruefen` (kleine Tippfläche 116×39): die leere Zeile ist eine ganz tippbare Listenzeile (data-zeile, ≥ 30 px)
    expect(src).toMatch(/min-h-\[30px\][^"]*" data-zeile data-einkauf-leer>/);
    expect(src).not.toContain("Liste ist leer. Sag mir einfach");
    expect(src).toContain("${HALF} isolate pb-3.5");
  });
});
