// Mikrofon-Freigabe für ALLE Mikro-Stellen (Tafel 27): Fehler einordnen,
// Gerät erkennen, Schritte zum Anmachen (iPhone/iPad, Android/Chrome,
// Diktieren aus), Vorab-Frage einmalig. Der Zustand ist geräteweit (ein
// gesperrtes Mikro ist überall gesperrt) und lebt nur im Speicher der Seite –
// beim Zurückkommen in die App wird neu geprüft.

import { micFehler, type MicFehler } from "@/lib/core/micCheck";

export type MicPlatform = "ios" | "android" | "andere";
/** Was fehlt (Tafel 86, `core/micCheck`): gesperrt, Diktieren/Spracherkennung aus, kein Ton, hängt, privat, unklar */
export type MicBlock = MicFehler;

export function micPlatform(ua: string): MicPlatform {
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && /Mobile/.test(ua))) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "andere";
}

/** iOS-Hauptversion aus dem Browser-Kennzeichen (unbekannt = null) */
export function iosMajor(ua: string): number | null {
  const m = ua.match(/OS (\d+)_\d+/) ?? ua.match(/Version\/(\d+)\.\d+.*Mobile/);
  return m ? Number(m[1]) : null;
}

/**
 * Fehler einordnen (Tafel 86): getUserMedia „NotAllowedError“ und die
 * Spracherkennung „not-allowed“ = gesperrt – außer das Mikro ist schon
 * erlaubt, dann fehlen auf dem iPhone Diktieren bzw. Spracherkennung;
 * „service-not-allowed“ = Diktieren/Spracherkennung aus (iPhone).
 */
export function classifyMicError(error: string, platform: MicPlatform): MicBlock | null {
  return micFehler(error, platform, state.granted);
}

const device = (p: MicPlatform) => (p === "ios" ? "dein iPhone" : "dein Handy");

/** Vorab-Sheet „Darf ich zuhören?“ (iPhone: „Falls danach nichts passiert …“) */
export function preAskText(p: MicPlatform): { title: string; text: string; allow: string; zusatz: string | null } {
  return {
    title: "Darf ich zuhören?",
    text: `Gleich fragt ${device(p)} nach dem Mikrofon. Tippe dann auf „${p === "ios" ? "Erlauben" : "Zulassen"}“.`,
    allow: p === "ios" ? "Erlauben" : "Zulassen",
    zusatz: p === "ios" ? "Falls danach nichts passiert: Ich zeig dir, woran’s liegt." : null,
  };
}

/** Symbol eines Schritts (nachgebaut, kein Foto) */
export type StepIcon = "zahnrad" | "apps" | "safari" | "mikro" | "erlauben" | "regler" | "berechtigungen" | "allgemein" | "tastatur" | "diktat" | "teilen" | "entfernen" | "sichern" | "neustart" | "chrome" | "menue";

/** Ein Schritt mit nachgebautem Bildschirm: Titel oben, Zeilen, die gesuchte ist markiert (`wischen`: kleine Animation „hochwischen“) */
export type MicStep = { text: string; icon: StepIcon; schalter?: number; screen: { title: string; rows: string[]; target: number; wischen?: boolean } };

// --- Zustand (geräteweit, nur im Speicher) -------------------------------------------------

/** „check“: der Mikro-Check; `fehler` = schon bekannt (automatisch nach einem Fehlschlag) */
type MicSheet = { kind: "fragen"; then: () => void } | { kind: "check"; fehler: MicBlock | null } | null;
type MicState = { block: MicBlock | null; granted: boolean; sheet: MicSheet; justOn: boolean; origin: Element | null };

