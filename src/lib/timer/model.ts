// Timer (rein): bis zu 5 Timer gleichzeitig plus eine Stoppuhr. Jeder Timer
// speichert seine ENDZEIT – nach Hintergrund, Sperre oder Neustart stimmt die
// Anzeige sofort (JS-Timer laufen im Hintergrund nicht weiter). Pausiert =
// Restzeit gemerkt. Abgelaufen = Endzeit vorbei; bis zum "OK" bleibt er im
// Speicher, auf der Kachel verschwindet er 1 Minute nach Ablauf.

const MAX_TIMERS = 5;
/** So lange steht ein abgelaufener Timer noch auf der Kachel */
const SHOW_AFTER_MS = 60_000;
/** So lange klingelt er höchstens */
export const RING_MS = 60_000;

export type Timer = {
  id: string;
  name: string;
  emoji: string;
  /** Ursprüngliche Dauer (für "Nudeln · 10 Min" und den Ring) */
  durationMs: number;
  /** Endzeit (ms seit 1970) */
  endsAt: number;
  /** Pausiert: Restzeit in ms (sonst null) */
  pausedLeft: number | null;
  startedAt: number;
  /** "OK" getippt (abgelaufen gesehen) */
  acked: boolean;
  /** Aus einem Rezept-Schritt gestartet */
  step?: string;
};

export type Stopwatch = { startedAt: number | null; elapsedMs: number };

export type TimerState = {
  timers: Timer[];
  stopwatch: Stopwatch | null;
  /** Einmaliger Hinweis zum Ton gezeigt */
  hintSeen: boolean;
  /** Fürs Kochen: erster Timer-Start und Ende des letzten Timers (ms) */
  firstAt: number | null;
  lastEnd: number | null;
};

export const EMPTY_TIMERS: TimerState = { timers: [], stopwatch: null, hintSeen: false, firstAt: null, lastEnd: null };

const EMOJIS: [RegExp, string][] = [
  [/nudel|pasta|spaghetti/i, "🍝"],
  [/reis/i, "🍚"],
  [/\bei(er)?\b/i, "🥚"],
  [/kartoffel/i, "🥔"],
  [/brötchen|brot|baguette/i, "🥖"],
  [/pizza/i, "🍕"],
  [/kuchen|muffin|plätzchen|kekse/i, "🧁"],
  [/tee/i, "🍵"],
  [/ofen|braten|auflauf/i, "🔥"],
  [/wäsche|waschmaschine/i, "🧺"],
  [/pause|schlaf|nap/i, "😴"],
];

const timerEmoji = (name: string) => EMOJIS.find(([re]) => re.test(name))?.[1] ?? "⏱";

export const leftMs = (t: Timer, nowMs: number) => (t.pausedLeft !== null ? t.pausedLeft : Math.max(0, t.endsAt - nowMs));
export const isPaused = (t: Timer) => t.pausedLeft !== null;
export const isExpired = (t: Timer, nowMs: number) => t.pausedLeft === null && t.endsAt <= nowMs;
export const isRunning = (t: Timer, nowMs: number) => t.pausedLeft === null && t.endsAt > nowMs;

/** Auf der Kachel: laufend, pausiert oder höchstens 1 Minute abgelaufen */
export const shownOnTile = (t: Timer, nowMs: number) => !isExpired(t, nowMs) || nowMs - t.endsAt < SHOW_AFTER_MS;

/** Läuft (oder klingelt) gerade etwas? Dann gehört die Kachel nach oben */
export const timersActive = (s: TimerState, nowMs: number) => s.timers.some((t) => shownOnTile(t, nowMs)) || Boolean(s.stopwatch);

/** Reihenfolge: Abgelaufenes zuerst, dann was als Nächstes fertig wird, Pausiertes zuletzt */
export function sortTimers(list: Timer[], nowMs: number): Timer[] {
  const key = (t: Timer) => (isExpired(t, nowMs) ? -1 : isPaused(t) ? 1e15 + t.pausedLeft! : t.endsAt - nowMs);
  return [...list].sort((a, b) => key(a) - key(b));
}

