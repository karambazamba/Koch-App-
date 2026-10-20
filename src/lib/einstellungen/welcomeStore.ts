// Ergebnis des ersten Starts (`wasgibts.willkommen`): es bleibt nur, wobei
// geholfen werden soll (steuert z. B. den Raum "Arbeit"). Ein Zwischenstand
// des früheren Kennenlernens (bis v0.26) wird nicht mehr gebraucht und
// verworfen – "help" bleibt erhalten. "Neu anfangen" löscht es mit.

import { loadRoutine, saveRoutine } from "../tagesablauf/settings";
import { loadSport, saveSport } from "../sport/store";
import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { DEFAULT_HOME, saveHomeTiles } from "../core/homeLayout";
import { setFeature } from "../core/features";
import { clearDemoStore, startDemo } from "../core/demo";
import { saveProfile } from "./profileStore";
import { homeTilesFor, profileFrom, startState, type HelpId, type WelcomeState } from "./welcome";

type WelcomeStore = { version: 1; state: null; help: HelpId[] | null };

const store = createLocalStore("wasgibts.willkommen", (raw: unknown): WelcomeStore | null => {
  if (!raw || typeof raw !== "object" || (raw as WelcomeStore).version !== 1) return null;
  const d = raw as WelcomeStore;
  return { version: 1, state: null, help: Array.isArray(d.help) ? d.help : null };
});

/** Profil, Startseite und passende Bausteine speichern */
function finishWelcome(state: WelcomeState) {
  saveProfile(profileFrom(state));
  saveHomeTiles(homeTilesFor(state.help));
  if (state.help.includes("essen") && state.planStyle === "plan") setFeature("wochenplan", true);
  if (state.help.includes("essen") && state.planStyle === "spontan") setFeature("spontan", true);
  // Startseite mitdenkend oder immer gleich; Sport mit Wochenziel
  saveRoutine({ ...loadRoutine(), mode: state.homeMode === "gleich" ? "gleich" : "mitdenkend" });
  if (state.help.includes("sport")) saveSport({ ...loadSport(), goal: state.sportGoal ?? 3 });
  store.save({ version: 1, state: null, help: state.help });
}

/**
 * Erster Start ("Los geht's" auf dem Hallo-Bildschirm): ohne weitere Fragen
 * Standardwerte, Startseite wie im Beispiel-Tag (Pinnwand + Wetter klein
 * nebeneinander, Termine, Aufgaben, Essen + Einkauf) und die Beispiele.
 */
export function startFresh() {
  finishWelcome(startState());
  saveHomeTiles(DEFAULT_HOME.map((t) => (t.id === "pinnwand" || t.id === "wetter" ? { ...t, visible: true, size: "S" } : t)));
  startDemo();
}

/** "Neu anfangen": erster Start beginnt von vorn (auch die Beispiele) */
export function clearWelcome() {
  store.clear();
  clearDemoStore();
}

/** Raum "Arbeit" an? Ohne Ergebnis (bestehende Nutzer) immer an */
export function useWorkRoom(): boolean {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  const help = data?.help;
  return !help || help.includes("arbeit");
}

/** Erster Start abgeschlossen (für den einmaligen Startseiten-Hinweis) */
export function useWelcomeFinished(): boolean {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  return Boolean(data?.help);
}
