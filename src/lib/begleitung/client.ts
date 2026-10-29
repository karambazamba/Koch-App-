"use client";

// Küchenhelfer in der App: Anfrage an den Server, Übernehmen/Rückgängig und
// Sprachausgabe. Geändert wird erst beim Übernehmen – über dieselben reinen
// Funktionen, mit denen auch die Vorschau rechnet.

import { resolveGiving } from "@/lib/kalender/abgeben/model";
import { accountCache } from "@/lib/konten/cache";
import { readRaw, writeRaw } from "@/lib/core/localStore";
import { replaceNotes } from "@/lib/notizen/store";
import { addPin, changePins, createPin, formatDauer, loadMemos, loadPins, removePin, activeMemos, activePins } from "@/lib/pinnwand";
import { loadPlace } from "@/lib/wetter/client";
import { tipContext } from "@/lib/tipps/client";
import { loadMailStyle } from "@/lib/begleitung/mailSettings";
import { useEffect, useState } from "react";
import { replaceEntries } from "@/lib/kalender/store";
import { istAbgelaufen } from "@/lib/kalender/erledigt";
import { applyHomeChange, loadHomeTiles, saveHomeTiles } from "@/lib/core/homeLayout";
import { BAUSTEINE, LAUNCH_AUS, bausteinOf, featureOn, setFeature, unlockFeature, type Feature } from "@/lib/core/features";
import { pushUndo, undoLast } from "@/lib/core/undo";
import { buildShoppingList, planAlsAngebot } from "@/lib/einkauf/shoppingList";
import { replaceRecipes } from "@/lib/essen/cookbook";
import { replaceMealPlans } from "@/lib/essen/mealPlan";
import { effectivePlanStyle } from "@/lib/einstellungen/profile";
import { householdTitle } from "@/lib/einstellungen/profileHousehold";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { addPantryItems, consumePantry, loadPantry, loadPantryAll, replacePantry } from "@/lib/vorrat/pantry";
import { clearItemShop, loadShoppingSettings, replaceShoppingLists, setItemShop } from "@/lib/einkauf/shoppingList";
import { applyShopRule, shopRulesForMia } from "@/lib/einkauf/shopRules";
import { gelernteRaeume } from "@/lib/kalender/raum/gedaechtnis";
import { recordUsage } from "@/lib/begleitung/usage";
import { addWish, loadWishes, restoreWishes } from "@/lib/essen/wishes";
import { replaceWeekPlans, toIsoDate, weekStartFor } from "@/lib/essen/weekPlan";
import { isWeekCheckRequest } from "@/lib/kalender/wochencheck";
import { isKochtippRequest } from "@/lib/essen/kochtipp/start";
import { openHelper } from "@/lib/begleitung/open";
import { durchatmenAusSatz } from "@/lib/durchatmen/erkennen";
import { starteDurchatmen } from "@/lib/durchatmen/oeffnen";
import { applyOps, INSTANT_OP_TYPES, selectedOps, weekOf, type AssistantData, type ChangeOp } from "@/lib/begleitung/ops";
import { isExpired, isPaused, leftMs, stopwatchMs } from "@/lib/timer/model";
import { loadTimers } from "@/lib/timer/store";
import { startTimer, stopTimerByName, stopwatch } from "@/lib/timer/actions";
import { loadCooking, startCooking, toggleStep } from "@/lib/essen/kochSession";
import { cookableEntry } from "@/lib/essen/mealDone";
import { composeWeek } from "@/lib/essen/mealPlan";
import { loadSport } from "@/lib/sport/store";
import { addTraining, setSportGoal } from "@/lib/sport/actions";
import { loadRoutine } from "@/lib/heute/tagesablauf";
import { loadJetzt, setJetztOn } from "@/lib/heute/jetztStore";
import { nudgePhase } from "@/lib/heute/nudge";
import {
  ASSISTANT_ENDPOINT,
  LIMITS,
  type AssistantError,
  type AssistantErrorCode,
  type AssistantReply,
  type AssistantStatus,
  type ChatTurn,
  type StreamEvent,
} from "@/lib/begleitung/protocol";
import { now } from "@/lib/core/now";
import { einwilligungErteilt, useEinwilligungen } from "@/lib/datenschutz/einwilligung";
import { tidyMiaText } from "@/lib/begleitung/tidy";
import { tempoMarke, tempoModell } from "@/lib/begleitung/tempo";
import type { StorageKey } from "@/lib/core/storage";
import { accessHeaders, deviceId, fetchStatus, forgetAccessCode, onCodeChange } from "@/lib/begleitung/zugang";
import { onKiVersuchOhneCode } from "@/lib/begleitung/codeAbfrage";

