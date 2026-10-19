// Zwischenstand und Ergebnis des Kennenlernens (`wasgibts.willkommen`):
// nach jeder Antwort gespeichert (App zu → geht an derselben Stelle weiter),
// beim Abschluss bleibt nur, wobei geholfen werden soll (steuert z. B. den
// Raum "Arbeit"). "Neu anfangen" löscht es mit.

import { loadRoutine, saveRoutine } from "../tagesablauf/settings";
import { loadSport, saveSport } from "../sport/store";
import { createLocalStore } from "../core/localStore";
import { useExternalStore } from "../core/useExternalStore";
import { saveHomeTiles } from "../core/homeLayout";
import { setFeature } from "../core/features";
import { saveProfile } from "./profile";
import { homeTilesFor, migrateWelcome, profileFrom, type HelpId, type WelcomeState } from "./welcome";

type WelcomeStore = { version: 1; state: WelcomeState | null; help: HelpId[] | null };

const store = createLocalStore("wasgibts.willkommen", (raw: unknown): WelcomeStore | null => {
  if (!raw || typeof raw !== "object" || (raw as WelcomeStore).version !== 1) return null;
  const d = raw as WelcomeStore;
  // Zwischenstand aus v0.14 (Chat-Verlauf) wird übernommen
  const state = migrateWelcome(d.state);
  return { version: 1, state, help: Array.isArray(d.help) ? d.help : null };
});

export function loadWelcomeState(): WelcomeState | null {
  return store.load()?.state ?? null;
}

export function saveWelcomeState(state: WelcomeState) {
  store.save({ version: 1, state, help: store.load()?.help ?? null });
}

/** Fertig (oder übersprungen): Profil, Startseite und passende Bausteine speichern */
export function finishWelcome(state: WelcomeState) {
  saveProfile(profileFrom(state));
  saveHomeTiles(homeTilesFor(state.help));
  if (state.help.includes("essen") && state.planStyle === "plan") setFeature("wochenplan", true);
  if (state.help.includes("essen") && state.planStyle === "spontan") setFeature("spontan", true);
  // Startseite mitdenkend oder immer gleich; Sport mit Wochenziel
  saveRoutine({ ...loadRoutine(), mode: state.homeMode === "gleich" ? "gleich" : "mitdenkend" });
  if (state.help.includes("sport")) saveSport({ ...loadSport(), goal: state.sportGoal ?? 3 });
  store.save({ version: 1, state: null, help: state.help });
}

/** "Neu anfangen": Kennenlernen beginnt von vorn */
export function clearWelcome() {
  store.clear();
}

/** Raum "Arbeit" an? Ohne Kennenlernen-Ergebnis (bestehende Nutzer) immer an */
export function useWorkRoom(): boolean {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  const help = data?.help;
  return !help || help.includes("arbeit");
}

/** Kennenlernen abgeschlossen (für den einmaligen Startseiten-Hinweis) */
export function useWelcomeFinished(): boolean {
  const data = useExternalStore(store.subscribe, store.load, () => null);
  return Boolean(data?.help);
}
