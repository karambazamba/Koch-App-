"use client";

// Küchenhelfer in der App: Anfrage an den Server, Übernehmen/Rückgängig und
// Sprachausgabe. Geändert wird erst beim Übernehmen – über dieselben reinen
// Funktionen, mit denen auch die Vorschau rechnet.

import { useEffect, useState } from "react";
import { replaceAppointments, loadAppointments } from "../appointments";
import { replaceRecipes } from "../cookbook";
import { replaceMealPlans } from "../mealPlan";
import { effectivePlanStyle } from "../profile";
import { addPantryItems, loadPantry, replacePantry } from "../pantry";
import { replaceShoppingLists } from "../shoppingList";
import { addWish, loadWishes, restoreWishes } from "../wishes";
import type { HelperVoice } from "../profile";
import { replaceWeekPlans, toIsoDate, weekStartFor } from "../weekPlan";
import { applyOps, selectedOps, type AssistantData, type ChangeOp } from "./ops";
import {
  ACCESS_HEADER,
  ASSISTANT_ENDPOINT,
  LIMITS,
  type AssistantError,
  type AssistantErrorCode,
  type AssistantReply,
  type AssistantStatus,
  type ChatTurn,
} from "./protocol";

const DEVICE_KEY = "wasgibts.geraet";
const VOICE_KEY = "wasgibts.kuechenhelfer.vorlesen";
const CODE_KEY = "wasgibts.zugangscode";
const COUNT_KEY = "wasgibts.lotte.anfragen";

/** Was Lotte sagt, wenn die KI gerade nicht kann – nie Technik-Wörter */
export const FALLBACK_TEXT = "Gerade kann ich dich nicht richtig verstehen – tipp es mir kurz anders ein.";

/** KI gerade nicht erreichbar (offline, aus, Limit, falscher Code …) */
export class LotteUnavailable extends Error {
  constructor(public reason: AssistantErrorCode | "offline") {
    super(FALLBACK_TEXT);
  }
}

// --- Zugangscode ----------------------------------------------------------------

const codeListeners = new Set<() => void>();

export function loadAccessCode(): string {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeAccessCode(code: string) {
  try {
    if (code) localStorage.setItem(CODE_KEY, code);
    else localStorage.removeItem(CODE_KEY);
  } catch {
    // ohne Speicher gilt der Code nur bis zum Neuladen
  }
  statusPromise = null;
  codeListeners.forEach((l) => l());
}

/** Code einmal prüfen und merken; liefert, ob er stimmt (null = keine Verbindung) */
export async function saveAccessCode(code: string): Promise<boolean | null> {
  const trimmed = code.trim();
  if (!trimmed) return false;
  try {
    const r = await fetch(ASSISTANT_ENDPOINT, { cache: "no-store", headers: { [ACCESS_HEADER]: trimmed } });
    const s = (await r.json()) as AssistantStatus;
    if (s.access !== "ok") return false;
  } catch {
    return null;
  }
  storeAccessCode(trimmed);
  return true;
}

export function forgetAccessCode() {
  storeAccessCode("");
}

// --- Tageslimit pro Gerät -----------------------------------------------------------

function todayCount(): { day: string; n: number } {
  const day = toIsoDate(new Date());
  try {
    const saved = JSON.parse(localStorage.getItem(COUNT_KEY) ?? "null") as { day: string; n: number } | null;
    return saved?.day === day ? saved : { day, n: 0 };
  } catch {
    return { day, n: 0 };
  }
}

/**
 * Eine KI-Anfrage zählen – gemeinsames Tageslimit für alle KI-Aufrufe der App
 * (Lotte, Kennenlernen). false = Limit für heute erreicht, nicht fragen.
 */
export function takeAiSlot(): boolean {
  const c = todayCount();
  if (c.n >= LIMITS.dailyPerDevice) return false;
  try {
    localStorage.setItem(COUNT_KEY, JSON.stringify({ day: c.day, n: c.n + 1 }));
  } catch {
    // ohne Speicher zählt nur der Server
  }
  return true;
}

/** Header für KI-Anfragen: gemerkter Zugangscode, falls vorhanden */
export function accessHeaders(): Record<string, string> {
  const code = loadAccessCode();
  return code ? { [ACCESS_HEADER]: code } : {};
}

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
const OFF: AssistantStatus = { configured: false, mock: false, needsCode: false };

/** KI-Status inkl. Code-Prüfung; Ergebnis wird geteilt */
function fetchStatus(): Promise<AssistantStatus> {
  const code = loadAccessCode();
  statusPromise ??= fetch(ASSISTANT_ENDPOINT, { cache: "no-store", headers: code ? { [ACCESS_HEADER]: code } : {} })
    .then((r) => (r.ok ? (r.json() as Promise<AssistantStatus>) : OFF))
    .then((s) => {
      // Gemerkter Code stimmt nicht mehr (z. B. geändert) → neu fragen
      if (s.access === "falsch") {
        try {
          localStorage.removeItem(CODE_KEY);
        } catch {}
      }
      return s;
    })
    .catch(() => {
      statusPromise = null; // offline: später erneut prüfen
      return OFF;
    });
  return statusPromise;
}

/** Darf die App die KI gerade fragen? (eingerichtet und – falls verlangt – Code gemerkt) */
export async function aiUsable(): Promise<boolean> {
  const s = await fetchStatus();
  return s.configured && (!s.needsCode || s.access === "ok");
}

export type LotteStatus = AssistantStatus & {
  /** Die KI kann gefragt werden (eingerichtet und – falls verlangt – Code gemerkt) */
  ready: boolean;
  /** Der Zugangscode wird noch gebraucht */
  askCode: boolean;
};

/** Ist die KI eingerichtet und freigeschaltet? (`undefined` = wird geprüft) */
export function useAssistantStatus(enabled: boolean): LotteStatus | undefined {
  const [status, setStatus] = useState<AssistantStatus>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    codeListeners.add(onChange);
    return () => {
      codeListeners.delete(onChange);
    };
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fetchStatus().then((s) => active && setStatus(s));
    return () => {
      active = false;
    };
  }, [enabled, version]);
  if (!status) return undefined;
  const hasCode = status.access === "ok" || (!status.needsCode && status.configured);
  return { ...status, ready: status.configured && hasCode, askCode: status.configured && status.needsCode && status.access !== "ok" };
}