export { accessHeaders, deviceId, forgetAccessCode, saveAccessCode } from "@/lib/begleitung/zugang";

const COUNT_KEY: StorageKey = "wasgibts.lotte.anfragen";

/**
 * Was Mia sagt, wenn die KI gerade nicht kann – nie Technik, nie „nicht
 * verstanden“ (Auftrag „Mia auf Claude-Niveau“): offline wird nachgeholt,
 * beim Tageslimit gehen Listen und Termine weiter, sonst „Nochmal?“.
 */
export const UNAVAILABLE_TEXT: Record<AssistantErrorCode | "offline" | "einwilligung", string> = {
  einwilligung: "Dafür brauch ich kurz dein OK.",
  offline: "Bin grad offline. Ich mach’s, sobald wieder Netz da ist.",
  limit: "Für heute hab ich genug geredet. Listen und Termine gehen natürlich weiter.",
  zugangscode: "Dafür brauch ich einmal deinen Zugangscode.",
  aus: "Hat grad nicht geklappt. Nochmal?",
  fehler: "Hat grad nicht geklappt. Nochmal?",
};

/** Passender Satz je nach Lage */
export const unavailableText = (reason?: AssistantErrorCode | "offline" | "einwilligung") =>
  UNAVAILABLE_TEXT[reason ?? (typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "fehler")];

/** KI gerade nicht erreichbar (offline, aus, Limit, falscher Code …) */
export class BegleitungUnavailable extends Error {
  constructor(public reason: AssistantErrorCode | "offline" | "einwilligung") {
    super(UNAVAILABLE_TEXT[reason]);
  }
}

// --- Tageslimit pro Gerät -----------------------------------------------------------

function todayCount(): { day: string; n: number } {
  const day = toIsoDate(now());
  try {
    const saved = JSON.parse(readRaw(COUNT_KEY) ?? "null") as { day: string; n: number } | null;
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
    writeRaw(COUNT_KEY, JSON.stringify({ day: c.day, n: c.n + 1 }));
  } catch {
    // ohne Speicher zählt nur der Server
  }
  return true;
}

/** Darf die App die KI gerade fragen? (eingerichtet und – falls verlangt – Code gemerkt) */
export async function aiUsable(): Promise<boolean> {
  if (!einwilligungErteilt("ki")) return false;
  const s = await fetchStatus();
  return s.configured && (!s.needsCode || s.access === "ok");
}

type BegleitungStatus = AssistantStatus & {
  /** Die KI kann gefragt werden (eingerichtet und – falls verlangt – Code gemerkt) */
  ready: boolean;
  /** Der Zugangscode wird noch gebraucht */
  askCode: boolean;
  /** Die Person hat (noch) nicht erlaubt, dass die KI mitdenkt (Datenschutz, Platz 23) */
  askConsent: boolean;
};

