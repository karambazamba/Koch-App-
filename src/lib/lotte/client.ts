"use client";

// Küchenhelfer in der App: Anfrage an den Server, Übernehmen/Rückgängig und
// Sprachausgabe. Geändert wird erst beim Übernehmen – über dieselben reinen
// Funktionen, mit denen auch die Vorschau rechnet.

import { replaceNotes } from "../notizen/store";
import { loadKladde, saveKladde } from "../notizen/kladde";
import { loadMailStyle } from "./mailSettings";
import { useEffect, useState } from "react";
import { replaceEntries } from "../aufgaben/store";
import { applyHomeChange, loadHomeTiles, saveHomeTiles } from "../core/homeLayout";
import { BAUSTEINE, bausteinOf, featureOn, setFeature, unlockFeature, type Feature } from "../core/features";
import { pushUndo, undoLast } from "../core/undo";
import { buildShoppingList } from "../einkauf/shoppingList";
import { replaceRecipes } from "../essen/cookbook";
import { replaceMealPlans } from "../essen/mealPlan";
import { effectivePlanStyle, saveProfile } from "../einstellungen/profile";
import { addPantryItems, loadPantry, replacePantry } from "../essen/pantry";
import { replaceShoppingLists } from "../einkauf/shoppingList";
import { addWish, loadWishes, restoreWishes } from "../essen/wishes";
import { replaceWeekPlans, toIsoDate, weekStartFor } from "../essen/weekPlan";
import { applyOps, selectedOps, weekOf, type AssistantData, type ChangeOp } from "./ops";
import {
  ACCESS_HEADER,
  ASSISTANT_ENDPOINT,
  LIMITS,
  type AssistantError,
  type AssistantErrorCode,
  type AssistantReply,
  type AssistantStatus,
  type ChatTurn,
  type StreamEvent,
} from "./protocol";
import { now } from "../core/now";

const DEVICE_KEY = "wasgibts.geraet";
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
  const day = toIsoDate(now());
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
 * Nur das Nötige mitschicken: Profil, diese und nächste Woche (Plan und
 * Einkaufsliste), Kochbuch ohne Zubereitungsschritte, Vorrat, Startseite und
 * Termine – keine alten Wochen.
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
    // Einkaufslisten dieser und der nächsten Wochen (Lotte kann sie lesen, leeren, Einträge entfernen)
    shopping: pick(data.shopping),
    home: data.home,
    features: BAUSTEINE.filter((b) => featureOn(b.feature)).map((b) => b.feature),
    mail: loadMailStyle(),
    kladde: loadKladde().text.slice(0, 4000),
    // Notizen: kompakt (Listen bis 60 Einträge, Text bis 1500 Zeichen)
    notes: (data.notes ?? []).slice(0, 60).map((n) => ({ ...n, data: { ...n.data, text: n.data.text?.slice(0, 1500), items: n.data.items?.slice(0, 60) } })),
    // Kompakt: Name, Menge, Ort, seit wann; Gekauftes ("b:") als "gekauft" markiert
    pantry: (pantry ?? []).slice(0, 80).map(({ id, name, amount, unit, place, addedAt }) => ({ id: id.startsWith("b:") ? "gekauft" : "", name, amount, unit, place, addedAt })),
    // Termine/Aufgaben: ohne Vergangenes (erledigte Aufgaben älter als 2 Wochen, einmalige Termine vor gestern)
    entries: (data.entries ?? []).filter((e) => {
      const old = toIsoDate(new Date(now().getTime() - 14 * 86_400_000));
      if (e.typ === "termin") return Boolean(e.data.repeat) || e.data.date >= old;
      return !e.data.doneOn || e.data.doneOn >= old;
    }),
  };
}

export type AskOptions = {
  /** Uhrzeit auf dem Gerät, "HH:MM" */
  clock?: string;
  /** Was gerade auf der Einkaufsliste steht */
  shoppingNames?: string[];
  /** Antworttext bisher (wächst Stück für Stück) */
  onText?: (soFar: string) => void;
};

export async function askAssistant(
  messages: ChatTurn[],
  pending: ChangeOp[],
  data: AssistantData,
  today: string,
  currentWeekStart: string,
  tipsThisWeek = 0,
  opts: AskOptions = {},
): Promise<AssistantReply> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new LotteUnavailable("offline");
  if (!takeAiSlot()) throw new LotteUnavailable("limit");
  let response: Response;
  try {
    response = await fetch(ASSISTANT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...accessHeaders() },
      body: JSON.stringify({
        deviceId: deviceId(),
        today,
        // Gesprächsverlauf: die letzten Nachrichten
        messages: messages.slice(-LIMITS.historyTurns),
        pending,
        data: trimmed(data, currentWeekStart, data.pantry ?? loadPantry()),
        tipsThisWeek,
        clock: opts.clock,
        shoppingNames: opts.shoppingNames?.slice(0, 80),
        stream: true,
      }),
    });
  } catch {
    throw new LotteUnavailable("offline");
  }
  if (!response.ok || !response.body || !(response.headers.get("content-type") ?? "").includes("ndjson")) {
    const body = (await response.json().catch(() => null)) as AssistantReply | AssistantError | null;
    if (response.ok && body && !("error" in body)) return body;
    const reason = body && "error" in body ? body.error : "fehler";
    if (reason === "zugangscode") forgetAccessCode();
    throw new LotteUnavailable(reason);
  }
  // Stück für Stück lesen: eine JSON-Zeile pro Ereignis
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let freshRound = false;
  for (;;) {
    let chunk: ReadableStreamReadResult<Uint8Array>;
    try {
      chunk = await reader.read();
    } catch {
      throw new LotteUnavailable("offline");
    }
    if (chunk.done) break;
    buffer += decoder.decode(chunk.value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event: StreamEvent;
      try {
        event = JSON.parse(line) as StreamEvent;
      } catch {
        continue;
      }
      if (event.t === "text") {
        // Nach Werkzeugen beginnt eine neue Antwort – Zwischenstand ersetzen
        if (freshRound) {
          text = "";
          freshRound = false;
        }
        text += event.d;
        opts.onText?.(text);
      } else if (event.t === "round") {
        freshRound = true;
      } else if (event.t === "done") {
        return { reply: event.reply, ops: event.ops, mail: event.mail, chips: event.chips };
      } else if (event.t === "error") {
        if (event.error === "zugangscode") forgetAccessCode();
        throw new LotteUnavailable(event.error);
      }
    }
  }
  throw new LotteUnavailable("fehler");
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
  if (data.entries !== before.entries && data.entries) replaceEntries(data.entries);
  if (data.notes !== before.notes && data.notes) replaceNotes(data.notes);
  if (data.kladde !== before.kladde && data.kladde !== undefined) saveKladde(data.kladde);
  if (data.home !== before.home && data.home) saveHomeTiles(data.home);
  if (data.profile !== before.profile) saveProfile(data.profile);
}

