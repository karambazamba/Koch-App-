// Kleine Browser-Helfer: Hallo-Bildschirm, Homescreen-Hinweis, App-Icon in der
// Lieblingsfarbe, Hell/Dunkel und das Aufleuchten einer neuen Kachel.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";

type Link = { rel: string; type?: string; href: string; getAttribute: (k: string) => string; setAttribute: (k: string, v: string) => void };

function link(rel: string, href: string, type?: string): Link {
  const l: Link = {
    rel,
    type,
    href,
    getAttribute: () => l.href,
    setAttribute: (_k, v) => {
      l.href = v;
    },
  };
  return l;
}

/** Ein `document` mit Links und Meta-Tags, `querySelectorAll` für die benutzten Selektoren */
function fakeDocument(links: Link[], metas: { content: string; setAttribute: (k: string, v: string) => void }[] = []) {
  const doc = {
    cookie: "",
    head: {},
    documentElement: { dataset: {} as Record<string, string> },
    querySelectorAll(selector: string) {
      if (selector.startsWith("meta")) return metas;
      const rel = selector.match(/rel="([^"]+)"/)?.[1];
      const type = selector.match(/type="([^"]+)"/)?.[1];
      const hrefPart = selector.match(/href\*="([^"]+)"/)?.[1];
      return links.filter((l) => l.rel === rel && (!type || l.type === type) && (!hrefPart || l.href.includes(hrefPart)));
    },
    querySelector: vi.fn(),
  };
  vi.stubGlobal("document", doc);
  return doc;
}

const media = (matches: Record<string, boolean>) => (q: string) => ({ matches: Object.entries(matches).some(([k, v]) => v && q.includes(k)) });

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  noBrowser();
});

describe("Hallo-Bildschirm", () => {
  it("merkt sich, wie weit die Begrüßung ist und dass sie lief", async () => {
    const hello = await import("@/lib/core/hello");
    expect(hello.helloWasShown()).toBe(false);
    hello.markHelloShown();
    expect(hello.helloWasShown()).toBe(true);
    hello.setHelloElapsed(1200);
    expect(hello.helloElapsed()).toBe(1200);
  });

  it("Mias Platz wird genau einmal abgeholt – mit Bewegung reduzieren gar nicht", async () => {
    const hello = await import("@/lib/core/hello");
    expect(hello.reducedMotion()).toBe(false); // ohne Browser
    const win = fakeWindow() as unknown as { matchMedia?: unknown };
    win.matchMedia = media({ reduce: false });
    hello.setHelloFlight({ x: 1, y: 2, size: 150 });
    expect(hello.takeHelloFlight()).toEqual({ x: 1, y: 2, size: 150 });
    expect(hello.takeHelloFlight()).toBeNull();
    win.matchMedia = media({ reduce: true });
    expect(hello.reducedMotion()).toBe(true);
    hello.setHelloFlight({ x: 1, y: 2, size: 150 });
    expect(hello.takeHelloFlight()).toBeNull();
  });
});

describe("Hinweis zum Homescreen-Icon", () => {
  it("nur als Homescreen-App auf dem iPhone – mit Sicherungs-Hinweis", async () => {
    const { iconChangeHint } = await import("@/lib/core/homescreen");
    expect(iconChangeHint()).toBeNull(); // ohne Browser
    const win = fakeWindow() as unknown as { matchMedia?: unknown };
    win.matchMedia = media({ standalone: true });
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)", platform: "iPhone", maxTouchPoints: 5 });
    expect(iconChangeHint()).toContain("bleibt, bis du die App neu hinzufügst");
    expect(iconChangeHint()).toContain("Daten sichern");
    // iPad mit Desktop-Kennung
    vi.stubGlobal("navigator", { userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 });
    expect(iconChangeHint()).not.toBeNull();
    // Android
    vi.stubGlobal("navigator", { userAgent: "Linux; Android 14; Pixel 7", platform: "Linux", maxTouchPoints: 5 });
    expect(iconChangeHint()).toBeNull();
    // im Browser (nicht Homescreen), aber iOS-Safari mit navigator.standalone
    win.matchMedia = media({});
    vi.stubGlobal("navigator", { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5, standalone: true });
    expect(iconChangeHint()).not.toBeNull();
    vi.stubGlobal("navigator", { userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 });
    expect(iconChangeHint()).toBeNull();
  });
});

