// A-027: Karte „Mia auf den Home-Bildschirm“ – nur im Browser, nie als App,
// „Später“ = nach 2 Tagen einmal wieder, danach nie mehr, Android-Angebot
// einmal abfangen und aufheben.
import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeWindow, noBrowser } from "../helpers";
import { STORAGE } from "@/lib/core/storage";

type Modul = typeof import("@/lib/core/homeBildschirm");
let m: Modul;
let win: ReturnType<typeof fakeWindow>;

const UA = {
  iphoneSafari: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1",
  iphoneInstagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0 (iPhone15,3; iOS 18_0; de_DE)",
  iphoneWhatsApp: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148",
  ipadMac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15",
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36",
  androidWebView: "Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.0.0 Mobile Safari/537.36",
  computer: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
};

beforeEach(async () => {
  win = fakeWindow();
  vi.resetModules();
  m = await import("@/lib/core/homeBildschirm");
});
afterEach(() => noBrowser());

const state = () => JSON.parse(win.localStorage.getItem("wasgibts.homebildschirm") ?? "null");

describe("Gerät und Browser erkennen", () => {
  it("iPhone Safari, anderer Browser/App-Vorschau, iPad mit Mac-Kennung, Android, Computer", () => {
    expect(m.erkennePlattform(UA.iphoneSafari)).toBe("ios-safari");
    expect(m.erkennePlattform(UA.iphoneChrome)).toBe("ios-anderer");
    expect(m.erkennePlattform(UA.iphoneInstagram)).toBe("ios-anderer");
    expect(m.erkennePlattform(UA.iphoneWhatsApp)).toBe("ios-anderer");
    expect(m.erkennePlattform(UA.ipadMac, 5)).toBe("ios-safari");
    expect(m.erkennePlattform(UA.ipadMac, 0)).toBe("computer");
    expect(m.erkennePlattform(UA.android)).toBe("android");
    expect(m.erkennePlattform(UA.androidWebView)).toBe("android-anderer");
    expect(m.erkennePlattform(UA.computer)).toBe("computer");
  });

  it("standalone über display-mode bzw. navigator.standalone", () => {
    expect(m.istStandalone(undefined)).toBe(false);
    expect(m.istStandalone({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false);
    expect(m.istStandalone({ matchMedia: (q) => ({ matches: q === "(display-mode: standalone)" }) })).toBe(true);
    expect(m.istStandalone({ navigator: { standalone: true } })).toBe(true);
    // Ohne Browser-Fenster (Server, Tests): nie standalone
    expect(m.istStandalone()).toBe(false);
  });
});

describe("Karte nur im Browser", () => {
  const zeigen = (o: Partial<Parameters<Modul["homeKarteZeigen"]>[0]> = {}) => m.homeKarteZeigen({ art: "ios-safari", standalone: false, vorschau: false, beispiel: false, faellig: true, ...o });

  it("erscheint im Browser; nicht als App, nicht in der Zeit-Vorschau, nicht im Beispiel-Tag, nicht am Computer", () => {
    expect(zeigen()).toBe(true);
    expect(zeigen({ standalone: true })).toBe(false);
    expect(zeigen({ vorschau: true })).toBe(false);
    // nicht im Beispiel-Tag, erst auf der echten Startseite
    expect(zeigen({ beispiel: true })).toBe(false);
    expect(zeigen({ art: m.homeKarteArt("computer", false) })).toBe(false);
    expect(zeigen({ faellig: false })).toBe(false);
  });

  it("welche Karte: Android mit Angebot = installieren, ohne = Menü", () => {
    expect(m.homeKarteArt("ios-safari", false)).toBe("ios-safari");
    expect(m.homeKarteArt("ios-anderer", true)).toBe("ios-anderer");
    expect(m.homeKarteArt("android", true)).toBe("android-angebot");
    expect(m.homeKarteArt("android", false)).toBe("android-menue");
    expect(m.homeKarteArt("android-anderer", true)).toBe("android-anderer");
    expect(m.homeKarteArt("computer", true)).toBeNull();
  });

  it("Texte knapp, ohne Druck, Name über APP_NAME", () => {
    expect(`${m.HOME_TEXTE["ios-safari"].vor} ⬆︎ ${m.HOME_TEXTE["ios-safari"].nach}`).toBe("Mia als App: unten auf Teilen ⬆︎ tippen, dann ‚Zum Home-Bildschirm‘.");
    expect(m.HOME_TEXTE["ios-anderer"].vor).toBe("Öffne mich in Safari, dann kann ich auf deinen Home-Bildschirm.");
    expect(`${m.HOME_TEXTE["android-menue"].vor} ⋮ ${m.HOME_TEXTE["android-menue"].nach}`).toBe("Mia als App: Menü ⋮ → ‚App installieren‘.");
    expect(m.HOME_KNOPF_INSTALLIEREN).toBe("Mia installieren");
    const alle = JSON.stringify([m.HOME_TEXTE, m.HOME_SCHRITTE]);
    expect(alle).not.toMatch(/musst|solltest|vergiss|fehlt|offen/i);
    // Zeichen nur als Linien-Icons, nicht als Emoji im Text
    expect(alle).not.toMatch(/⬆|⋮|＋/);
  });
});

describe("„Später“-Regel (nur dieses Gerät)", () => {
  it("am Anfang dran; „Später“ → 2 Tage Ruhe, dann einmal wieder; zweites „Später“ = nie mehr", () => {
    expect(m.homeKarteFaellig(null, "2026-10-28")).toBe(true);
    m.homeKarteSpaeter("2026-10-28");
    expect(state()).toEqual({ version: 1, spaeter: 1, am: "2026-10-28", fertig: false });
    const s1 = state();
    expect(m.homeKarteFaellig(s1, "2026-10-28")).toBe(false);
    expect(m.homeKarteFaellig(s1, "2026-10-29")).toBe(false);
    expect(m.homeKarteFaellig(s1, "2026-10-30")).toBe(true);
    m.homeKarteSpaeter("2026-10-30");
    expect(state()).toMatchObject({ spaeter: 2, fertig: true });
    expect(m.homeKarteFaellig(state(), "2027-01-01")).toBe(false);
  });

  it("installiert = nie mehr; kaputte Daten werden still bereinigt", () => {
    m.homeKarteFertig();
    expect(state()).toMatchObject({ fertig: true, spaeter: 0 });
    m.homeKarteFertig();
    expect(m.homeKarteFaellig(state(), "2026-10-28")).toBe(false);
    win.localStorage.setItem("wasgibts.homebildschirm", JSON.stringify({ version: 1, spaeter: -3, am: 5, fertig: "ja" }));
    m.homeKarteSpaeter("2026-10-28");
    expect(state()).toEqual({ version: 1, spaeter: 1, am: "2026-10-28", fertig: false });
    win.localStorage.setItem("wasgibts.homebildschirm", JSON.stringify({ version: 9 }));
    m.homeKarteSpaeter("2026-10-28");
    expect(state()).toMatchObject({ spaeter: 1 });
  });

  it("steht im Speicher-Verzeichnis, nicht in der Sicherung", () => {
    const def = STORAGE.find((s) => s.key === "wasgibts.homebildschirm");
    expect(def).toMatchObject({ version: 1, area: "local", backup: false });
  });
});

describe("Android: beforeinstallprompt", () => {
  const angebot = (outcome: "accepted" | "dismissed") => {
    const prompt = vi.fn(async () => {});
    const e = { type: "beforeinstallprompt", preventDefault: vi.fn(), prompt, userChoice: Promise.resolve({ outcome }) };
    return e;
  };

  it("wird genau einmal abgefangen (preventDefault), aufgehoben und beim Installieren benutzt", async () => {
    expect(win.listenerCount("beforeinstallprompt")).toBe(1);
    m.fangeInstallAngebotAb(win);
    expect(win.listenerCount("beforeinstallprompt")).toBe(1);
    expect(m.installAngebotDa()).toBe(false);
    expect(await m.installieren()).toBe("keins");
    const e = angebot("accepted");
    win.dispatchEvent(e);
    expect(e.preventDefault).toHaveBeenCalledOnce();
    expect(m.installAngebotDa()).toBe(true);
    expect(await m.installieren()).toBe("ok");
    expect(e.prompt).toHaveBeenCalledOnce();
    // nur einmal benutzbar; danach nie mehr fragen
    expect(m.installAngebotDa()).toBe(false);
    expect(state()).toMatchObject({ fertig: true });
  });

  it("abgelehnt: Karte bleibt (Weg übers Menü), installiert-Ereignis = fertig", async () => {
    win.dispatchEvent(angebot("dismissed"));
    expect(await m.installieren()).toBe("abgelehnt");
    expect(state()).toBeNull();
    const kaputt = { type: "beforeinstallprompt", preventDefault() {}, prompt: async () => Promise.reject(new Error("weg")), userChoice: Promise.resolve({ outcome: "accepted" as const }) };
    win.dispatchEvent(kaputt);
    expect(await m.installieren()).toBe("abgelehnt");
    win.dispatchEvent({ type: "appinstalled" });
    expect(state()).toMatchObject({ fertig: true });
    m.resetInstallAngebotForTests();
    expect(m.installAngebotDa()).toBe(false);
  });
});

describe("Startseite: höchstens EIN Hinweis", () => {
  it("die Karte belegt den Hinweis-Platz (nur „Ich heiße jetzt Mia“ geht vor) und „Mia denkt mit“ wartet", () => {
    const src = readFileSync("src/components/heute/TodayPage.tsx", "utf8");
    expect(src).toMatch(/const hinweis = homeKarte && hinweisRoh !== "mia-name-neu" \? null : hinweisRoh;/);
    expect(src).toMatch(/besetzt: Boolean\(hinweis\) \|\| homeKarteSteht/);
    expect(src).toContain("beispiel: demoOn");
    const karte = readFileSync("src/components/heute/HomeBildschirmKarte.tsx", "utf8");
    expect(karte).toContain("Zeig’s mir");
    expect(karte).toContain("Später");
    expect(karte).not.toMatch(/<\w*Badge|data-badge/);
    expect(readFileSync("src/components/einstellungen/settings/Hubs.tsx", "utf8")).toContain("<HomeBildschirmRow />");
  });
});
