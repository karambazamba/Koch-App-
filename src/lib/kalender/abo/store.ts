"use client";

// Speicher der Kalender-Links (`wasgibts.kalenderabos`, nur auf dem Gerät,
// nicht in der Sicherung – außer man wählt es dort ausdrücklich) und ihrer
// Termine (`wasgibts.kalenderabo-termine`, Zwischenspeicher). Abruf über
// /api/kalender-abo steckt in `sync.ts` (erst bei Bedarf geladen).

import { useMemo } from "react";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { featureOn, useFeature } from "@/lib/core/features";
import type { Room } from "@/lib/core/entries";
import { sanitizeEntry, type CalendarEntry } from "@/lib/kalender/model";
import { aboIdOf, isDue, withoutDoubles, type Abo } from "@/lib/kalender/abo/model";
import { now } from "@/lib/core/now";

type AboState = { version: 1; abos: Abo[] };
type FeedState = { version: 1; feeds: Record<string, CalendarEntry[]> };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");

const abos = createLocalStore("wasgibts.kalenderabos", (raw: unknown): AboState | null => {
  if (!raw || typeof raw !== "object" || (raw as AboState).version !== 1) return null;
  const list = Array.isArray((raw as AboState).abos) ? (raw as AboState).abos : [];
  return {
    version: 1,
    abos: list
      .filter((a) => a && typeof a.id === "string" && typeof a.url === "string")
      .map((a) => ({
        id: a.id,
        name: str(a.name, 40) || "Kalender",
        url: str(a.url, 2000),
        color: a.color,
        raum: a.raum === "arbeit" ? "arbeit" : "familie",
        on: a.on !== false,
        fetchedAt: typeof a.fetchedAt === "string" ? a.fetchedAt : null,
        error: typeof a.error === "string" ? a.error : null,
      })),
  };
});

const feeds = createLocalStore("wasgibts.kalenderabo-termine", (raw: unknown): FeedState | null => {
  if (!raw || typeof raw !== "object" || (raw as FeedState).version !== 1) return null;
  const out: Record<string, CalendarEntry[]> = {};
  for (const [id, list] of Object.entries((raw as FeedState).feeds ?? {})) {
    out[id] = (Array.isArray(list) ? list : []).map(sanitizeEntry).filter((e): e is CalendarEntry => e !== null);
  }
  return { version: 1, feeds: out };
});

const EMPTY: Abo[] = [];
const NONE: CalendarEntry[] = [];

export const loadAbos = (): Abo[] => abos.load()?.abos ?? EMPTY;
export const saveAbos = (list: Abo[]) => abos.save({ version: 1, abos: list });
export const patchAbo = (id: string, patch: Partial<Abo>) => saveAbos(loadAbos().map((a) => (a.id === id ? { ...a, ...patch } : a)));
export const saveFeed = (id: string, entries: CalendarEntry[] | null) => {
  const all = { ...(feeds.load()?.feeds ?? {}) };
  if (entries) all[id] = entries;
  else delete all[id];
  feeds.save({ version: 1, feeds: all });
};

export function useAbos(): Abo[] | undefined {
  const data = useExternalStore(abos.subscribe, abos.load, () => undefined);
  return data === undefined ? undefined : (data?.abos ?? EMPTY);
}

/** Termine der eingeschalteten Abos (ohne Baustein: keine – versteckt, nicht gelöscht) */
function visible(list: Abo[], all: Record<string, CalendarEntry[]>): CalendarEntry[] {
  const out = withoutDoubles(list.filter((a) => a.on).flatMap((a) => all[a.id] ?? NONE));
  return out.length ? out : NONE;
}

export function loadAboEntries(): CalendarEntry[] {
  return featureOn("kalender") ? visible(loadAbos(), feeds.load()?.feeds ?? {}) : NONE;
}

export function useAboEntries(): CalendarEntry[] {
  const on = useFeature("kalender");
  const list = useAbos();
  const data = useExternalStore(feeds.subscribe, feeds.load, () => null);
  return useMemo(() => (on && list ? visible(list, data?.feeds ?? {}) : NONE), [on, list, data]);
}

/** Name, Farbe, Familie/Arbeit, an/aus ändern (Raum gilt sofort auch für die Termine) */
export function updateAbo(id: string, patch: Partial<Pick<Abo, "name" | "color" | "raum" | "on" | "url">>) {
  patchAbo(id, patch);
  if (patch.raum) saveFeed(id, (feeds.load()?.feeds[id] ?? []).map((e) => ({ ...e, raum: patch.raum as Room })));
}

/** Entfernen; liefert Rückgängig */
export function removeAbo(id: string): () => void {
  const list = loadAbos();
  const feed = feeds.load()?.feeds[id] ?? null;
  saveAbos(list.filter((a) => a.id !== id));
  saveFeed(id, null);
  return () => {
    saveAbos(list);
    if (feed) saveFeed(id, feed);
  };
}

/** Farbe des Kalenders eines Abo-Termins (null = eigener Termin) */
export function aboOf(entry: Pick<CalendarEntry, "besitzer">): Abo | null {
  const id = aboIdOf(entry);
  return id ? (loadAbos().find((a) => a.id === id) ?? null) : null;
}

/** Ist ein Abruf fällig? (billig – erst dann wird der Abruf mit Parser geladen) */
export const aboRefreshDue = () => featureOn("kalender") && loadAbos().some((a) => isDue(a, now().getTime()));
