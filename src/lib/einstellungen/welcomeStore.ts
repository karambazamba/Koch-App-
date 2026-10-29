// Ergebnis des ersten Starts (`wasgibts.willkommen`): es bleibt nur, wobei
// geholfen werden soll (steuert z. B. den Raum "Arbeit"). Ein Zwischenstand
// des früheren Kennenlernens (bis v0.26) wird nicht mehr gebraucht und
// verworfen – "help" bleibt erhalten. "Neu anfangen" löscht es mit.

import { loadSport, saveSport } from "@/lib/sport/store";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { STANDARD_KREISE } from "@/lib/heute/kreise";
import { ersteStartseite, saveHomeTiles, saveKreise } from "@/lib/core/homeLayout";
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
 * Erster Start ("Los geht's" auf dem Hallo-Bildschirm, „Für wen soll ich
 * sortieren?“): sonst Standardwerte, die Standard-Startseite des Haushalts
 * (Tafel 140, A-050: oben die Mini-Kreise Sport · Pause · Was los? · Timer (A-064),
 * dann Familie / zu zweit Wetter XS über Notizen XS | Pinnwand S, allein
 * Wetter XS über Notizen XS | Wundertüte S; dann Termine, Aufgaben, Essen,
 * Einkauf breit) und die Beispiele darin.
 */
export function startFresh(look: AppLook = "farbig", haushalt: Haushalt = "familie", name = "") {
  finishWelcome(startState(), look);
  const profile = loadProfile();
  // Name aus „Wie sollen dich die anderen sehen?“ (Anmelden ohne Profil, A-042): gleich ins neue Profil, nie zweimal fragen
  const eigener = name.trim().slice(0, 40);
  if (profile) saveProfile({ ...profile, householdType: HOUSEHOLD_FOR[haushalt], persons: eigener ? profile.persons.map((p, i) => (i === 0 ? { ...p, name: eigener } : p)) : profile.persons });
  // Allein: Pinnwand aus (Baustein und Kachel, zuschaltbar); zu zweit und Familie mit Pinnwand.
  // Sport für alle an: der Sport-Kreis steht oben im Standard (Tafel 140/143), Kreise in Standard-Reihenfolge
  saveHomeTiles(ersteStartseite(haushalt));
  saveKreise(STANDARD_KREISE);
  setFeature("pinnwand", haushalt !== "allein");
  setFeature("sport", true);
  // Mias Wundertüte: für neue Nutzer an (auch nach „Neu anfangen“), als S-Kachel im Standard
  setFeature("wundertuete", true);
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
