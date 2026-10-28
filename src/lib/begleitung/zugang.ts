// Zugang zur KI (klein, ohne Abhängigkeiten zu den Bereichen): gemerkter
// Zugangscode, Geräte-Kennung und der geteilte KI-Status vom Server – auch,
// ob Mias Stimme und Ohr über den Server laufen (`stimme`). Genutzt von
// `client.ts` (Gespräch) und `stimmeClient.ts` (Vorlesen, Zuhören).

import { readRaw, writeRaw } from "@/lib/core/localStore";
import type { StorageKey } from "@/lib/core/storage";
import { einwilligungErteilt } from "@/lib/datenschutz/einwilligung";
import { ACCESS_HEADER, ASSISTANT_ENDPOINT, normalisiereZugangscode, type AssistantStatus } from "@/lib/begleitung/protocol";
import type { StimmeStatus } from "@/lib/begleitung/stimmeProtokoll";

const DEVICE_KEY: StorageKey = "wasgibts.geraet";
const CODE_KEY: StorageKey = "wasgibts.zugangscode";

const codeListeners = new Set<() => void>();

function loadAccessCode(): string {
  try {
    return readRaw(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function storeAccessCode(code: string) {
  try {
    if (code) writeRaw(CODE_KEY, code);
    else writeRaw(CODE_KEY, null);
  } catch {
    // ohne Speicher gilt der Code nur bis zum Neuladen
  }
  statusPromise = null;
  codeListeners.forEach((l) => l());
}

/** Code einmal auf dem Server prüfen (Header, nie URL) und merken; „offline“ = keine Verbindung */
export async function saveAccessCode(code: string): Promise<"ok" | "falsch" | "pause" | "offline"> {
  // Nachsichtig: Groß/klein und Leerzeichen sind egal (der Server vergleicht genauso)
  const trimmed = normalisiereZugangscode(code);
  if (!trimmed) return "falsch";
  try {
    const r = await fetch(ASSISTANT_ENDPOINT, {
      cache: "no-store",
      headers: { [ACCESS_HEADER]: trimmed },
    });
    const s = (await r.json()) as AssistantStatus;
    if (s.access === "pause") return "pause";
    if (s.access !== "ok") return "falsch";
  } catch {
    return "offline";
  }
  storeAccessCode(trimmed);
  return "ok";
}

export function forgetAccessCode() {
  storeAccessCode("");
}

/** Header für KI-Anfragen: gemerkter Zugangscode, falls vorhanden */
export function accessHeaders(): Record<string, string> {
  const code = loadAccessCode();
  return code ? { [ACCESS_HEADER]: code } : {};
}

export function deviceId(): string {
  try {
    let id = readRaw(DEVICE_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `geraet-${Math.random().toString(36).slice(2, 14)}`;
      writeRaw(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return "geraet-ohne-speicher";
  }
}

let statusPromise: Promise<AssistantStatus> | null = null;
const OFF: AssistantStatus = {
  configured: false,
  mock: false,
  needsCode: false,
};

/** KI-Status inkl. Code-Prüfung; Ergebnis wird geteilt */
export function fetchStatus(): Promise<AssistantStatus> {
  const code = loadAccessCode();
  statusPromise ??= fetch(ASSISTANT_ENDPOINT, {
    cache: "no-store",
    headers: code ? { [ACCESS_HEADER]: code } : {},
  })
    .then((r) => (r.ok ? (r.json() as Promise<AssistantStatus>) : OFF))
    .then((s) => {
      // Gemerkter Code stimmt nicht mehr (z. B. geändert) → neu fragen
      if (s.access === "falsch") {
        try {
          writeRaw(CODE_KEY, null);
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

/** Gemerkten Code geändert (gespeichert oder vergessen) */
export function onCodeChange(l: () => void): () => void {
  codeListeners.add(l);
  return () => {
    codeListeners.delete(l);
  };
}

/** Zuletzt bekannter Stand der Server-Stimme (für Entscheidungen ohne Warten) */
let stimmeBekannt: StimmeStatus | null = null;

/**
 * Mias Stimme und Ohr vom Server – nur mit KI-Einwilligung, eingerichteter KI
 * und (falls verlangt) passendem Code; null = Browser wie bisher.
 */
export async function serverStimme(): Promise<StimmeStatus | null> {
  if (!einwilligungErteilt("ki")) return null;
  const s = await fetchStatus();
  stimmeBekannt = s.configured && (!s.needsCode || s.access === "ok") && s.stimme ? s.stimme : null;
  return stimmeBekannt;
}

/** Sofort: Stand von eben (null, solange unbekannt) – dabei still nachfragen */
export function serverStimmeJetzt(): StimmeStatus | null {
  void serverStimme();
  return einwilligungErteilt("ki") ? stimmeBekannt : null;
}
