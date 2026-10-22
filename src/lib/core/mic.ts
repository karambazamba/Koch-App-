// Mikrofon-Freigabe für ALLE Mikro-Stellen (Tafel 27): Fehler einordnen,
// Gerät erkennen, Schritte zum Anmachen (iPhone/iPad, Android/Chrome,
// Diktieren aus), Vorab-Frage einmalig. Der Zustand ist geräteweit (ein
// gesperrtes Mikro ist überall gesperrt) und lebt nur im Speicher der Seite –
// beim Zurückkommen in die App wird neu geprüft.

export type MicPlatform = "ios" | "android" | "andere";
/** gesperrt = Mikrofon nicht erlaubt; diktat_aus = iPhone-Diktierfunktion aus */
export type MicBlock = "gesperrt" | "diktat_aus";

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
 * Fehler einordnen: getUserMedia „NotAllowedError“/„SecurityError“ und die
 * Spracherkennung „not-allowed“ = gesperrt; „service-not-allowed“ heißt auf
 * dem iPhone meist „Diktieren ist aus“, sonst ebenfalls gesperrt.
 */
export function classifyMicError(error: string, platform: MicPlatform): MicBlock | null {
  if (error === "service-not-allowed") return platform === "ios" ? "diktat_aus" : "gesperrt";
  if (error === "not-allowed" || error === "NotAllowedError" || error === "SecurityError" || error === "PermissionDeniedError") return "gesperrt";
  return null;
}

const device = (p: MicPlatform) => (p === "ios" ? "dein iPhone" : "dein Handy");

/** Vorab-Sheet „Darf ich zuhören?“ */
export function preAskText(p: MicPlatform): { title: string; text: string; allow: string } {
  return { title: "Darf ich zuhören?", text: `Gleich fragt ${device(p)} nach dem Mikrofon. Tippe dann auf „${p === "ios" ? "Erlauben" : "Zulassen"}“.`, allow: p === "ios" ? "Erlauben" : "Zulassen" };
}

/** Symbol eines Schritts (nachgebaut, kein Foto) */
export type StepIcon = "zahnrad" | "apps" | "safari" | "mikro" | "erlauben" | "regler" | "berechtigungen" | "allgemein" | "tastatur" | "diktat";

/** Ein Schritt mit nachgebautem Bildschirm: Titel oben, Zeilen, die gesuchte ist markiert */
export type MicStep = { text: string; icon: StepIcon; screen: { title: string; rows: string[]; target: number } };

/**
 * Schritte zum Anmachen. iOS 18 und neuer: Einstellungen → Apps → Safari →
 * Mikrofon (Abschnitt „Einstellungen für Websites“); bis iOS 17 ohne „Apps“.
 * Android/Chrome: Symbol links neben der Adresse → Berechtigungen → Mikrofon.
 */