/** Ist die KI eingerichtet und freigeschaltet? (`undefined` = wird geprüft) */
export function useAssistantStatus(enabled: boolean): BegleitungStatus | undefined {
  const consent = useEinwilligungen().erteilt("ki");
  const [status, setStatus] = useState<AssistantStatus>();
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onChange = () => setVersion((v) => v + 1);
    return onCodeChange(onChange);
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
  return { ...status, ready: status.configured && hasCode && consent, askCode: consent && status.configured && status.needsCode && status.access !== "ok", askConsent: status.configured && !consent };
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
    // Sprachnachrichten nur als „[Sprachnachricht 0:12]“ – den Inhalt kennt Mia nicht
    pinnwand: [
      ...activePins(loadPins(), now().getTime()).map((m) => ({ author: m.data.author, text: `${m.data.text || "[Foto]"}${m.data.privat ? " (nur für mich)" : ""}`, at: m.erstellt })),
      ...activeMemos(loadMemos(), now().getTime()).map((m) => ({ author: m.data.author, text: `[Sprachnachricht ${formatDauer(m.data.dauer)}]`, at: m.erstellt })),
    ]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 8),
    wetterOrt: loadPlace(),
    // Feste Laden-Regeln und „Meine Läden“ (für „Was kauf ich wo?“)
    laeden: shopRulesForMia(),
    // Gelernte Räume (A-034): Stichworte aus eigenen Korrekturen
    raumWorte: gelernteRaeume(),
    tippOrt: tipContext().ort,
    tippKm: tipContext().km,
    ...dayData(data),
    // Notizen: kompakt (Listen bis 60 Einträge, Text bis 1500 Zeichen)
    notes: (data.notes ?? []).slice(0, 60).map((n) => ({ ...n, data: { ...n.data, text: n.data.text?.slice(0, 1500), items: n.data.items?.slice(0, 60) } })),
    // Kompakt: Name, Menge, Ort, seit wann; Gekauftes ("b:") als "gekauft" markiert
    pantry: (pantry ?? []).slice(0, 80).map(({ id, name, place, addedAt }) => ({ id: id.startsWith("b:") ? "gekauft" : "", name, place, addedAt })),
    // Termine/Aufgaben: ohne Vergangenes (Erledigtes nur die letzten 12 Stunden, A-043; einmalige Termine älter als 2 Wochen)
    entries: (data.entries ?? []).filter((e) => {
      if (e.typ === "termin") return Boolean(e.data.repeat) || e.data.date >= toIsoDate(new Date(now().getTime() - 14 * 86_400_000));
      return !istAbgelaufen(e, now().getTime());
    }),
  };
}

/** Timer, Kochen, Sport, Tagesablauf – kompakt fürs Gespräch */
function dayData(data: AssistantData): Partial<AssistantData> {
  const nowMs = now().getTime();
  const t = loadTimers();
  const today = toIsoDate(now());
  const week = composeWeek(weekStartFor(now(), data.profile.shoppingDay || "Montag"), data.profile, data.weekPlans, data.mealPlans, data.recipes);
  const entry = cookableEntry(week.days.find((d) => d.date === today));
  const recipe = entry?.recipeId ? data.recipes[entry.recipeId] : undefined;
  const cooking = loadCooking(today);
  const routine = loadRoutine();
  const sport = loadSport();
  return {
    timers: t.timers.filter((x) => !x.acked).map((x) => ({ name: x.name, leftSec: Math.round(leftMs(x, nowMs) / 1000), paused: isPaused(x), done: isExpired(x, nowMs) })),
    stopwatch: t.stopwatch ? { sec: Math.round(stopwatchMs(t.stopwatch, nowMs) / 1000), running: Boolean(t.stopwatch.startedAt) } : null,
    kochen: entry ? { dish: entry.title, recipe: recipe?.id ?? entry.title, steps: recipe?.steps ?? [], done: cooking.steps[recipe?.id ?? entry.title] ?? [], active: cooking.manualAt !== null } : null,
    sport: { ...sport, trainings: sport.trainings.filter((x) => x.data.date >= toIsoDate(new Date(nowMs - 62 * 86_400_000))) },
    tagesablauf: { jetzt: loadJetzt().on, feierabendAb: routine.feierabendAb, morgenBis: routine.morgenBis },
    me: data.profile.persons[0]?.id ?? null,
  };
}

/**
 * Kleine Dinge sofort (ohne "Übernehmen"): Timer, Stoppuhr, Kochschritt,
 * "Ich koche jetzt", den Wochencheck (eigenes Fenster) und den Kochtipp. Liefert die übrigen Änderungen (für die Vorschau) und
 * kurze Hinweise (z. B. wo der Timer steht).
 */
