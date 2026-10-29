// A-059 (Tafel 144): Antippen der Notizen-Kachel öffnet in allen Größen immer
// die Notizen-Seite – leer wie voll, auch Zeilen und Leertext. Nur der Stift
// legt eine neue Notiz an. Die leere Notizen-Seite sagt, wie es geht.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/notizen/model";
import { at } from "../helpers";

const TODAY = "2026-10-21";
beforeEach(() => at(`${TODAY}T09:00`));

const store = vi.hoisted(() => ({ notes: [] as unknown[] }));
vi.mock("@/lib/notizen", async (orig) => ({ ...(await orig<object>()), useNotes: () => store.notes }));
vi.mock("next/dynamic", () => ({ default: () => () => null }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: () => {} }) }));
vi.mock("next/link", () => ({ default: ({ href, children, ...rest }: { href: string; children: unknown }) => createElement("a", { href, ...rest }, children as never) }));

const note = (i: number) => ({ id: `n${i}`, typ: "notiz", data: { title: `Notiz ${i}`, kind: "text", text: "Okay, kann ich jetzt schon mal den Maler", pinned: i === 0 }, erstellt: `${TODAY}T0${i}:00:00.000Z`, geaendert: `${TODAY}T0${i}:00:00.000Z` }) as unknown as Note;

describe("Notizen-Kachel: ganze Kachel = Notizen-Seite", () => {
  for (const size of ["XS", "S", "M"] as const)
    for (const n of [0, 1, 4]) {
      it(`${size} mit ${n} Notizen: jeder Link führt zu /notizen, nur der Stift legt an`, async () => {
        store.notes = Array.from({ length: n }, (_, i) => note(i));
        const { NotesTile } = await import("@/components/heute/HomeTiles");
        const html = renderToStaticMarkup(createElement(NotesTile, { size }));
        const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
        expect(hrefs.length).toBeGreaterThan(1);
        expect(new Set(hrefs)).toEqual(new Set(["/notizen"]));
        expect(html).not.toContain("bearbeiten");
        // Einziger Knopf: der Stift
        const knoepfe = [...html.matchAll(/<button[^>]*aria-label="([^"]*)"/g)].map((m) => m[1]);
        expect(knoepfe).toEqual(["Schnellnotiz schreiben"]);
        if (!n) expect(html).toContain('data-notiz-leer="true"');
      });
    }

  it("leere Notizen-Seite: „Noch keine Notizen. Tipp aufs Plus oder sag Mia: „Notiz: …““", async () => {
    const { NOTIZEN_LEER } = await import("@/components/notizen/NotesView");
    expect(NOTIZEN_LEER("Mia")).toBe("Noch keine Notizen.\nTipp aufs Plus oder sag Mia: „Notiz: …“");
  });
});
