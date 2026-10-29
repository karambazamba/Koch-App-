"use client";

// Einkauf: unbekannte Sachen einmal von der KI einordnen lassen (A-067). Nur
// mit Laden-Plan, nur Sachen, die die Wortliste nicht kennt, jede nur einmal
// (gespeichert in `sortenKi`, je Sitzung höchstens einmal gefragt). Ohne KI
// bleibt die Sache still beim Hauptladen.

import { useEffect } from "react";
import { accessHeaders, aiUsable, deviceId, forgetAccessCode, takeAiSlot } from "@/lib/begleitung/client";
import { store, update } from "@/lib/einkauf/listStore";
import { isSorte, unbekannteSorten, type SorteId } from "@/lib/einkauf/sorten/sorten";

/** In dieser Sitzung schon gefragt (auch ohne Ergebnis) */
const GEFRAGT = new Set<string>();
let aus = false;

/** Sorten speichern (Haushalt, über den Abgleich der Einstellungen) */
function sortenMerken(neu: Record<string, SorteId>) {
  const ok = Object.entries(neu).filter(([, v]) => isSorte(v));
  if (!ok.length) return;
  update((s) => ({ ...s, sortenKi: { ...(s.sortenKi ?? {}), ...Object.fromEntries(ok) } }));
}

/** Namen einordnen lassen (still, im Hintergrund) */
async function sortenNachfragen(namen: readonly string[]): Promise<void> {
  const s = store.load();
  if (aus || !s?.ladenPlan) return;
  const offen = unbekannteSorten(namen, s.sortenKi).filter((n) => !GEFRAGT.has(n));
  if (!offen.length) return;
  offen.forEach((n) => GEFRAGT.add(n));
  if (!(await aiUsable()) || !takeAiSlot()) return;
  try {
    const res = await fetch("/api/einkauf-sorten", {
      method: "POST",
      headers: { "content-type": "application/json", ...accessHeaders() },
      body: JSON.stringify({ deviceId: deviceId(), namen: offen }),
    });
    if (res.status === 503) aus = true;
    if (res.status === 401) forgetAccessCode();
    if (!res.ok) return;
    const data = (await res.json()) as { sorten?: Record<string, unknown> };
    sortenMerken(Object.fromEntries(Object.entries(data.sorten ?? {}).filter((e): e is [string, SorteId] => isSorte(e[1]))));
  } catch {
    // offline: beim nächsten Start wieder
  }
}

/** Offene Sachen einordnen, sobald sie da sind */
export function useSortenEinordnen(namen: readonly string[], an: boolean) {
  const key = an ? namen.join("|") : "";
  useEffect(() => {
    if (key) void sortenNachfragen(key.split("|"));
  }, [key]);
}
