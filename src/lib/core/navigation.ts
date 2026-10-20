// Zurück-Navigation für die ganze App: Der Zurück-Pfeil geht immer genau eine
// Ebene zurück – dorthin, woher man gekommen ist (wie Wischen nach rechts).
// Dazu merken wir uns den Verlauf innerhalb der App und je Eintrag die
// Scrollhöhe. Vorwärts startet eine Seite oben, zurück landet man genau dort,
// wo man die Seite verlassen hat – egal wie tief verschachtelt.

import type { StorageKey } from "./storage";

const KEY: StorageKey = "wasgibts.verlauf";

type NavState = { stack: string[]; scroll: Record<string, number> };

let state: NavState = { stack: [], scroll: {} };
let lastHistoryCall: "push" | "replace" | null = null;
let popPending = false;
let installed = false;

const currentUrl = () => `${window.location.pathname}${window.location.search}`;
const entryKey = (index: number, url: string) => `${index}:${url}`;
const topKey = () => (state.stack.length ? entryKey(state.stack.length - 1, state.stack[state.stack.length - 1]) : "");

function persist() {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // privater Modus o. Ä. – dann eben nur im Speicher
  }
}

function load(): NavState | null {
  try {
    const raw = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (raw && Array.isArray(raw.stack) && raw.scroll && typeof raw.scroll === "object") return raw;
  } catch {
    // kaputter Eintrag → neu anfangen
  }
  return null;
}

/** Scrollhöhe der aktuellen Seite merken (bevor die nächste kommt) */
function saveScroll() {
  const key = topKey();
  if (!key) return;
  state.scroll[key] = window.scrollY;
  persist();
}

/** Einmalig: History-Aufrufe und Zurück-Gesten beobachten */
export function installNavigationMemory() {
  if (installed || typeof window === "undefined") return;
  installed = true;
  window.history.scrollRestoration = "manual";
  state = load() ?? { stack: [], scroll: {} };
  const push = window.history.pushState.bind(window.history);
  const replace = window.history.replaceState.bind(window.history);
  window.history.pushState = (...args: Parameters<History["pushState"]>) => {
    // Die alte Seite ist hier noch so gescrollt, wie man sie verlässt
    if (args[2] !== undefined && String(args[2]) !== currentUrl()) {
      saveScroll();
      lastHistoryCall = "push";
    }
    push(...args);
  };
  window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    if (args[2] !== undefined && String(args[2]) !== currentUrl()) lastHistoryCall = "replace";
    replace(...args);
  };
  window.addEventListener(
    "popstate",
    () => {
      // Schon verarbeitet (Router hat vor uns gerendert)? Dann nichts tun
      if (state.stack[state.stack.length - 1] === currentUrl()) return;
      saveScroll();
      popPending = true;
    },
    true,
  );
  let ticking = false;
  window.addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        // Nur für die Seite, die gerade wirklich zu sehen ist
        if (state.stack[state.stack.length - 1] === currentUrl()) saveScroll();
      });
    },
    { passive: true },
  );
}

/** Nach jedem Seitenwechsel aufrufen (URL hat sich geändert) */
export function onRouteChange(url: string) {
  const { stack } = state;
  if (stack.length === 0) {
    state.stack = [url];
  } else if (popPending || (lastHistoryCall !== "push" && stack.length > 1 && stack[stack.length - 2] === url)) {
    // Zurück (Pfeil oder Geste) – auch erkannt, wenn das popstate-Ereignis
    // erst nach dem Rendern bei uns ankommt
    popPending = false;
    if (stack.length > 1 && stack[stack.length - 2] === url) stack.pop();
    else if (stack[stack.length - 1] !== url) stack.push(url);
    restoreScroll(state.scroll[topKey()] ?? 0);
  } else if (lastHistoryCall === "replace") {
    stack[stack.length - 1] = url;
  } else if (stack[stack.length - 1] !== url) {
    stack.push(url);
    // Neue Ebene: alte Scrollhöhe dieser Tiefe vergessen, oben starten
    delete state.scroll[topKey()];
    window.scrollTo(0, 0);
  } else {
    // Neu geladen: an der gemerkten Stelle weiter
    restoreScroll(state.scroll[topKey()] ?? 0);
  }
  lastHistoryCall = null;
  // Einträge tiefer als der Verlauf aufräumen
  for (const key of Object.keys(state.scroll)) if (Number(key.split(":")[0]) >= state.stack.length) delete state.scroll[key];
  persist();
}

/**
 * Scrollhöhe wiederherstellen, sobald die Seite hoch genug gerendert ist
 * (Inhalte laden evtl. nach). Bricht ab, sobald man selbst scrollt.
 */
function restoreScroll(y: number) {
  let frames = 0;
  let settled = 0;
  let cancelled = false;
  const cancel = () => {
    cancelled = true;
  };
  window.addEventListener("touchstart", cancel, { once: true, passive: true });
  window.addEventListener("wheel", cancel, { once: true, passive: true });
  const step = () => {
    if (cancelled) return;
    frames++;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (max >= y - 1 || frames > 120) {
      window.scrollTo(0, Math.min(y, Math.max(0, max)));
      settled = Math.abs(window.scrollY - Math.min(y, Math.max(0, max))) < 2 ? settled + 1 : 0;
      // Noch ein paar Frames festhalten, falls etwas nachschiebt
      if (settled >= 8 || frames > 150) return done();
    }
    requestAnimationFrame(step);
  };
  const done = () => {
    window.removeEventListener("touchstart", cancel);
    window.removeEventListener("wheel", cancel);
  };
  requestAnimationFrame(step);
}

/** Die nächste Navigation ersetzt den aktuellen Eintrag (router.replace) */
export function expectReplace() {
  lastHistoryCall = "replace";
}

/** Gibt es in der App eine Ebene, zu der man zurückkann? */
export function canGoBack(): boolean {
  return state.stack.length > 1;
}

// So früh wie möglich einhängen – vor dem Router, damit Zurück-Gesten sicher
// erkannt werden
if (typeof window !== "undefined") installNavigationMemory();