/** "9:58", "1:02:03" */
export function formatLeft(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

/** "10 Min", "1 Std 30 Min", "45 Sek" */
export function durationLabel(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (ms < 60_000) return `${Math.round(ms / 1000)} Sek`;
  if (min < 60) return `${min} Min`;
  return `${Math.floor(min / 60)} Std${min % 60 ? ` ${min % 60} Min` : ""}`;
}

/** "noch 4 Minuten", "noch 30 Sekunden", "noch 1 Stunde 5 Minuten" */
export function leftWords(ms: number): string {
  const sec = Math.ceil(ms / 1000);
  if (sec < 60) return `noch ${sec} Sekunden`;
  const min = Math.ceil(sec / 60);
  if (min < 60) return `noch ${min} ${min === 1 ? "Minute" : "Minuten"}`;
  const h = Math.floor(min / 60);
  const rest = min % 60;
  return `noch ${h} ${h === 1 ? "Stunde" : "Stunden"}${rest ? ` ${rest} ${rest === 1 ? "Minute" : "Minuten"}` : ""}`;
}

const newId = () => `t-${Math.random().toString(36).slice(2, 10)}`;

/** Neuer Timer (null = schon 5 laufen bzw. Dauer ungültig) */
export function addTimer(s: TimerState, input: { name?: string; minutes: number; emoji?: string; step?: string }, nowMs: number): { state: TimerState; timer: Timer } | null {
  const ms = Math.round(input.minutes * 60_000);
  if (!Number.isFinite(ms) || ms < 1000 || ms > 24 * 3600_000) return null;
  // Erledigte (abgelaufen und gesehen) zählen nicht mit
  const live = s.timers.filter((t) => !(t.acked && isExpired(t, nowMs)));
  if (live.length >= MAX_TIMERS) return null;
  const name = (input.name ?? "").trim().slice(0, 30) || `Timer ${durationLabel(ms)}`;
  const timer: Timer = { id: newId(), name, emoji: input.emoji ?? timerEmoji(name), durationMs: ms, endsAt: nowMs + ms, pausedLeft: null, startedAt: nowMs, acked: false, ...(input.step ? { step: input.step } : {}) };
  const firstAt = s.firstAt !== null && s.lastEnd !== null && nowMs < s.lastEnd + 15 * 60_000 ? s.firstAt : nowMs;
  return { state: { ...s, timers: [...live, timer], firstAt, lastEnd: Math.max(s.lastEnd ?? 0, timer.endsAt) }, timer };
}

const patch = (s: TimerState, id: string, change: (t: Timer) => Timer): TimerState => ({ ...s, timers: s.timers.map((t) => (t.id === id ? change(t) : t)) });

/** +1 Minute (auch nach Ablauf: läuft dann wieder 1 Minute) */
export function plusMinute(s: TimerState, id: string, nowMs: number): TimerState {
  const next = patch(s, id, (t) => (t.pausedLeft !== null ? { ...t, pausedLeft: t.pausedLeft + 60_000 } : { ...t, endsAt: Math.max(t.endsAt, nowMs) + 60_000, acked: false }));
  const t = next.timers.find((x) => x.id === id);
  return t ? { ...next, lastEnd: Math.max(next.lastEnd ?? 0, t.endsAt) } : next;
}

export const pauseTimer = (s: TimerState, id: string, nowMs: number): TimerState => patch(s, id, (t) => (t.pausedLeft !== null || isExpired(t, nowMs) ? t : { ...t, pausedLeft: t.endsAt - nowMs }));

export function resumeTimer(s: TimerState, id: string, nowMs: number): TimerState {
  const next = patch(s, id, (t) => (t.pausedLeft === null ? t : { ...t, endsAt: nowMs + t.pausedLeft, pausedLeft: null }));
  const t = next.timers.find((x) => x.id === id);
  return t ? { ...next, lastEnd: Math.max(next.lastEnd ?? 0, t.endsAt) } : next;
}

/** Entfernen (✕ oder "OK"); ein vorzeitig beendeter zählt fürs Kochen bis jetzt */
export function removeTimer(s: TimerState, id: string, nowMs: number): TimerState {
  const t = s.timers.find((x) => x.id === id);
  const timers = s.timers.filter((x) => x.id !== id);
  const stillRunning = timers.filter((x) => !isExpired(x, nowMs)).map((x) => (x.pausedLeft !== null ? nowMs : x.endsAt));
  const lastEnd = t && !isExpired(t, nowMs) ? Math.max(nowMs, ...stillRunning) : s.lastEnd;
  return { ...s, timers, lastEnd };
}

/** Abgelaufene als gesehen markieren und wegräumen */
export function ackTimers(s: TimerState, ids: string[]): TimerState {
  return { ...s, timers: s.timers.filter((t) => !ids.includes(t.id)) };
}

export function startStopwatch(s: TimerState, nowMs: number): TimerState {
  const sw = s.stopwatch;
  if (sw?.startedAt) return s;
  return { ...s, stopwatch: { startedAt: nowMs, elapsedMs: sw?.elapsedMs ?? 0 } };
}

export function pauseStopwatch(s: TimerState, nowMs: number): TimerState {
  const sw = s.stopwatch;
  if (!sw?.startedAt) return s;
  return { ...s, stopwatch: { startedAt: null, elapsedMs: sw.elapsedMs + (nowMs - sw.startedAt) } };
}

export const resetStopwatch = (s: TimerState): TimerState => ({ ...s, stopwatch: null });

export const stopwatchMs = (sw: Stopwatch, nowMs: number) => sw.elapsedMs + (sw.startedAt ? nowMs - sw.startedAt : 0);

/** Timer zu einem Namen finden ("Stopp den Nudel-Timer") */
export function findTimer(list: Timer[], words: string): Timer | undefined {
  const w = words.toLowerCase().replace(/-?timer\b/g, "").trim();
  if (!w) return list[0];
  const stem = w.replace(/(n|en|e|s)$/i, "");
  return list.find((t) => t.name.toLowerCase().includes(w)) ?? list.find((t) => stem.length >= 3 && t.name.toLowerCase().includes(stem));
}

export function sanitizeTimers(raw: unknown): TimerState {
  if (!raw || typeof raw !== "object") return EMPTY_TIMERS;
  const r = raw as Partial<TimerState>;
  const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);
  const timers = (Array.isArray(r.timers) ? r.timers : [])
    .filter((t): t is Timer => Boolean(t) && typeof t === "object" && typeof t.id === "string" && typeof t.endsAt === "number")
    .slice(0, MAX_TIMERS * 2)
    .map((t) => ({
      id: t.id,
      name: String(t.name ?? "Timer").slice(0, 30),
      emoji: typeof t.emoji === "string" ? t.emoji.slice(0, 4) : "⏱",
      durationMs: num(t.durationMs) ?? 60_000,
      endsAt: t.endsAt,
      pausedLeft: num(t.pausedLeft),
      startedAt: num(t.startedAt) ?? t.endsAt - (num(t.durationMs) ?? 0),
      acked: t.acked === true,
      ...(typeof t.step === "string" ? { step: t.step.slice(0, 80) } : {}),
    }));
  const sw = r.stopwatch && typeof r.stopwatch === "object" ? { startedAt: num(r.stopwatch.startedAt), elapsedMs: num(r.stopwatch.elapsedMs) ?? 0 } : null;
  return { timers, stopwatch: sw, hintSeen: r.hintSeen === true, firstAt: num(r.firstAt), lastEnd: num(r.lastEnd) };
}

