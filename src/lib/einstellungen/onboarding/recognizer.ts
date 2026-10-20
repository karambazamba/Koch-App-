"use client";

// Austauschbare Erkennung freier Antworten im Kennenlernen: mit KI über
// /api/kennenlernen (mit Zugangscode und gemeinsamem Tageslimit wie Lotte),
// sonst (oder bei Fehlern) `undefined` – dann erkennt das Gespräch selbst per
// Regeln (./recognize.ts).

import { accessHeaders, aiUsable, deviceId, forgetAccessCode, takeAiSlot } from "../../lotte/client";
import type { Recognized } from "./engine";
import type { RecognizeKind } from "./ai";

const RECOGNIZE_ENDPOINT = "/api/kennenlernen";

/** Nach einem 503 (keine KI eingerichtet) nicht weiter fragen */
let unavailable = false;

export async function recognizeAnswer(
  kind: RecognizeKind | null,
  text: string,
  names: string[],
  person?: string,
): Promise<Recognized | undefined> {
  if (!kind || unavailable || !text.trim()) return undefined;
  // KI aus oder Zugangscode nicht gemerkt → gar nicht fragen, die Regeln reichen
  if (!(await aiUsable())) return undefined;
  if (!takeAiSlot()) return undefined;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(RECOGNIZE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", ...accessHeaders() },
      body: JSON.stringify({ deviceId: deviceId(), kind, text, names, person }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (res.status === 503) unavailable = true;
    if (res.status === 401) forgetAccessCode();
    if (!res.ok) return undefined;
    return (await res.json()) as Recognized;
  } catch {
    return undefined;
  }
}
