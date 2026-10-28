// „Mia auf den Home-Bildschirm“ (A-027, Erster Start rund für Testfreunde):
// Nur im Browser (nie als Home-Bildschirm-App) steht EINMAL eine ruhige Karte
// oben auf der Startseite – beim ersten Öffnen der echten Startseite (nicht
// solange der Beispiel-Tag nach „Für wen soll ich sortieren?“ läuft). Je
// Gerät/Browser:
//   iPhone + Safari:  „Mia als App: unten auf Teilen ⬆︎ tippen, dann ‚Zum
//                     Home-Bildschirm‘.“ + „Zeig’s mir“ (3 Schritte) / „Später“
//   iPhone + anderer Browser bzw. App-Vorschau (Chrome, Instagram, WhatsApp …):
//                     „Öffne mich in Safari, dann kann ich auf deinen Home-Bildschirm.“
//   Android:          `beforeinstallprompt` (einmal abgefangen, aufgehoben) →
//                     „Mia installieren“; ohne Angebot „Menü ⋮ → App installieren“
//   Android in einer App-Vorschau: „Öffne mich in Chrome …“
//   Computer:         keine Karte.
// „Später“ = nach 2 Tagen einmal wieder, danach nie mehr. Installiert = nie
// mehr. Dauerhaft: Einstellungen → Daten & App „Mia auf den Home-Bildschirm“.
// Gespeichert nur auf diesem Gerät (`wasgibts.homebildschirm`, nicht in der
// Sicherung – es geht um diesen Browser, nicht um die Familie).

import { APP_NAME } from "@/lib/core/app";
import { createLocalStore } from "@/lib/core/localStore";
import { addDays } from "@/lib/core/now";
import { useExternalStore } from "@/lib/core/useExternalStore";

export type Plattform = "ios-safari" | "ios-anderer" | "android" | "android-anderer" | "computer";

/** In-App-Browser und andere Browser auf dem iPhone (dort geht „Zum Home-Bildschirm“ nur über Safari) */
const IOS_ANDERE = /CriOS|FxiOS|EdgiOS|OPiOS|OPT\/|YaBrowser|DuckDuckGo|GSA\/|Instagram|FBAN|FBAV|FB_IAB|FBIOS|WhatsApp|Line\/|Snapchat|Twitter|TikTok|musical_ly|LinkedInApp|Pinterest/;
/** App-Vorschauen auf Android (WebView ohne Installieren) */
const ANDROID_VORSCHAU = /; wv\)|Instagram|FBAN|FBAV|FB_IAB|WhatsApp|Line\/|Snapchat|TikTok|musical_ly/;

/** Welches Gerät, welcher Browser? (rein; `touch` = navigator.maxTouchPoints für iPads mit Mac-Kennung) */
export function erkennePlattform(ua: string, touch = 0): Plattform {
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && touch > 1);
  if (ios) {
    // Ohne „Safari/“ in der Kennung ist es eine eingebettete Vorschau (WKWebView)
    if (IOS_ANDERE.test(ua) || !/Safari\//.test(ua)) return "ios-anderer";
    return "ios-safari";
  }
  if (/Android/.test(ua)) return ANDROID_VORSCHAU.test(ua) ? "android-anderer" : "android";
  return "computer";
}

type MediaWin = { matchMedia?: (q: string) => { matches: boolean }; navigator?: { standalone?: boolean } };

/** Als Home-Bildschirm-App geöffnet (nicht im Browser) */
export function istStandalone(win: MediaWin | undefined = typeof window === "undefined" ? undefined : (window as unknown as MediaWin)): boolean {
  if (!win) return false;
  const mm = (q: string) => Boolean(win.matchMedia?.(q).matches);
  return mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || mm("(display-mode: minimal-ui)") || win.navigator?.standalone === true;
}

// --- Speicher (nur dieses Gerät) -------------------------------------------------

type State = {
  version: 1;
  /** Wie oft „Später“ getippt (nach dem zweiten Mal nie mehr) */
  spaeter: number;
  /** Tag des letzten „Später“ */
  am: string | null;
  /** Installiert (oder nach zweimal „Später“) = nie mehr */
  fertig: boolean;
};

const LEER: State = { version: 1, spaeter: 0, am: null, fertig: false };

const store = createLocalStore("wasgibts.homebildschirm", (raw: unknown): State | null => {
  if (!raw || typeof raw !== "object" || (raw as State).version !== 1) return null;
  const r = raw as Partial<State>;
  return {
    version: 1,
    spaeter: typeof r.spaeter === "number" && r.spaeter >= 0 ? Math.floor(r.spaeter) : 0,
    am: typeof r.am === "string" ? r.am : null,
    fertig: r.fertig === true,
  };
});

/** Ist die Karte (vom Gerät her) heute dran? (rein) – „Später“: nach 2 Tagen einmal wieder, danach nie mehr */
export function homeKarteFaellig(state: State | null, today: string): boolean {
  const s = state ?? LEER;
  if (s.fertig || s.spaeter >= 2) return false;
  if (s.spaeter === 0) return true;
  return !s.am || today >= addDays(s.am, 2);
}

/** „Später“ getippt */
export function homeKarteSpaeter(today: string) {
  const s = store.load() ?? LEER;
  const spaeter = s.spaeter + 1;
  store.save({ version: 1, spaeter, am: today, fertig: s.fertig || spaeter >= 2 });
}