/** Vorrat und Wunsch-Ideen eintragen; liefert das Rückgängigmachen */
function commitSideOps(ops: ChangeOp[]): () => void {
  const today = toIsoDate(now());
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
  return () => undo.forEach((u) => u());
}

export type CommitResult = {
  /** Zurücknehmen (wirkt einmal; auch über "Mach das rückgängig") */
  undo: () => void;
  /** Kurze Sätze, was passiert ist und wo man es findet */
  notes: string[];
};

/** "11 Sachen für die Woche, davon 4 für heute" (aus der Einkaufsliste nach dem Übernehmen) */
function shoppingNote(data: AssistantData, before: AssistantData): string | null {
  const today = now();
  const weekStart = weekStartFor(today, data.profile.shoppingDay || "Montag");
  const count = (d: AssistantData) => buildShoppingList(weekOf(d, weekStart), d.recipes, d.shopping[weekStart]).items.filter((i) => !i.hidden && !i.checked);
  const after = count(data);
  if (after.length === count(before).length) return null;
  const todayName = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(today);
  const forToday = after.filter((i) => i.days.includes(todayName)).length;
  const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;
  return `Einkaufsliste: ${sachen(after.length)} für die Woche${forToday ? `, davon ${forToday} für heute` : ""}.`;
}

/** Ausgewählte Änderungen übernehmen; liefert Rückgängig und kurze Hinweise */
export function commitOps(current: AssistantData, ops: ChangeOp[], selected: Set<string>, prompt: string): CommitResult {
  const chosen = selectedOps(ops, selected);
  // "Mach das rückgängig": die letzte Änderung zurücknehmen (sonst nichts)
  if (chosen.some((op) => op.type === "undo_last")) {
    const label = undoLast();
    return { undo: () => {}, notes: [label ? `Zurückgenommen: ${label}` : "Da gibt's gerade nichts zurückzunehmen."] };
  }
  const applied = applyOps(current, chosen, { prompt }).data;
  // Spontan: neue Gerichte gelten als "aus den Ideen gewählt" – sonst wären sie im ausgeblendeten Plan unsichtbar
  const spontan = effectivePlanStyle(current.profile, weekStartFor(now(), current.profile.shoppingDay || "Montag")) === "spontan";
  let data = spontan ? { ...applied, mealPlans: markSpontan(applied.mealPlans, current.mealPlans) } : applied;
  const notes: string[] = [];
  // Was Lotte anlegt, muss man sehen können: versteckte Bereiche freischalten und sagen, wo es steht
  if (chosen.some((op) => op.type === "set_meal" || op.type === "update_week")) {
    unlockFeature("wochenplan");
    const tiles = data.home ?? loadHomeTiles();
    if (!tiles.find((t) => t.id === "essen")?.visible) data = { ...data, home: applyHomeChange(tiles, { tile: "essen", action: "zeigen" }) };
    notes.push("Dein Wochenplan steht rechts unter Essen.");
  }
  // Nutzt Lotte einen ausgeschalteten Baustein, wird er eingeschaltet – und sie sagt, wo er steht
  if (chosen.some((op) => op.type === "add_pantry") && unlockFeature("vorrat")) notes.push(bausteinOf("vorrat")!.where);
  if (chosen.some((op) => op.type === "add_recipe") && unlockFeature("rezepte")) notes.push(bausteinOf("rezepte")!.where);
  // Bausteine, die Lotte schalten soll
  const switched: { feature: Feature; on: boolean }[] = [];
  for (const op of chosen) {
    if (op.type !== "set_feature" || !bausteinOf(op.feature as Feature)) continue;
    if (setFeature(op.feature as Feature, op.on)) {
      switched.push({ feature: op.feature as Feature, on: op.on });
      const b = bausteinOf(op.feature as Feature)!;
      notes.push(op.on ? b.where : `${b.name} ist aus – die Daten bleiben.`);
    }
  }
  if (chosen.some((op) => op.type === "upsert_note")) notes.push("Notizen findest du in der Woche ganz unten unter „Notizen“.");
  if (chosen.some((op) => op.type === "set_meal" || op.type === "add_shopping")) {
    const note = shoppingNote(data, current);
    if (note) notes.push(note);
  }
  save(data, current);
  const undoSide = commitSideOps(chosen);
  const undo = pushUndo(prompt ? `„${prompt.slice(0, 60)}“` : "die letzte Änderung", () => {
    save(current, data);
    undoSide();
    for (const s of switched) setFeature(s.feature, !s.on);
  });
  return { undo, notes };
}