describe("App-Icon in der Lieblingsfarbe", () => {
  it("setzt Cookie und Links; favicon.ico nur bei Orange", async () => {
    const observed: unknown[] = [];
    vi.stubGlobal(
      "MutationObserver",
      class {
        constructor(public fn: () => void) {}
        observe(target: unknown) {
          observed.push(target);
        }
      },
    );
    const links = [link("apple-touch-icon", "/a.png"), link("icon", "/i.svg", "image/svg+xml"), link("icon", "/f.png", "image/png"), link("icon", "/favicon.ico")];
    const doc = fakeDocument(links);
    const { setIconColor } = await import("@/lib/core/iconColor");
    setIconColor("lila");
    expect(doc.cookie).toBe("farbe=lila; path=/; max-age=31536000; samesite=lax");
    expect(links.map((l) => l.href)).toEqual(["/icons/lila/apple-touch-icon-v3.png", "/icons/lila/icon-v3.svg", "/icons/lila/favicon-32-v3.png", "/icons/lila/favicon-32-v3.png"]);
    setIconColor("orange");
    expect(links[0].href).toBe("/icons/orange/apple-touch-icon-v3.png");
    // nur ein Beobachter
    expect(observed).toHaveLength(1);
  });

  it("ohne document: nichts tun", async () => {
    const { setIconColor } = await import("@/lib/core/iconColor");
    expect(() => setIconColor("lila")).not.toThrow();
  });
});

describe("Hell, Dunkel, Automatisch", () => {
  it("setzt data-theme und die Farbe der Statusleiste", async () => {
    const metas = [{ content: "", setAttribute(_k: string, v: string) { this.content = v; } }];
    const doc = fakeDocument([], metas);
    const win = fakeWindow() as unknown as { matchMedia?: unknown };
    win.matchMedia = media({ dark: true });
    const { applyTheme, THEME_COLORS } = await import("@/lib/core/theme");
    applyTheme("warm");
    expect(doc.documentElement.dataset.theme).toBe("warm");
    expect(metas[0].content).toBe(THEME_COLORS.warm.background);
    applyTheme("auto");
    expect(metas[0].content).toBe(THEME_COLORS.nacht.background);
    win.matchMedia = media({});
    applyTheme("auto");
    expect(metas[0].content).toBe(THEME_COLORS.warm.background);
    applyTheme("nacht");
    expect(doc.documentElement.dataset.theme).toBe("nacht");
  });

  it("Boot-Skript wählt die Ansicht vor dem ersten Zeichnen", async () => {
    const { THEME_BOOT_SCRIPT } = await import("@/lib/core/theme");
    const run = (profile: unknown) => {
      const dataset: Record<string, string> = {};
      const localStorage = { getItem: () => (profile === undefined ? null : JSON.stringify(profile)) };
      new Function("localStorage", "document", THEME_BOOT_SCRIPT)(localStorage, { documentElement: { dataset } });
      return dataset.theme;
    };
    expect(run({ theme: "nacht" })).toBe("nacht");
    expect(run({ theme: "frisch" })).toBe("auto");
    expect(run({ theme: "bunt" })).toBe("warm");
    expect(run(undefined)).toBeUndefined();
  });
});

describe("Neue Kachel leuchtet kurz auf", () => {
  it("sucht die Kachel ein paar Frames lang, scrollt hin und leuchtet", async () => {
    vi.useFakeTimers();
    let frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (f: () => void) => frames.push(f));
    const classes = new Set<string>(["tile-glow"]);
    const el = { scrollIntoView: vi.fn(), offsetWidth: 10, classList: { add: (c: string) => classes.add(c), remove: (c: string) => classes.delete(c) } };
    const doc = fakeDocument([]);
    let tries = 0;
    doc.querySelector.mockImplementation(() => (++tries < 3 ? null : el));
    fakeWindow();
    const { glowTile } = await import("@/lib/core/homeUnits");
    glowTile("sport");
    for (let i = 0; i < 5 && frames.length; i++) {
      const now = frames;
      frames = [];
      now.forEach((f) => f());
    }
    expect(doc.querySelector).toHaveBeenCalledWith('[data-unit][data-tile~="sport"]');
    expect(el.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(classes.has("tile-glow")).toBe(true);
    vi.advanceTimersByTime(1800);
    expect(classes.has("tile-glow")).toBe(false);
  });

  it("gibt nach 20 Versuchen auf", async () => {
    let frames: (() => void)[] = [];
    vi.stubGlobal("requestAnimationFrame", (f: () => void) => frames.push(f));
    const doc = fakeDocument([]);
    doc.querySelector.mockReturnValue(null);
    const { glowTile } = await import("@/lib/core/homeUnits");
    glowTile("wetter");
    for (let i = 0; i < 50 && frames.length; i++) {
      const now = frames;
      frames = [];
      now.forEach((f) => f());
    }
    expect(doc.querySelector).toHaveBeenCalledTimes(20);
  });
});