let state: MicState = { block: null, granted: false, sheet: null, justOn: false, origin: null };
/** Knopf, von dem aus gefragt wurde („Lieber tippen“ setzt den Fokus ins Feld daneben) */
const focused = () => (typeof document === "undefined" ? null : document.activeElement);
const listeners = new Set<() => void>();
const set = (patch: Partial<MicState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export const micSubscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export const micState = () => state;

/** Zuhören/Aufnehmen gescheitert – der Mikro-Check sagt, was fehlt */
export function reportMicBlocked(block: MicBlock) {
  set({ block, granted: block === "gesperrt" ? false : state.granted, sheet: { kind: "check", fehler: block }, origin: state.origin ?? focused() });
}

/** Bekannter Stand der Freigabe (aus navigator.permissions) */
export function setMicPermission(permission: "granted" | "denied" | "prompt") {
  if (permission === "granted") set({ granted: true, block: null, justOn: state.block === "gesperrt" });
  else if (permission === "denied") set({ granted: false, block: state.block ?? "gesperrt" });
  else if (state.block === "gesperrt") set({ block: null, granted: false });
}

/** Mikro-Check öffnen (Einstellungen → Mia → „Mikrofon prüfen“, „Anmachen ›“) */
export const openMicHelp = () => set({ sheet: { kind: "check", fehler: state.block }, origin: focused() });
/** Der Check hat alles grün: Sperre vergessen */
export const micCheckOk = () => set({ block: null, granted: true, justOn: state.block !== null });
export const closeMicSheet = () => set({ sheet: null });
export const clearMicJustOn = () => set({ justOn: false });

/**
 * Vor dem Zuhören: gesperrt → Hilfe; beim allerersten Mal (noch nie gefragt,
 * Freigabe unbekannt) erst „Darf ich zuhören?“; sonst sofort `start`.
 * Muss im Tipp aufgerufen werden (das Sheet ruft `start` im nächsten Tipp).
 */
export function guardMic(start: () => void, askedBefore: boolean) {
  if (state.block) return set({ sheet: { kind: "check", fehler: state.block }, origin: focused() });
  if (!askedBefore && !state.granted) return set({ sheet: { kind: "fragen", then: start }, origin: focused() });
  set({ origin: focused() });
  start();
}

/** Nur für Tests @public */
export const resetMicState = () => set({ block: null, granted: false, sheet: null, justOn: false, origin: null });

// --- Wer hat das Mikrofon? (immer nur EIN Nutzer) ------------------------------------------
// iPhone-Safari teilt das Mikro schlecht: hört die Spracherkennung (Mia) noch
// zu, liefert getUserMedia für die Pinnwand keinen Ton oder hängt. Darum gibt
// jeder Nutzer das Mikro hier ab, bevor ein anderer es nimmt – und sagt
// Bescheid, wenn er fertig ist (auch bei Abbruch, Fehler, Seitenwechsel).

type MicOwner = { id: string; release: () => void };
let owner: MicOwner | null = null;
/** Wann zuletzt jemand das Mikro abgegeben hat (iOS braucht danach einen Moment) */
let releasedAt = 0;

/** Mikro nehmen: wer es gerade hat, wird vorher sauber beendet */
export function claimMic(id: string, release: () => void, at = Date.now()) {
  const previous = owner;
  owner = { id, release };
  if (previous && previous.id !== id) {
    try {
      previous.release();
    } catch {
      // schon beendet
    }
    releasedAt = at;
  }
}

/** Mikro abgeben (nur wer es hat) */
export function releaseMic(id: string, at = Date.now()) {
  if (owner?.id !== id) return;
  owner = null;
  releasedAt = at;
}

/** Wer hat das Mikro gerade? (null = frei) */
export const micOwner = () => owner?.id ?? null;

/** So lange nach dem Abgeben kurz warten, bevor iOS das Mikro neu hergibt */
export const MIC_SETTLE_MS = 350;
/** Wie lange noch warten (0 = sofort) */
export const micSettleWait = (at = Date.now()) => Math.max(0, releasedAt + MIC_SETTLE_MS - at);

/** Länger als so lange auf das Mikro warten = es hängt */
export const MIC_TIMEOUT_MS = 4000;
export const MIC_HANGS_TEXT = "Das Mikrofon hängt gerade – nochmal antippen?";

/**
 * getUserMedia mit Zeitlimit: kommt nichts, gilt es als hängend („timeout“).
 * Kommt der Ton doch noch zu spät, wird er sofort wieder freigegeben.
 */
export function withMicTimeout(request: Promise<MediaStream>, ms = MIC_TIMEOUT_MS): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    let late = false;
    const timer = setTimeout(() => {
      late = true;
      reject(Object.assign(new Error("Mikrofon hängt"), { name: "MicTimeout" }));
    }, ms);
    request.then(
      (stream) => {
        if (late) return stream.getTracks().forEach((t) => t.stop());
        clearTimeout(timer);
        resolve(stream);
      },
      (error) => {
        if (late) return;
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/**
 * getUserMedia, hängt es: einmal still neu versuchen, erst dann aufgeben
 * (wirft dann „MicTimeout“). `note` schreibt ins Mikro-Protokoll.
 */
export async function getMicWithRetry(request: () => Promise<MediaStream>, note: (text: string) => void = () => undefined, ms = MIC_TIMEOUT_MS): Promise<MediaStream> {
  try {
    return await withMicTimeout(request(), ms);
  } catch (e) {
    if (!(e instanceof Error) || e.name !== "MicTimeout") throw e;
    note("getUserMedia hängt – neuer Versuch");
    return withMicTimeout(request(), ms);
  }
}

let ranThisSession = false;
/**
 * Lief das Mikro in dieser Sitzung schon einmal? Erst dann darf eine Aufnahme
 * schon beim Aufsetzen des Fingers starten („halten“) – auf dem iPhone zählt
 * nur Loslassen/Klick als echtes Antippen, sonst erscheint die Mikro-Frage
 * beim ersten Mal nicht.
 */
export const micRanThisSession = () => ranThisSession;
export const noteMicRan = () => {
  ranThisSession = true;
};

/** Nur für Tests @public */
export const resetMicOwner = () => {
  owner = null;
  releasedAt = 0;
  ranThisSession = false;
};
