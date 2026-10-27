import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser, type FakeWindow } from "../helpers";

type Nav = typeof import("@/lib/core/navigation");

let win: FakeWindow;
let frames: (() => void)[] = [];

/** Alle anstehenden Animations-Frames ausführen (auch neu angemeldete), höchstens `max` Runden */
function runFrames(max = 200) {
  for (let i = 0; i < max && frames.length; i++) {
    const now = frames;
    frames = [];
    now.forEach((f) => f());
  }
}

async function load(session: Record<string, string> = {}): Promise<Nav> {
  win = fakeWindow({}, session);
  vi.resetModules();
  return import("@/lib/core/navigation");
}

/** Wie der Router: URL wechseln (pushState) und danach melden */
function push(nav: Nav, url: string) {
  win.history.pushState(null, "", url);
  nav.onRouteChange(url);
}

/** Zurück-Geste: Browser setzt die URL, feuert popstate, dann rendert der Router */
function back(nav: Nav, url: string) {
  win.setUrl(url);
  win.dispatchEvent({ type: "popstate" });
  nav.onRouteChange(url);
}

beforeEach(() => {
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (f: () => void) => frames.push(f));
  vi.stubGlobal("document", { documentElement: { scrollHeight: 3000 } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  noBrowser();
});

describe("Zurück-Navigation: Verlauf", () => {
  it("merkt sich den Weg und kennt die vorherige Seite", async () => {
    const nav = await load();
    expect(win.history.scrollRestoration).toBe("manual");
    nav.onRouteChange("/");
    expect(nav.canGoBack()).toBe(false);
    expect(nav.previousUrl()).toBeNull();
    push(nav, "/einkaufsliste");
    push(nav, "/einkaufsliste/laden?name=REWE");
    expect(nav.canGoBack()).toBe(true);
    expect(nav.previousUrl()).toBe("/einkaufsliste");
  });

  it("vorwärts beginnt oben, zurück landet an der gemerkten Stelle", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 640;
    push(nav, "/notizen");
    expect(win.scrolls.at(-1)).toBe(0);
    win.scrollY = 120;
    back(nav, "/");
    runFrames();
    expect(win.scrollY).toBe(640);
    expect(nav.canGoBack()).toBe(false);
    // Wieder vor: die Notizen-Seite startet oben (alte Höhe vergessen)
    push(nav, "/notizen");
    expect(win.scrollY).toBe(0);
  });

  it("offenes Fenster (Seite gesperrt, Höhe springt auf 0): gemerkte Höhe bleibt (Startseite landete oben)", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 300;
    win.dispatchEvent({ type: "scroll" });
    runFrames();
    // „···“ öffnet ein Fenster: Seite gesperrt, Höhe 0 – und von dort weiter
    vi.stubGlobal("document", { documentElement: { scrollHeight: 3000 }, body: { style: { overflow: "hidden" } } });
    win.scrollY = 0;
    win.dispatchEvent({ type: "scroll" });
    runFrames();
    push(nav, "/profil");
    vi.stubGlobal("document", { documentElement: { scrollHeight: 3000 }, body: { style: { overflow: "" } } });
    back(nav, "/");
    runFrames();
    expect(win.scrollY).toBe(300);
  });

  it("erkennt Zurück auch ohne popstate (Router war schneller)", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    push(nav, "/sport");
    win.setUrl("/");
    nav.onRouteChange("/");
    expect(nav.canGoBack()).toBe(false);
    // popstate kommt danach – schon verarbeitet, also nichts mehr tun
    win.dispatchEvent({ type: "popstate" });
    push(nav, "/wetter");
    expect(nav.previousUrl()).toBe("/");
  });

  it("popstate zu einer unbekannten Seite legt sie oben auf", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    push(nav, "/a");
    back(nav, "/b");
    expect(nav.previousUrl()).toBe("/a");
    runFrames();
  });

  it("router.replace ersetzt den aktuellen Eintrag", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    push(nav, "/kalender");
    nav.expectReplace();
    win.history.replaceState(null, "", "/essen");
    nav.onRouteChange("/essen");
    expect(nav.previousUrl()).toBe("/");
    // replaceState auf dieselbe URL ändert nichts am Verlauf
    win.history.replaceState(null, "", "/essen");
    push(nav, "/x");
    expect(nav.previousUrl()).toBe("/essen");
  });

  it("replaceState mit neuer URL wird erkannt", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    push(nav, "/kalender");
    win.history.replaceState(null, "", "/essen");
    nav.onRouteChange("/essen");
    expect(nav.previousUrl()).toBe("/");
  });

  it("Reiter-Wechsel springt nicht nach oben", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 300;
    nav.expectTabSwitch();
    push(nav, "/?seite=kalender");
    expect(win.scrolls).toEqual([]);
    // danach wieder normal
    push(nav, "/tag");
    expect(win.scrolls).toEqual([0]);
  });

  it("pushState auf dieselbe Seite merkt keine Scrollhöhe", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.history.pushState(null, "", "/");
    win.history.pushState(null, "");
    expect(nav.canGoBack()).toBe(false);
  });

  it("benachrichtigt bei jedem Seitenwechsel, bis abgemeldet", async () => {
    const nav = await load();
    const fn = vi.fn();
    const off = nav.subscribeNavigation(fn);
    nav.onRouteChange("/");
    push(nav, "/a");
    expect(fn).toHaveBeenCalledTimes(2);
    off();
    push(nav, "/b");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("vorherige Seite, während der Verlauf noch nachzieht", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    push(nav, "/a");
    push(nav, "/b");
    // URL schon zurück auf /a, Verlauf noch nicht
    win.setUrl("/a");
    expect(nav.previousUrl()).toBe("/");
    // ganz woanders: oberster Eintrag
    win.setUrl("/fremd");
    expect(nav.previousUrl()).toBe("/b");
  });
});