/** Lange vergessene Timer (älter als 12 Stunden abgelaufen) wegräumen */
export const pruneTimers = (s: TimerState, nowMs: number): TimerState => ({ ...s, timers: s.timers.filter((t) => !isExpired(t, nowMs) || nowMs - t.endsAt < 12 * 3600_000) });

// --- Sprache: "Timer 10 Minuten für die Nudeln" ------------------------------------------

type TimerCommand =
  | { kind: "start"; minutes: number; name: string }
  | { kind: "stop"; name: string }
  | { kind: "status" }
  | { kind: "stopwatch"; action: "start" | "stop" };

const NUMBER_WORDS: Record<string, number> = { eine: 1, einen: 1, ein: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, fünfzehn: 15, zwanzig: 20, dreißig: 30, vierzig: 40, fünfundvierzig: 45, sechzig: 60, halbe: 0.5 };

function minutesIn(text: string): number | null {
  const t = text.toLowerCase();
  if (/\b(eine\s+)?halbe\s+stunde\b/.test(t)) return 30;
  if (/\bdreiviertel\s*stunde\b/.test(t)) return 45;
  if (/\bviertelstunde\b/.test(t)) return 15;
  const m = t.match(/(\d+(?:[.,]\d+)?|[a-zäöüß]+)\s*(minuten|minute|min\b|stunden|stunde|std\b|sekunden|sek\b)/);
  if (!m) return null;
  const n = /\d/.test(m[1]) ? Number(m[1].replace(",", ".")) : NUMBER_WORDS[m[1]];
  if (!n) return null;
  return /^st/.test(m[2]) ? n * 60 : /^sek/.test(m[2]) ? n / 60 : n;
}