/** Installiert: nie mehr fragen */
export function homeKarteFertig() {
  const s = store.load() ?? LEER;
  if (!s.fertig) store.save({ ...s, fertig: true });
}

export function useHomeKarteState(): State | null | undefined {
  return useExternalStore(store.subscribe, () => store.load(), () => undefined);
}

// --- Android: das Installier-Angebot des Browsers --------------------------------

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

let angebot: InstallEvent | null = null;
let abgefangen = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * Das Angebot kommt oft, bevor das Seiten-JavaScript geladen ist (die Seite
 * steht als Server-HTML schon da) – dann ginge es verloren. Darum fängt ein
 * winziges Skript im `<head>` (Layout) es sofort ab und legt es hier ab; das
 * Modul übernimmt es beim Laden.
 */
const FRUEH = "__miaInstallAngebot";
export const INSTALL_BOOT_SCRIPT = `addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.${FRUEH}=e;});`;

/** `beforeinstallprompt` genau einmal abfangen und für „Mia installieren“ aufheben (auch ein schon früh abgefangenes) */
export function fangeInstallAngebotAb(win: Pick<Window, "addEventListener"> | undefined = typeof window === "undefined" ? undefined : window) {
  if (abgefangen || !win) return;
  abgefangen = true;
  const frueh = (win as unknown as Record<string, unknown>)[FRUEH];
  if (frueh) {
    angebot = frueh as InstallEvent;
    emit();
  }
  win.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    angebot = e as InstallEvent;
    emit();
  });
  win.addEventListener("appinstalled", () => {
    angebot = null;
    homeKarteFertig();
    emit();
  });
}

/** Hat der Browser ein Installier-Angebot geschickt? */
export const installAngebotDa = () => angebot !== null;

export function useInstallAngebot(): boolean {
  return useExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    installAngebotDa,
    () => false,
  );
}

/** „Mia installieren“: das aufgehobene Angebot zeigen (geht nur einmal) */
export async function installieren(): Promise<"ok" | "abgelehnt" | "keins"> {
  const e = angebot;
  if (!e) return "keins";
  angebot = null;
  emit();
  try {
    await e.prompt();
    const wahl = await e.userChoice;
    if (wahl.outcome === "accepted") {
      homeKarteFertig();
      return "ok";
    }
  } catch {
    // Angebot verfallen – dann bleibt der Weg übers Menü
  }
  return "abgelehnt";
}

/** Für Tests: Angebot vergessen @public */
export function resetInstallAngebotForTests() {
  angebot = null;
  abgefangen = false;
}

// Das Angebot kommt früh nach dem Laden – gleich mit dem Modul abfangen
fangeInstallAngebotAb();

// --- Was die Karte zeigt ----------------------------------------------------------

export type HomeKarteArt = "ios-safari" | "ios-anderer" | "android-angebot" | "android-menue" | "android-anderer";

/** Welche Karte? null = keine (Computer) (rein) */
export function homeKarteArt(p: Plattform, angebotDa: boolean): HomeKarteArt | null {
  if (p === "computer") return null;
  if (p === "android") return angebotDa ? "android-angebot" : "android-menue";
  return p;
}

/**
 * Steht die Karte jetzt auf der Startseite? (rein)
 * Nur im Browser, nicht in der Zeit-Vorschau, nicht solange der Beispiel-Tag
 * läuft (`beispiel`), nur wenn das Gerät sie heute dran hat. Sie erscheint
 * also beim ersten Öffnen der echten (eigenen) Startseite; wer die App schon
 * vorher im Browser hatte, bekommt die Karte ebenso einmal.
 */
export function homeKarteZeigen(o: { art: HomeKarteArt | null; standalone: boolean; vorschau: boolean; beispiel: boolean; faellig: boolean }): boolean {
  return Boolean(o.art) && !o.standalone && !o.vorschau && !o.beispiel && o.faellig;
}

/** Texte (knapp, ohne Druck); `teilen`/`menue` = dort steht ein Linien-Icon */
export const HOME_TEXTE = {
  "ios-safari": { vor: `${APP_NAME} als App: unten auf Teilen`, nach: "tippen, dann ‚Zum Home-Bildschirm‘." },
  "ios-anderer": { vor: "Öffne mich in Safari, dann kann ich auf deinen Home-Bildschirm.", nach: "" },
  "android-angebot": { vor: `${APP_NAME} als App: ein Tipp, dann bin ich auf deinem Home-Bildschirm.`, nach: "" },
  "android-menue": { vor: `${APP_NAME} als App: Menü`, nach: "→ ‚App installieren‘." },
  "android-anderer": { vor: "Öffne mich in Chrome, dann kann ich auf deinen Home-Bildschirm.", nach: "" },
} as const satisfies Record<HomeKarteArt, { vor: string; nach: string }>;

/** Die drei Schritte im Fenster „Zeig’s mir“ */
export const HOME_SCHRITTE = {
  ios: ["Unten auf Teilen tippen.", "Etwas runter, dann ‚Zum Home-Bildschirm‘.", "Oben rechts ‚Hinzufügen‘. Fertig."],
  android: ["Oben rechts auf das Menü tippen.", "‚App installieren‘ bzw. ‚Zum Startbildschirm‘.", "‚Installieren‘ tippen. Fertig."],
} as const;

export const HOME_KNOPF_INSTALLIEREN = `${APP_NAME} installieren`;
export const HOME_TITEL = `${APP_NAME} auf den Home-Bildschirm`;
