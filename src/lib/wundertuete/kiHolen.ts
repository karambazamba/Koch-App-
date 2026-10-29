"use client";

// Mias Nachschub im Browser (A-052): fragt `/api/nachschub` nach neuen Witzen
// bzw. Rätseln – nur, wenn die KI eingerichtet ist, die Person zugestimmt hat
// und der Zugangscode stimmt; zählt wie jede KI-Anfrage ins Tageslimit. Wird
// erst geladen, wenn der Vorrat unter 20 fällt (`import()` in den Speichern).

import { accessHeaders, aiUsable, deviceId, forgetAccessCode, takeAiSlot } from "@/lib/begleitung/client";
import type { KiHolen } from "@/lib/wundertuete/vorrat";
import type { KiAntwort } from "@/lib/wundertuete/kiKarte";

export const kiHolen: KiHolen = async (anfrage) => {
  if (!(await aiUsable()) || !takeAiSlot()) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch("/api/nachschub", {
      method: "POST",
      headers: { "content-type": "application/json", ...accessHeaders() },
      body: JSON.stringify({ deviceId: deviceId(), ...anfrage }),
      signal: controller.signal,
    });
    if (res.status === 401) forgetAccessCode();
    if (!res.ok) return null;
    const data = (await res.json()) as { karten?: Partial<KiAntwort>[] };
    return (data.karten ?? []).flatMap((k) => (typeof k.vorne === "string" ? [{ vorne: k.vorne, ...(typeof k.hinten === "string" ? { hinten: k.hinten } : {}) }] : []));
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};