describe("Zurück-Navigation: Scrollhöhe und Speicher", () => {
  it("Scrollen merkt die Höhe der sichtbaren Seite (einmal je Frame)", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 222;
    win.dispatchEvent({ type: "scroll" });
    win.dispatchEvent({ type: "scroll" });
    runFrames(1);
    const saved = JSON.parse(win.sessionStorage.getItem("wasgibts.verlauf")!);
    expect(saved.scroll["0:/"]).toBe(222);
    // Seite, die nicht mehr oben liegt: nichts merken
    win.setUrl("/woanders");
    win.scrollY = 5;
    win.dispatchEvent({ type: "scroll" });
    runFrames(1);
    expect(JSON.parse(win.sessionStorage.getItem("wasgibts.verlauf")!).scroll["0:/"]).toBe(222);
  });

  it("neu geladen: Verlauf aus der Sitzung, gleiche Seite = gemerkte Stelle", async () => {
    const stored = JSON.stringify({ stack: ["/", "/notizen"], scroll: { "1:/notizen": 450, "5:/alt": 9 } });
    const nav = await load({ "wasgibts.verlauf": stored });
    win.setUrl("/notizen");
    nav.onRouteChange("/notizen");
    runFrames();
    expect(win.scrollY).toBe(450);
    expect(nav.previousUrl()).toBe("/");
    const saved = JSON.parse(win.sessionStorage.getItem("wasgibts.verlauf")!);
    expect(saved.scroll["5:/alt"]).toBeUndefined();
  });

  it("kaputter Sitzungs-Eintrag → neu anfangen", async () => {
    const nav = await load({ "wasgibts.verlauf": "{kaputt" });
    nav.onRouteChange("/");
    expect(nav.canGoBack()).toBe(false);
    const nav2 = await load({ "wasgibts.verlauf": JSON.stringify({ stack: "nein" }) });
    nav2.onRouteChange("/x");
    expect(nav2.canGoBack()).toBe(false);
  });

  it("zu kurze Seite: nach einigen Frames so weit wie möglich", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 2500;
    push(nav, "/a");
    (globalThis as unknown as { document: { documentElement: { scrollHeight: number } } }).document.documentElement.scrollHeight = 1000;
    back(nav, "/");
    runFrames(400);
    expect(win.scrollY).toBe(200);
  });

  it("eigenes Wischen bricht das Wiederherstellen ab", async () => {
    const nav = await load();
    nav.onRouteChange("/");
    win.scrollY = 700;
    push(nav, "/a");
    back(nav, "/");
    win.dispatchEvent({ type: "touchstart" });
    runFrames();
    expect(win.scrollY).toBe(0);
  });

  it("Speicher gesperrt: Navigation geht trotzdem", async () => {
    const nav = await load();
    win.sessionStorage.setItem = () => {
      throw new Error("voll");
    };
    nav.onRouteChange("/");
    push(nav, "/a");
    expect(nav.previousUrl()).toBe("/");
  });

  it("installiert sich nur einmal", async () => {
    const nav = await load();
    const count = win.listenerCount("popstate");
    nav.installNavigationMemory();
    expect(win.listenerCount("popstate")).toBe(count);
  });

  it("ohne Browser: nichts einhängen", async () => {
    noBrowser();
    vi.resetModules();
    const nav = await import("@/lib/core/navigation");
    expect(() => nav.installNavigationMemory()).not.toThrow();
    expect(nav.canGoBack()).toBe(false);
  });
});