export function runInstantOps(ops: ChangeOp[]): { rest: ChangeOp[]; notes: string[]; undo?: () => void } {
  const notes: string[] = [];
  const undo: (() => void)[] = [];
  let tileShown = false;
  const weekCheck = (op: ChangeOp) => op.type === "app_command" && isWeekCheckRequest(op.text);
  const cookTip = (op: ChangeOp) => op.type === "app_command" && isKochtippRequest(op.text);
  // Durchatmen (A-051): „Handy-Pause“, „Ich brauch kurz Ruhe“ … startet die Übung sofort (die Bühne geht zu)
  const atem = (op: ChangeOp) => op.type === "app_command" && durchatmenAusSatz(op.text) !== null;
  const atemOp = ops.find(atem);
  if (atemOp?.type === "app_command") {
    // Versteckt? Mia schaltet frei und sagt, wo es steht
    if (unlockFeature("durchatmen")) notes.push(bausteinOf("durchatmen")!.where);
    starteDurchatmen(durchatmenAusSatz(atemOp.text)!);
  }
  if (ops.some(weekCheck)) openHelper("wochencheck");
  else if (ops.some(cookTip)) openHelper("kochtipp");
  for (const op of ops) {
    if (op.type === "add_timer") {
      const started = startTimer({ name: op.name, minutes: op.minutes }, { quiet: true });
      if (!started) notes.push("Fünf Timer laufen schon. Sobald einer fertig ist, geht der nächste.");
      else {
        undo.push(started.undo);
        tileShown ||= started.tileShown;
      }
    } else if (op.type === "stop_timer") stopTimerByName(op.name);
    else if (op.type === "stopwatch") stopwatch(op.action);
    else if (op.type === "cook_step") {
      if (!(loadCooking().steps[op.recipe] ?? []).includes(op.index)) undo.push(toggleStep(op.recipe, op.index));
    } else if (op.type === "start_cooking") {
      undo.push(startCooking());
      nudgePhase();
    }
  }
  // Timer-Kachel war ausgeblendet → startTimer hat sie eingeblendet; sagen, wo er steht
  if (tileShown) notes.push("Der Timer steht jetzt auf der Startseite.");
  // Rückwärts: jedes Zurücknehmen stellt den Stand vor seinem Schritt wieder her
  const back = undo.length ? pushUndo("den Timer", () => [...undo].reverse().forEach((u) => u())) : undefined;
  return { rest: ops.filter((op) => !INSTANT_OP_TYPES.has(op.type) && !weekCheck(op) && !cookTip(op) && !atem(op)), notes, ...(back ? { undo: back } : {}) };
}

type AskOptions = {
  /** Uhrzeit auf dem Gerät, "HH:MM" */
  clock?: string;
  /** Was gerade auf der Einkaufsliste steht */
  shoppingNames?: string[];
  /** Antworttext bisher (wächst Stück für Stück) */
  onText?: (soFar: string) => void;
  /** Tempo messen (Standard ja; die stille Prüfung nach dem Sofort-Weg nicht) */
  messen?: boolean;
  /** Sofort-Weg: das hat die App schon selbst erledigt – die KI prüft nur und korrigiert, wenn sie etwas anderes versteht */
  sofort?: string;
  /** Abbrechen (Fortsetzung nach einer Denkpause ersetzt die Frage) */
  signal?: AbortSignal;
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
  if (!einwilligungErteilt("ki")) throw new BegleitungUnavailable("einwilligung");
  if (typeof navigator !== "undefined" && navigator.onLine === false) throw new BegleitungUnavailable("offline");
  if (!takeAiSlot()) throw new BegleitungUnavailable("limit");
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
        ...(opts.sofort ? { sofort: opts.sofort } : {}),
      }),
      signal: opts.signal,
    });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    throw new BegleitungUnavailable("offline");
  }
  const messen = opts.messen !== false;
  if (messen) tempoMarke("server");
  if (!response.ok || !response.body || !(response.headers.get("content-type") ?? "").includes("ndjson")) {
    const body = (await response.json().catch(() => null)) as AssistantReply | AssistantError | null;
    if (response.ok && body && !("error" in body)) {
      recordUsage(today, body.usage);
      if (messen) tempoMarke("fertig");
      return body;
    }
    const reason = body && "error" in body ? body.error : "fehler";
    if (reason === "zugangscode") {
      forgetAccessCode();
      onKiVersuchOhneCode();
    }
    throw new BegleitungUnavailable(reason);
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
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      throw new BegleitungUnavailable("offline");
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
        if (messen) tempoMarke("token");
        opts.onText?.(tidyMiaText(text));
      } else if (event.t === "round") {
        freshRound = true;
      } else if (event.t === "done") {
        recordUsage(today, event.usage);
        if (messen) {
          tempoModell(event.zeit?.token);
          tempoMarke("fertig");
        }
        return { reply: tidyMiaText(event.reply), ops: event.ops, mail: event.mail, chips: event.chips, tips: event.tips };
      } else if (event.t === "error") {
        if (event.error === "zugangscode") {
          forgetAccessCode();
          onKiVersuchOhneCode();
        }
        throw new BegleitungUnavailable(event.error);
      }
    }
  }
  throw new BegleitungUnavailable("fehler");
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
  if (data.home !== before.home && data.home) saveHomeTiles(data.home);
  if (data.profile !== before.profile) saveProfile(data.profile);
}

