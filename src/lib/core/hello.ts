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