/** Name aus "… für die Nudeln", "… Brötchen", "Nudel-Timer" */
function nameIn(text: string): string {
  const after = text.match(/\b(?:für|fuer)\s+(?:die|den|das|meine|unsere)?\s*([\wäöüßÄÖÜ -]{2,30}?)\s*[.!?]?$/i);
  const word = after?.[1] ?? text.replace(/.*\b(?:minuten|minute|min|stunden|stunde|std|sekunden|sek)\b/i, "").replace(/[.!?]/g, "").trim();
  const clean = word.replace(/^(?:die|den|das|für|fuer)\s+/i, "").trim();
  return clean ? clean[0].toUpperCase() + clean.slice(1) : "";
}

/** Timer-Sätze ohne KI erkennen (oder null) */
export function parseTimerCommand(text: string): TimerCommand | null {
  const t = text.trim();
  const low = t.toLowerCase();
  if (/\bstoppuhr\b/.test(low)) return { kind: "stopwatch", action: /\b(stopp|stop|halt|beend|aus)\w*/.test(low) && !/\bstart/.test(low) ? "stop" : "start" };
  if (/\btimer\b/.test(low) && /\b(stopp|stop|beend|lösch|loesch|aus|weg|abbrech)\w*/.test(low) && !minutesIn(low)) {
    const m = low.match(/(?:den|die|das)?\s*([\wäöüß]+)-?timer/);
    return { kind: "stop", name: m && !/^(den|die|das|stopp|stop)$/.test(m[1]) ? m[1] : "" };
  }
  if (/^wie\s+lange\s+(noch|dauert)/.test(low) || /\b(timer|nudeln|reis)\b.*\bwie\s+lange\b/.test(low) || /^wie\s+lange\s+noch\b/.test(low)) return { kind: "status" };
  if (/\b(timer|wecker|weck\s+mich|sag\s+bescheid|erinner\w*\s+mich\s+in)\b/.test(low)) {
    const minutes = minutesIn(low);
    if (minutes) return { kind: "start", minutes, name: nameIn(t.replace(/^(noch\s+ein(en)?\s+)?(timer|wecker)\s*(auf|von|für)?\s*/i, "")) };
  }
  return null;
}

// --- Push (später, Supabase): Timer-Ende als planbare Mitteilung -----------------------

/** Was beim Timer-Ende geschickt würde (für die Push-Planung vorbereitet) */
/** @public */
export function timerPushPlan(t: Timer, helper: string): { at: string; title: string; body: string } | null {
  if (t.pausedLeft !== null) return null;
  return { at: new Date(t.endsAt).toISOString(), title: `${helper}: ${t.emoji} ${t.name}`, body: `${t.name} ist fertig.` };
}
