"use client";

// Küchenhelfer in der App: Anfrage an den Server, Übernehmen/Rückgängig und
// Sprachausgabe. Geändert wird erst beim Übernehmen – über dieselben reinen
// Funktionen, mit denen auch die Vorschau rechnet.

import { useEffect, useState } from "react";
import { replaceRecipes } from "../cookbook";
import { replaceMealPlans } from "../mealPlan";
import { replaceShoppingLists } from "../shoppingList";
import { addDays, replaceWeekPlans } from "../weekPlan";
import { applyOps, selectedOps, type AssistantData, type ChangeOp } from "./ops";
import { ASSISTANT_ENDPOINT, type AssistantError, type AssistantReply, type AssistantStatus, type ChatTurn } from "./protocol";

const DEVICE_KEY = "wasgibts.geraet";
const VOICE_KEY = "wasgibts.kuechenhelfer.vorlesen";

function deviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `geraet-${Math.random().toString(36).slice(2, 14)}`;
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "geraet-ohne-speicher";
  }
}

let statusPromise: Promise<AssistantStatus> | null = null;

/** Ist die KI eingerichtet? (`undefined` = wird geprüft) */
export function useAssistantStatus(enabled: boolean): AssistantStatus | undefined {
  const [status, setStatus] = useState<AssistantStatus>();
  useEffect(() => {
    if (!enabled) return;
    statusPromise ??= fetch(ASSISTANT_ENDPOINT, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<AssistantStatus>) : { configured: false, mock: false }))
      .catch(() => {
        statusPromise = null; // offline: später erneut prüfen
        return { configured: false, mock: false };
      });
    let active = true;
    statusPromise.then((s) => active && setStatus(s));
    return () => {
      active = false;
    };
  }, [enabled]);
  return status;
}

/** Nur die Wochen ab letzter Woche mitschicken – hält die Anfrage klein */
function trimmed(data: AssistantData, currentWeekStart: string): AssistantData {
  const from = addDays(currentWeekStart, -7);
  const pick = <T,>(weeks: Record<string, T>) => Object.fromEntries(Object.entries(weeks).filter(([k]) => k >= from));
  return { ...data, weekPlans: pick(data.weekPlans), mealPlans: pick(data.mealPlans), shopping: {} };
}

export async function askAssistant(
  messages: ChatTurn[],
  pending: ChangeOp[],
  data: AssistantData,
  today: string,
  currentWeekStart: string,
): Promise<AssistantReply> {
  let response: Response;
  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), today, messages, pending, data: trimmed(data, currentWeekStart) }),
    });
  } catch {
    throw new Error("Keine Verbindung – der Küchenhelfer braucht Internet.");
  }
  const body = (await response.json().catch(() => null)) as AssistantReply | AssistantError | null;
  if (!response.ok || !body || "error" in body) {
    throw new Error(body && "error" in body ? body.error : "Da ist etwas schiefgelaufen. Bitte noch einmal versuchen.");
  }
  return body;
}

function save(data: AssistantData, before: AssistantData) {
  if (data.mealPlans !== before.mealPlans) replaceMealPlans(data.mealPlans);
  if (data.weekPlans !== before.weekPlans) replaceWeekPlans(data.weekPlans);
  if (data.recipes !== before.recipes) replaceRecipes(data.recipes);
  if (data.shopping !== before.shopping) replaceShoppingLists(data.shopping);
}

/** Ausgewählte Änderungen übernehmen; liefert eine Funktion zum Rückgängigmachen */
export function commitOps(current: AssistantData, ops: ChangeOp[], selected: Set<string>, prompt: string): () => void {
  const { data } = applyOps(current, selectedOps(ops, selected), { prompt });
  save(data, current);
  return () => save(current, data);
}

// --- Sprachausgabe ------------------------------------------------------------

export function voiceSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoicePreference(): boolean {
  try {
    return localStorage.getItem(VOICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveVoicePreference(on: boolean) {
  try {
    localStorage.setItem(VOICE_KEY, on ? "1" : "0");
  } catch {
    // ohne Speicher gilt die Einstellung nur bis zum Neuladen
  }
}

export function speak(text: string) {
  if (!voiceSupported()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  const voice = window.speechSynthesis.getVoices().find((v) => v.lang.startsWith("de"));
  if (voice) utterance.voice = voice;
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (voiceSupported()) window.speechSynthesis.cancel();
}