export function micSteps(p: MicPlatform, block: MicBlock, ios: number | null, host = "wasgibts.app"): MicStep[] {
  if (block === "diktat_aus")
    return [
      { text: "Öffne die App „Einstellungen“", icon: "zahnrad", screen: { title: "Home-Bildschirm", rows: ["Fotos", "Kamera", "Einstellungen", "Uhr"], target: 2 } },
      { text: "Tippe auf „Allgemein“", icon: "allgemein", screen: { title: "Einstellungen", rows: ["WLAN", "Bluetooth", "Allgemein", "Bedienungshilfen"], target: 2 } },
      { text: "Tippe auf „Tastatur“", icon: "tastatur", screen: { title: "Allgemein", rows: ["Info", "Softwareupdate", "Datum & Uhrzeit", "Tastatur"], target: 3 } },
      { text: "Schalte „Diktierfunktion“ ein", icon: "diktat", screen: { title: "Tastaturen", rows: ["Tastaturen", "Auto-Korrektur", "Diktierfunktion"], target: 2 } },
    ];
  if (p === "android")
    return [
      { text: "Tippe oben links neben der Adresse auf das Symbol (Schieberegler oder Schloss)", icon: "regler", screen: { title: "Chrome", rows: [`⊶  ${host}`, "Seite"], target: 0 } },
      { text: "Tippe auf „Berechtigungen“", icon: "berechtigungen", screen: { title: host, rows: ["Verbindung ist sicher", "Berechtigungen", "Cookies"], target: 1 } },
      { text: "Tippe auf „Mikrofon“", icon: "mikro", screen: { title: "Berechtigungen", rows: ["Mikrofon", "Benachrichtigungen"], target: 0 } },
      { text: "Wähle „Zulassen“", icon: "erlauben", screen: { title: "Mikrofon", rows: ["Zulassen", "Nicht zulassen"], target: 0 } },
    ];
  const withApps = ios === null || ios >= 18;
  return [
    { text: "Öffne die App „Einstellungen“ (graues Zahnrad)", icon: "zahnrad", screen: { title: "Home-Bildschirm", rows: ["Fotos", "Kamera", "Einstellungen", "Uhr"], target: 2 } },
    withApps
      ? { text: "Tippe ganz unten auf „Apps“, dann „Safari“", icon: "apps", screen: { title: "Apps", rows: ["Kalender", "Nachrichten", "Safari", "Wetter"], target: 2 } }
      : { text: "Tippe auf „Safari“ (blauer Kompass)", icon: "safari", screen: { title: "Einstellungen", rows: ["Passwörter", "Mail", "Safari", "Wetter"], target: 2 } },
    { text: "Ganz unten bei „Einstellungen für Websites“: „Mikrofon“", icon: "mikro", screen: { title: "Safari", rows: ["Seitenzoom", "Kamera", "Mikrofon", "Standort"], target: 2 } },
    { text: "Wähle „Erlauben“", icon: "erlauben", screen: { title: "Mikrofon", rows: ["Fragen", "Ablehnen", "Erlauben"], target: 2 } },
  ];
}

// --- Zustand (geräteweit, nur im Speicher) -------------------------------------------------

type MicSheet = { kind: "fragen"; then: () => void } | { kind: "hilfe"; block: MicBlock } | null;
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

/** Mikro gesperrt (Fehler beim Zuhören/Aufnehmen) – Hilfe öffnen */
export function reportMicBlocked(block: MicBlock) {
  set({ block, granted: false, sheet: { kind: "hilfe", block }, origin: state.origin ?? focused() });
}

/** Bekannter Stand der Freigabe (aus navigator.permissions) */
export function setMicPermission(permission: "granted" | "denied" | "prompt") {
  if (permission === "granted") set({ granted: true, block: null, justOn: state.block === "gesperrt" });
  else if (permission === "denied") set({ granted: false, block: state.block ?? "gesperrt" });
  else if (state.block === "gesperrt") set({ block: null, granted: false });
}

export const openMicHelp = () => set({ sheet: { kind: "hilfe", block: state.block ?? "gesperrt" }, origin: focused() });
export const closeMicSheet = () => set({ sheet: null });
export const clearMicJustOn = () => set({ justOn: false });

/**
 * Vor dem Zuhören: gesperrt → Hilfe; beim allerersten Mal (noch nie gefragt,
 * Freigabe unbekannt) erst „Darf ich zuhören?“; sonst sofort `start`.
 * Muss im Tipp aufgerufen werden (das Sheet ruft `start` im nächsten Tipp).
 */
export function guardMic(start: () => void, askedBefore: boolean) {
  if (state.block) return set({ sheet: { kind: "hilfe", block: state.block }, origin: focused() });
  if (!askedBefore && !state.granted) return set({ sheet: { kind: "fragen", then: start }, origin: focused() });
  set({ origin: focused() });
  start();
}

/** Nur für Tests @public */
export const resetMicState = () => set({ block: null, granted: false, sheet: null, justOn: false, origin: null });
