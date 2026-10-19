"use client";

// Sport aus der Oberfläche oder von Lotte: eintragen (still, Zurücknehmen für
// "Mach das rückgängig"), ändern, löschen (Gelöscht · Rückgängig), Ziel
// setzen. Die Feier beim Wochenziel macht `SportCelebration` (beobachtet die
// Zahl der Trainings) – egal, woher das Training kommt.

import { pushUndo } from "../core/undo";
import { updateEntry } from "../core/entries";
import { createTraining, type Training, type TrainingData } from "./model";
import { changeSport } from "./store";

export function addTraining(data: TrainingData, label = "das Eintragen des Trainings"): { training: Training; undo: () => void } {
  const training = createTraining(data);
  const undo = pushUndo(label, changeSport((s) => ({ ...s, trainings: [...s.trainings, training] })));
  return { training, undo };
}

/** Ändern; ein Training aus einem Sport-Termin wird dabei zu einem eigenen (mit Bezug auf den Termin) */
export function updateTraining(training: Training, patch: Partial<TrainingData>): () => void {
  if (training.id.startsWith("termin:")) return addTraining({ ...training.data, ...patch }, "das Ändern des Trainings").undo;
  return pushUndo(
    "das Ändern des Trainings",
    changeSport((s) => ({ ...s, trainings: s.trainings.map((t) => (t.id === training.id ? (updateEntry(t, patch) as Training) : t)) })),
  );
}

/** Löschen (bei Sport-Terminen: zählt dann nicht mehr; der Termin bleibt) */
export function removeTraining(training: Training): () => void {
  const key = training.data.terminKey;
  return pushUndo(
    "das Löschen des Trainings",
    changeSport((s) => ({
      ...s,
      trainings: s.trainings.filter((t) => t.id !== training.id),
      hidden: key ? [...new Set([...s.hidden, key])] : s.hidden,
    })),
  );
}

export function setSportGoal(goal: number): () => void {
  const g = Math.min(7, Math.max(1, Math.round(goal)));
  return pushUndo("das Ändern des Wochenziels", changeSport((s) => ({ ...s, goal: g })));
}

export function setPack(sport: string, items: string[]): () => void {
  return pushUndo("das Ändern der Packliste", changeSport((s) => ({ ...s, packs: { ...s.packs, [sport]: items.map((i) => i.trim()).filter(Boolean).slice(0, 12) } })));
}
