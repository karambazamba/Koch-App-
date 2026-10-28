// Ergebnis des ersten Starts (`wasgibts.willkommen`): es bleibt nur, wobei
// geholfen werden soll (steuert z. B. den Raum "Arbeit"). Ein Zwischenstand
// des früheren Kennenlernens (bis v0.26) wird nicht mehr gebraucht und
// verworfen – "help" bleibt erhalten. "Neu anfangen" löscht es mit.

import { loadSport, saveSport } from "@/lib/sport/store";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { DEFAULT_HOME, saveHomeTiles } from "@/lib/core/homeLayout";
import { setFeature } from "@/lib/core/features";
import { clearDemoStore, startDemo } from "@/lib/core/demo";
import { loadProfile, saveProfile } from "@/lib/einstellungen/profileStore";
import { HOUSEHOLD_FOR, type Haushalt } from "@/lib/core/haushalt";
import type { AppLook } from "@/lib/einstellungen/profile";
import { homeTilesFor, profileFrom, startState, type HelpId, type WelcomeState } from "@/lib/einstellungen/welcome";

type WelcomeStore = { version: 1; state: null; help: HelpId[] | null };

const store = createLocalStore("wasgibts.willkommen", (raw: unknown): WelcomeStore | null => {
  if (!raw || typeof raw !== "object" || (raw as WelcomeStore).version !== 1) return null;
  const d = raw as WelcomeStore;
  return { version: 1, state: null, help: Array.isArray(d.help) ? d.help : null };
});

/** Profil, Startseite und passende Bausteine speichern */
function finishWelcome(state: WelcomeState, look: AppLook = "farbig") {
  saveProfile({ ...profileFrom(state), look });
  saveHomeTiles(homeTilesFor(state.help));
  if (state.help.includes("essen") && state.planStyle === "plan") setFeature("wochenplan", true);
  if (state.help.includes("essen") && state.planStyle === "spontan") setFeature("spontan", true);
  // Sport mit Wochenziel
  if (state.help.includes("sport")) saveSport({ ...loadSport(), goal: state.sportGoal ?? 3 });
  store.save({ version: 1, state: null, help: state.help });
}

/**
 * Erster Start ("Los geht's" auf dem Hallo-Bildschirm, danach höchstens die
 * eine Frage nach dem Look – Standard „Farbig“): sonst Standardwerte, die Standard-Startseite (Pinnwand + Wetter klein
 * nebeneinander, Termine, Aufgaben, Essen + Einkauf) und die Beispiele darin.
 */
export function startFresh(look: AppLook = "farbig", haushalt: Haushalt = "familie") {
  finishWelcome(startState(), look);
  const profile = loadProfile();
  if (profile) saveProfile({ ...profile, householdType: HOUSEHOLD_FOR[haushalt] });
  // Allein: Pinnwand aus (Baustein und Kachel, zuschaltbar), zu zweit und Familie an
  saveHomeTiles(haushalt === "allein" ? DEFAULT_HOME.map((t) => (t.id === "pinnwand" ? { ...t, visible: false } : t)) : DEFAULT_HOME);
  setFeature("pinnwand", haushalt !== "allein");
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