/** Vorrat, Wunsch-Ideen und Pinnwand eintragen; liefert das Rückgängigmachen */
function commitSideOps(ops: ChangeOp[], author = "Ich"): () => void {
  const today = toIsoDate(now());
  const undo: (() => void)[] = [];
  const pantry = ops.filter((op) => op.type === "add_pantry");
  if (pantry.length) {
    const before = loadPantryAll();
    addPantryItems(pantry.map(({ name, place }) => ({ name, place })), today);
    undo.push(() => replacePantry(before));
  }
  const usedUp = ops.filter((op) => op.type === "use_pantry");
  if (usedUp.length) {
    const before = loadPantryAll();
    consumePantry(usedUp.map((op) => op.name), today);
    undo.push(() => replacePantry(before));
  }
  const wishes = ops.filter((op) => op.type === "add_wish");
  if (wishes.length) {
    const before = loadWishes();
    for (const w of wishes) addWish({ personId: w.personId, who: w.who, dish: w.dish }, today);
    undo.push(() => restoreWishes(before));
  }
  for (const op of ops) {
    if (op.type !== "add_pin") continue;
    const pin = createPin(op.text, author, null, { pinned: op.pinned === true, privat: op.privat === true });
    if (!pin) continue;
    changePins((all) => addPin(all, pin));
    undo.push(() => changePins((all) => removePin(all, pin.id)));
  }
  return () => undo.forEach((u) => u());
}

type CommitResult = {
  /** Zurücknehmen (wirkt einmal; auch über "Mach das rückgängig") */
  undo: () => void;
  /** Kurze Sätze, was passiert ist und wo man es findet */
  notes: string[];
};

/** "11 Sachen für die Woche, davon 4 für heute" (aus der Einkaufsliste nach dem Übernehmen) */
function shoppingNote(data: AssistantData, before: AssistantData): string | null {
  const today = now();
  const weekStart = weekStartFor(today, data.profile.shoppingDay || "Montag");
  const angebot = planAlsAngebot(weekStart, loadShoppingSettings().angebotAb);
  const count = (d: AssistantData) => buildShoppingList(weekOf(d, weekStart), d.recipes, d.shopping[weekStart], undefined, { angebot }).items.filter((i) => !i.hidden && !i.checked);
  const after = count(data);
  if (after.length === count(before).length) return null;
  const todayName = new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(today);
  const forToday = after.filter((i) => i.days.includes(todayName)).length;
  const sachen = (n: number) => `${n} ${n === 1 ? "Sache" : "Sachen"}`;
  return `Einkaufsliste: ${sachen(after.length)} für die Woche${forToday ? `, davon ${forToday} für heute` : ""}.`;
}

/** Ausgewählte Änderungen übernehmen; liefert Rückgängig und kurze Hinweise */
/**
 * Launch 1.0: Änderungen an ausgeblendeten Bausteinen (Liste `LAUNCH_AUS`)
 * übernimmt die App nur, wenn der Baustein schon an ist – Mia schaltet sie
 * nicht frei („Kann ich noch nicht.“). @public für Tests
 */
