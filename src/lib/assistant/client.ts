"use client";

// Küchenhelfer in der App: Anfrage an den Server, Übernehmen/Rückgängig und
// Sprachausgabe. Geändert wird erst beim Übernehmen – über dieselben reinen
// Funktionen, mit denen auch die Vorschau rechnet.

import { useEffect, useState } from "react";
import { replaceRecipes } from "../cookbook";
import { replaceMealPlans } from "../mealPlan";
import { effectivePlanStyle } from "../profile";
import { replaceShoppingLists } from "../shoppingList";
import type { HelperVoice } from "../profile";
import { addDays, replaceWeekPlans, weekStartFor } from "../weekPlan";
import { applyOps, selectedOps, type AssistantData, type ChangeOp } from "./ops";
import { ASSISTANT_ENDPOINT, type AssistantError, type AssistantReply, type AssistantStatus, type ChatTurn } from "./protocol";

const DEVICE_KEY = "wasgibts.geraet";
const VOICE_KEY = "wasgibts.kuechenhelfer.vorlesen";

export function deviceId(): string {
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
  tipsThisWeek = 0,
): Promise<AssistantReply> {
  let response: Response;
  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId(), today, messages, pending, data: trimmed(data, currentWeekStart), tipsThisWeek }),
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

function markSpontan(after: AssistantData["mealPlans"], before: AssistantData["mealPlans"]): AssistantData["mealPlans"] {
  return Object.fromEntries(
    Object.entries(after).map(([week, entries]) => [
      week,
      Object.fromEntries(
        Object.entries(entries).map(([day, e]) =>
          (e.kind === "recipe" || e.kind === "text") && JSON.stringify(before[week]?.[day]) !== JSON.stringify(e) ? [day, { ...e, spontan: true }] : [day, e],
        ),
      ),
    ]),
  );
}

function save(data: AssistantData, before: AssistantData) {
  if (data.mealPlans !== before.mealPlans) replaceMealPlans(data.mealPlans);
  if (data.weekPlans !== before.weekPlans) replaceWeekPlans(data.weekPlans);
  if (data.recipes !== before.recipes) replaceRecipes(data.recipes);
  if (data.shopping !== before.shopping) replaceShoppingLists(data.shopping);
}

/** Ausgewählte Änderungen übernehmen; liefert eine Funktion zum Rückgängigmachen */
export function commitOps(current: AssistantData, ops: ChangeOp[], selected: Set<string>, prompt: string): () => void {
  const applied = applyOps(current, selectedOps(ops, selected), { prompt }).data;
  // Spontan: neue Gerichte gelten als "aus den Ideen gewählt" – sonst wären sie im ausgeblendeten Plan unsichtbar
  const spontan = effectivePlanStyle(current.profile, weekStartFor(new Date(), current.profile.shoppingDay || "Montag")) === "spontan";
  const data = spontan ? { ...applied, mealPlans: markSpontan(applied.mealPlans, current.mealPlans) } : applied;
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

// Bekannte deutsche Systemstimmen (iOS, macOS, Android/Chrome, Windows/Edge).
// Die Web Speech API kennt kein Geschlecht – daher über den Namen.
const FEMALE = /anna|petra|helena|katja|marlene|vicki|hedda|amala|seraphina|louisa|tanja|elke|gisela|ingrid|klara|maja|frauke|sabine|female|weiblich|google deutsch/i;
const MALE = /markus|yannick|viktor|hans|conrad|stefan|killian|florian|martin|ralf|bernd|kasper|klaus|\bmale\b|männlich|maennlich/i;

/** Passende deutsche Stimme für "weiblich"/"männlich", sonst irgendeine deutsche, sonst Standard */
export function pickVoice(voices: SpeechSynthesisVoice[], voice: HelperVoice): SpeechSynthesisVoice | null {
  const german = voices.filter((v) => v.lang.toLowerCase().startsWith("de"));
  const wanted = voice === "maennlich" ? MALE : FEMALE;
  const other = voice === "maennlich" ? FEMALE : MALE;
  return (
    german.find((v) => wanted.test(v.name)) ??
    german.find((v) => !other.test(v.name)) ??
    german[0] ??
    null
  );
}

/** Vorlesen – Fehler der Sprachausgabe dürfen den Chat nie stören */
export function speak(text: string, voice: HelperVoice = "weiblich") {
  if (!voiceSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    const chosen = pickVoice(window.speechSynthesis.getVoices(), voice);
    try {
      if (chosen) utterance.voice = chosen;
    } catch {
      // Stimme nicht setzbar → Standardstimme
    }
    window.speechSynthesis.speak(utterance);
  } catch {
    // Sprachausgabe nicht verfügbar – einfach nicht vorlesen
  }
}

export function stopSpeaking() {
  if (voiceSupported()) window.speechSynthesis.cancel();
}
