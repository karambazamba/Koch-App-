// Navigation: immer zur Startseite – Haus-Knopf (mehrere Ebenen zurück),
// Öffnen nach mehr als 5 Minuten = Heute, Ausnahmen, Wischen im Kalender.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { HEIM_MS, istHeute, zurStartseite } from "@/lib/core/heimkehr";
import { fakeWindow } from "../helpers";

const T = Date.UTC(2026, 9, 27, 10, 0);

describe("Öffnen = Startseite", () => {
  it("nach mehr als 5 Minuten weg → Heute, darunter bleibt man", () => {
    expect(zurStartseite("/einkaufsliste", T - HEIM_MS - 1000, T)).toBe(true);
    expect(zurStartseite("/einkaufsliste", T - HEIM_MS + 1000, T)).toBe(false);
    expect(zurStartseite("/?seite=kalender", T - 3600_000, T)).toBe(true);
    expect(zurStartseite("/einkaufsliste", null, T)).toBe(false);
  });

  it("Heute bleibt Heute; Kochmodus, Einladung, Anmelden und Links mit Angaben bleiben", () => {
    const lange = T - 3600_000;
    for (const url of ["/", "/?seite=heute", "/kochbuch/kochen?id=sp", "/e/abc123", "/anmelden", "/datenschutz", "/einkaufsliste?plus=Butter"]) expect(zurStartseite(url, lange, T)).toBe(false);
    expect(istHeute("/?seite=essen")).toBe(false);
    expect(istHeute("/")).toBe(true);
  });
});

describe("Haus-Knopf", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("zählt die Schritte bis Heute; Zurück über mehrere Ebenen räumt den Verlauf auf", async () => {
    const w = fakeWindow();
    (globalThis as { requestAnimationFrame?: unknown }).requestAnimationFrame = () => 0;
    const nav = await import("@/lib/core/navigation");
    const go = (url: string) => {
      w.setUrl(url);
      nav.onRouteChange(url);
    };
    go("/");
    go("/?seite=essen");
    go("/kochbuch");
    go("/kochbuch/rezept?id=sp");
    expect(nav.stepsToHome(istHeute)).toBe(3);
    // history.go(-3): Adresse ist schon Heute, dann popstate, dann der Router
    w.setUrl("/");
    w.dispatchEvent({ type: "popstate" });
    nav.onRouteChange("/");
    expect(nav.canGoBack()).toBe(false);
    expect(nav.stepsToHome(istHeute)).toBeNull();
  });

  it("steht im Seitenkopf neben „‹ …“, nur tiefer als eine Ebene unter Heute", () => {
    const head = readFileSync("src/components/ui/PageHeader.tsx", "utf8");
    expect(head).toMatch(/<BackButton[^>]*\/>\s*<HomeButton/);
    expect(readFileSync("src/components/ui/HomeButton.tsx", "utf8")).toMatch(/if \(istHeute\(prev \?\? fallback\)\) return null/);
  });
});

describe("Wischen Kalender → Heute", () => {
  it("das Monatsraster fängt das Wischen nicht ab (es hat kein eigenes)", () => {
    expect(readFileSync("src/components/kalender/CalendarPage.tsx", "utf8")).not.toMatch(/role="grid"[^>]*data-no-swipe/);
  });
});
