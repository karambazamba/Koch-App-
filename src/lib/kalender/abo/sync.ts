"use client";

// Kalender-Links abrufen: über /api/kalender-abo, beim Öffnen der App und
// höchstens alle 30 Minuten (`refreshAbos`), beim Verbinden sofort
// (`addAbo`). Änderungen und Löschungen im Original kommen so von selbst an.
// Erst bei Bedarf geladen (bringt den Kalender-Parser mit).

import { featureOn } from "@/lib/core/features";
import { newId } from "@/lib/einstellungen/profileModel";
import { now, nowIso, todayIso } from "@/lib/core/now";
import type { Room } from "@/lib/core/entries";
import { isDue, nextColor, type Abo } from "@/lib/kalender/abo/model";
import { feedEntries } from "@/lib/kalender/abo/feed";
import { loadAbos, patchAbo, removeAbo, saveAbos, saveFeed } from "@/lib/kalender/abo/store";

/** Kalender-Text über den Server holen; Fehler als Satz */
async function download(url: string): Promise<{ ics: string } | { error: string }> {
  try {
    const res = await fetch("/api/kalender-abo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const body = (await res.json().catch(() => ({}))) as { ics?: string; error?: string };
    return body.ics ? { ics: body.ics } : { error: body.error ?? "Den Kalender konnte ich gerade nicht abrufen." };
  } catch {
    return { error: "Gerade keine Verbindung – ich versuche es später nochmal." };
  }
}

/** Ein Abo abrufen und seine Termine speichern; liefert Anzahl oder Fehler */
async function refreshOne(abo: Abo): Promise<{ count: number; name: string | null } | { error: string }> {
  const got = await download(abo.url);
  if ("error" in got) {
    patchAbo(abo.id, { error: got.error });
    return got;
  }
  const feed = feedEntries(abo, got.ics, todayIso());
  if (!feed) {
    patchAbo(abo.id, { error: "Unter dem Link liegt kein Kalender." });
    return { error: "Unter dem Link liegt kein Kalender." };
  }
  saveFeed(abo.id, feed.entries);
  patchAbo(abo.id, { fetchedAt: nowIso(), error: null });
  return { count: feed.entries.length, name: feed.name };
}

/** Neuen Kalender verbinden (erst abrufen, dann speichern) */
export async function addAbo(input: { url: string; name: string; raum: Room }): Promise<{ count: number } | { error: string }> {
  const list = loadAbos();
  const abo: Abo = { id: newId(), name: input.name.trim().slice(0, 40), url: input.url.trim(), color: nextColor(list), raum: input.raum, on: true, fetchedAt: null, error: null };
  saveAbos([...list, abo]);
  const result = await refreshOne(abo);
  if ("error" in result) {
    removeAbo(abo.id);
    return result;
  }
  if (!abo.name && result.name) patchAbo(abo.id, { name: result.name.slice(0, 40) });
  else if (!abo.name) patchAbo(abo.id, { name: "Kalender" });
  return { count: result.count };
}

let running: Promise<void> | null = null;

/** Fällige Abos abrufen (beim Öffnen der App, höchstens alle 30 Minuten); `force` = alle sofort */
export function refreshAbos(force = false): Promise<void> {
  if (!featureOn("kalender")) return Promise.resolve();
  if (running) return running;
  const nowMs = now().getTime();
  const due = loadAbos().filter((a) => a.on && (force || isDue(a, nowMs)));
  if (!due.length) return Promise.resolve();
  running = Promise.all(due.map(refreshOne))
    .then(() => undefined)
    .finally(() => {
      running = null;
    });
  return running;
}