/**
 * Nur das Nötige mitschicken: Profil, diese und nächste Woche, Kochbuch ohne
 * Zubereitungsschritte und der Vorrat – keine Einkaufslisten, keine alten Wochen.
 */
function trimmed(data: AssistantData, currentWeekStart: string, pantry: AssistantData["pantry"]): AssistantData {
  const pick = <T,>(weeks: Record<string, T>) => Object.fromEntries(Object.entries(weeks).filter(([k]) => k >= currentWeekStart));
  const recipes = Object.fromEntries(
    Object.entries(data.recipes)
      .slice(0, 150)
      .map(([id, r]) => [id, { ...r, steps: [], machineSteps: [], kidSteps: [], note: "" }]),
  );
  return {
    profile: data.profile,
    weekPlans: pick(data.weekPlans),
    mealPlans: pick(data.mealPlans),
    recipes,
    shopping: {},
    pantry: (pantry ?? []).map(({ name, amount, unit, place, addedAt }) => ({ id: "", name, amount, unit, place, addedAt })),
  };
}

export async function askAssistant(
  messages: ChatTurn[],
  pending: ChangeOp[],
  data: AssistantData,
  today: string,
  currentWeekStart: string,
  tipsThisWeek = 0,
): Promise<AssistantReply> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new LotteUnavailable("offline");
  if (!takeAiSlot()) throw new LotteUnavailable("limit");
  let response: Response;
  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...accessHeaders() },
      body: JSON.stringify({ deviceId: deviceId(), today, messages, pending, data: trimmed(data, currentWeekStart, loadPantry()), tipsThisWeek }),
    });
  } catch {
    throw new LotteUnavailable("offline");
  }
  const body = (await response.json().catch(() => null)) as AssistantReply | AssistantError | null;
  if (!response.ok || !body || "error" in body) {
    const reason = body && "error" in body ? body.error : "fehler";
    if (reason === "zugangscode") forgetAccessCode();
    throw new LotteUnavailable(reason);
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

/** Vorrat, Wunsch-Ideen und Termine eintragen; liefert das Rückgängigmachen */
function commitSideOps(ops: ChangeOp[]): () => void {
  const today = toIsoDate(new Date());
  const undo: (() => void)[] = [];
  const pantry = ops.filter((op) => op.type === "add_pantry");
  if (pantry.length) {
    const before = loadPantry();
    addPantryItems(pantry.map(({ name, amount, unit, place }) => ({ name, amount, unit, place })), today);
    undo.push(() => replacePantry(before));
  }
  const wishes = ops.filter((op) => op.type === "add_wish");
  if (wishes.length) {
    const before = loadWishes();
    for (const w of wishes) addWish({ personId: w.personId, who: w.who, dish: w.dish }, today);
    undo.push(() => restoreWishes(before));
  }
  const appointments = ops.filter((op) => op.type === "add_appointment");
  if (appointments.length) {
    const before = loadAppointments();
    replaceAppointments(
      [...before, ...appointments.map(({ id, date, time, until, title, personId, who }) => ({ id, date, time, until: until || undefined, title, personId, who }))],
      today,
    );
    undo.push(() => replaceAppointments(before));
  }
  return () => undo.forEach((u) => u());
}

/** Ausgewählte Änderungen übernehmen; liefert eine Funktion zum Rückgängigmachen */
export function commitOps(current: AssistantData, ops: ChangeOp[], selected: Set<string>, prompt: string): () => void {
  const chosen = selectedOps(ops, selected);
  const applied = applyOps(current, chosen, { prompt }).data;
  // Spontan: neue Gerichte gelten als "aus den Ideen gewählt" – sonst wären sie im ausgeblendeten Plan unsichtbar
  const spontan = effectivePlanStyle(current.profile, weekStartFor(new Date(), current.profile.shoppingDay || "Montag")) === "spontan";
  const data = spontan ? { ...applied, mealPlans: markSpontan(applied.mealPlans, current.mealPlans) } : applied;
  save(data, current);
  const undoSide = commitSideOps(chosen);
  return () => {
    save(current, data);
    undoSide();
  };
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
