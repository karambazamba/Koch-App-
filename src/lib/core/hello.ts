// Hallo-Bildschirm: einmal pro Laden. `elapsed` merkt sich, wie weit die
// Begrüßung ist – wird der Bildschirm (z. B. beim Laden der
// gespeicherten Daten) neu aufgebaut, läuft sie dort weiter, statt von vorn
// zu beginnen (kein doppeltes Aufploppen). `flight` = wo Mia beim
// "Los geht’s" saß; die Jetzt-Karte holt sie dort ab (gemeinsames Element).

type Rect = { x: number; y: number; size: number };

let elapsed = 0;
let shown = false;

/** Hallo-Bildschirm war schon zu sehen – Startseite/Profil bleiben dabei, bis es ein Profil gibt (kein Wechsel über "lädt noch") */
export const helloWasShown = () => shown;
export const markHelloShown = () => {
  shown = true;
};
let flight: Rect | null = null;

/** Wie weit die Begrüßung schon ist (ms) – ein Neuaufbau setzt hier fort */
export const helloElapsed = () => elapsed;
export const setHelloElapsed = (ms: number) => {
  elapsed = ms;
};

export const reducedMotion = () => typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);

/** "Los geht’s": Mias Platz merken (ohne Bewegung reduzieren) */
export function setHelloFlight(rect: Rect | null) {
  flight = reducedMotion() ? null : rect;
}

/** Einmal abholen (die Jetzt-Karte beim ersten Zeichnen) */
export function takeHelloFlight(): Rect | null {
  const f = flight;
  flight = null;
  return f;
}

/** Zeitplan der Begrüßung (ms ab Mias Aufploppen): Freudensprung bei 2,0 s, dauert 2,8 s */
export const HELLO_T = { title: 950, sub: 1800, buttons: 2200, jump: 2000 } as const;
export const HELLO_JUMP_MS = 2800;
/** Sprechblase „Ich bin bereit!“ ab 1,05 s im Sprung, bleibt 2,5 s */
export const HELLO_BUBBLE = { from: 1050, ms: 2500 } as const;
/** Mias Sätze auf dem Hallo-Bildschirm (Sprung und Antippen) */
export const HELLO_READY = "Ich bin bereit!";
export const HELLO_TAPS = ["Hihi, kitzelig!", "Bereit, wenn du es bist!", "Hihi!", "Los geht’s?"] as const;

/** Satz beim n-ten Antippen: zuerst „Hihi, kitzelig!“, danach die übrigen im Wechsel */
export const helloTapText = (n: number) => (n === 0 ? HELLO_TAPS[0] : HELLO_TAPS[1 + ((n - 1) % (HELLO_TAPS.length - 1))]);

/** Was im Sprung gerade passiert (für Blase und „Los geht’s“-Puls); `skip` = Sprung lief schon */
export function helloJump(at: number, skip: boolean): { on: boolean; bubble: boolean; nudge: 0 | 1 | 2 } {
  const t = at - HELLO_T.jump;
  if (skip || t < 0) return { on: false, bubble: false, nudge: 0 };
  const bubble = t >= HELLO_BUBBLE.from && t < HELLO_BUBBLE.from + HELLO_BUBBLE.ms;
  const nudge = t >= 2150 && t < 2550 ? 1 : t >= 2800 && t < 3200 ? 2 : 0;
  return { on: t < HELLO_JUMP_MS, bubble, nudge };
}