export const LAUNCH_OPS: Partial<Record<ChangeOp["type"], Feature>> = {
  add_training: "sport",
  set_sport_goal: "sport",
  upsert_note: "notizen",
  remove_note: "notizen",
};

/** Ausgeblendetes für 1.0 herausfiltern; `gesperrt` = etwas wurde weggelassen @public für Tests */
export function launchFilter(ops: ChangeOp[], on: (f: Feature) => boolean): { ops: ChangeOp[]; gesperrt: boolean } {
  const erlaubt = (op: ChangeOp) => {
    const f = op.type === "set_feature" ? (op.feature as Feature) : LAUNCH_OPS[op.type];
    if (!f || !LAUNCH_AUS.includes(f)) return true;
    return op.type === "set_feature" ? !op.on || on(f) : on(f);
  };
  const kept = ops.filter(erlaubt);
  return { ops: kept, gesperrt: kept.length < ops.length };
}

export function commitOps(current: AssistantData, ops: ChangeOp[], selected: Set<string>, prompt: string): CommitResult {
  const launch = launchFilter(selectedOps(ops, selected), featureOn);
  const chosen = launch.ops;
  // "Mach das rückgängig": die letzte Änderung zurücknehmen (sonst nichts)
  if (chosen.some((op) => op.type === "undo_last")) {
    const label = undoLast();
    return { undo: () => {}, notes: [label ? `Zurückgenommen: ${label}` : "Da gibt’s gerade nichts zurückzunehmen."] };
  }
  const applied = applyOps(current, chosen, { prompt }).data;
  // Spontan: neue Gerichte gelten als "aus den Ideen gewählt" – sonst wären sie im ausgeblendeten Plan unsichtbar
  const spontan = effectivePlanStyle(current.profile, weekStartFor(now(), current.profile.shoppingDay || "Montag")) === "spontan";
  let data = spontan ? { ...applied, mealPlans: markSpontan(applied.mealPlans, current.mealPlans) } : applied;
  const notes: string[] = [];
  // „Sag Lisa, sie soll …“: Aufgabe an jemanden aus dem Haushalt geben (Tafel 52 B)
  if (data.entries?.some((e) => e.typ === "aufgabe" && (e.data as { an?: string }).an)) {
    const household = accountCache.load()?.household;
    const given = resolveGiving(data.entries, household?.members ?? [], household?.me.userId ?? null);
    data = { ...data, entries: given.entries };
    notes.push(...given.notes);
  }
  // Was Lotte anlegt, muss man sehen können: versteckte Bereiche freischalten und sagen, wo es steht
  if (chosen.some((op) => op.type === "set_meal" || op.type === "update_week")) {
    unlockFeature("wochenplan");
    const tiles = data.home ?? loadHomeTiles();
    if (!tiles.find((t) => t.id === "essen")?.visible) data = { ...data, home: applyHomeChange(tiles, { tile: "essen", action: "zeigen" }) };
    // Launch 1.0: Wochenplan ausgeblendet – das Gericht steht trotzdem unter Essen
    notes.push(featureOn("wochenplan") ? "Dein Wochenplan steht rechts unter Essen." : "Steht unter Essen.");
  }
  // Nutzt Lotte einen ausgeschalteten Baustein, wird er eingeschaltet – und sie sagt, wo er steht
  if (chosen.some((op) => op.type === "add_pantry" || op.type === "use_pantry") && unlockFeature("vorrat")) notes.push(bausteinOf("vorrat")!.where);
  if (chosen.some((op) => op.type === "add_recipe") && unlockFeature("rezepte")) notes.push(bausteinOf("rezepte")!.where);
  if (chosen.some((op) => op.type === "upsert_note") && unlockFeature("notizen")) {
    const tiles = data.home ?? loadHomeTiles();
    if (!tiles.find((t) => t.id === "notizen")?.visible) data = { ...data, home: applyHomeChange(tiles, { tile: "notizen", action: "zeigen" }) };
    notes.push(bausteinOf("notizen")!.where);
  }
  if (chosen.some((op) => op.type === "add_pin")) {
    unlockFeature("pinnwand");
    const tiles = data.home ?? loadHomeTiles();
    if (!tiles.find((t) => t.id === "pinnwand")?.visible) {
      data = { ...data, home: applyHomeChange(tiles, { tile: "pinnwand", action: "zeigen" }) };
      notes.push("Die Pinnwand steht jetzt oben auf der Startseite.");
    }
  }
  // Bausteine, die Lotte schalten soll
  const switched: { feature: Feature; on: boolean }[] = [];
  for (const op of chosen) {
    if (op.type !== "set_feature" || !bausteinOf(op.feature as Feature)) continue;
    if (setFeature(op.feature as Feature, op.on)) {
      switched.push({ feature: op.feature as Feature, on: op.on });
      const b = bausteinOf(op.feature as Feature)!;
      notes.push(op.on ? b.where : `${b.name} ist aus. Die Daten bleiben.`);
      // Wundertüte eingeschaltet: ihre Kachel kommt auf die Startseite (sie sagt ja, dass sie dort steht)
      const tiles = data.home ?? loadHomeTiles();
      if (op.on && op.feature === "wundertuete" && !tiles.find((t) => t.id === "wundertuete")?.visible) data = { ...data, home: applyHomeChange(tiles, { tile: "wundertuete", action: "zeigen" }) };
    }
  }
  if (chosen.some((op) => op.type === "upsert_note")) notes.push("Notizen findest du in der Woche ganz unten unter „Notizen“.");
  if (launch.gesperrt) notes.push("Kann ich noch nicht.");
  // Sport: Training/Wochenziel in den eigenen Speicher, Sport-Kachel einblenden
  const sportOps = chosen.filter((op) => op.type === "add_training" || op.type === "set_sport_goal" || (op.type === "upsert_entry" && op.isNew && (op.entry.data.label ?? "").toLowerCase() === "sport"));
  if (sportOps.length) {
    const tiles = data.home ?? loadHomeTiles();
    if (!tiles.find((t) => t.id === "sport")?.visible) {
      data = { ...data, home: applyHomeChange(tiles, { tile: "sport", action: "zeigen" }) };
      notes.push("Die Sport-Kachel steht jetzt auf der Startseite.");
    }
  }
  const jetztOps = chosen.filter((op) => op.type === "set_jetzt");
  if (chosen.some((op) => op.type === "set_household")) notes.push(`Steht drin, unter „${householdTitle(data.profile)}“ in den Einstellungen.`);
  if (chosen.some((op) => op.type === "set_meal" || op.type === "add_shopping")) {
    const note = shoppingNote(data, current);
    if (note) notes.push(note);
  }
  save(data, current);
  const undoSide = commitSideOps(chosen, current.profile.persons[0]?.name.trim() || "Ich");
  const undoDay: (() => void)[] = [];
  for (const op of chosen) {
    if (op.type === "add_shopping" && op.shop) {
      // Laden für den Artikel merken (Einkauf nach Läden)
      const before = loadShoppingSettings().itemShops[op.name.trim().toLowerCase()];
      setItemShop(op.name, op.shop);
      undoDay.push(() => (before === undefined ? clearItemShop(op.name) : setItemShop(op.name, before)));
    }
    // „Tomaten kaufe ich immer bei Rewe“: feste Regel, Rückgängig stellt die alte wieder her
    if (op.type === "set_shop_rule") undoDay.push(applyShopRule(op.name, op.shop));
    if (op.type === "add_training") undoDay.push(addTraining(op.training).undo);
    else if (op.type === "set_sport_goal") undoDay.push(setSportGoal(op.goal));
  }
  const lastJetzt = jetztOps[jetztOps.length - 1];
  if (lastJetzt && lastJetzt.type === "set_jetzt") undoDay.push(setJetztOn(lastJetzt.on));
  const undo = pushUndo(prompt ? `„${prompt.slice(0, 60)}“` : "die letzte Änderung", () => {
    save(current, data);
    undoSide();
    // Rückwärts: Sport/Jetzt/Läden stellen jeweils den Stand vor ihrem Schritt wieder her
    [...undoDay].reverse().forEach((u) => u());
    for (const s of switched) setFeature(s.feature, !s.on);
  });
  return { undo, notes };
}
