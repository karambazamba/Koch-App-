// Tipps aus der Region in der App: Einstellungen (Ort, Umkreis, im Kalender
// zeigen), gemerkte und übernommene Tipps – und das Laden über /api/tipps.
// Keine Ortung: der Ort ist der Wetter-Ort, außer man stellt ihn hier um.
// Sichtbar ist alles nur, wenn auf dem Server eine Quelle läuft und der
// Baustein „Tipps aus der Region“ an ist (`useTipsOn`).

import { useEffect, useState } from "react";
import { createLocalStore } from "@/lib/core/localStore";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { TIPS_BAUSTEIN, featureOn, unlockFeature, useFeature } from "@/lib/core/features";
import { unlockHomeTile } from "@/lib/core/homeLayout";
import { createEntry } from "@/lib/core/entries";
import { pushUndo } from "@/lib/core/undo";
import { changeEntries, loadEntries } from "@/lib/kalender/store";
import type { CalendarEntry } from "@/lib/kalender/model";
import { changePins } from "@/lib/pinnwand/store";
import { addPin, createPin } from "@/lib/pinnwand/model";
import { loadPlace, usePlace } from "@/lib/wetter/client";
import { pinboardText, TIP_RADII, tipDate, tipTime, type TipRadius, type TipView } from "@/lib/tipps/model";
import { KATEGORIEN, type Kategorie } from "@/lib/region/kategorien";
import { STANDARD_UMKREIS, UMKREISE, type Umkreis } from "@/lib/region/orte";
import { ALTE_TIPPS } from "@/lib/tipps/alt";

export type TipsMode = "off" | "demo" | "tldb";

type TipSettings = {
  /** v2: „Was los?“ (A-055) – Umkreis 5/15/30 und Kategorien aus; alte Felder bleiben */
  version: 2;
  /** Eigener Ort (sonst der Wetter-Ort) */
  ort: string | null;
  km: TipRadius;
  /** Tipps als lila Ebene im Kalender */
  kalender: boolean;
  gemerkt: string[];
  /** Tipp-ID → ID des daraus angelegten Termins */
  uebernommen: Record<string, string>;
  /** Wochenende (Samstag), an dem die Jetzt-Karte keinen Tipp mehr zeigt */
  jetztAus: string | null;
  /** „Was los?“: Umkreis um den Wohnort */
  umkreis: Umkreis;
  /** „Was los?“: ausgeschaltete Kategorien */
  kategorienAus: Kategorie[];
};

const DEFAULTS: TipSettings = { version: 2, ort: null, km: 20, kalender: true, gemerkt: [], uebernommen: {}, jetztAus: null, umkreis: STANDARD_UMKREIS, kategorienAus: [] };

/** Alter Umkreis (5/10/20/40) → „Was los?“ (5/15/30) */
const umkreisAus = (km: TipRadius): Umkreis => (km <= 5 ? 5 : km <= 20 ? 15 : 30);

function migrateTipSettings(raw: unknown): TipSettings | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Omit<Partial<TipSettings>, "version"> & { version?: number };
  if (r.version !== 1 && r.version !== 2) return null;
  const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  const km = TIP_RADII.includes(r.km as TipRadius) ? (r.km as TipRadius) : 20;
  return {
    version: 2,
    ort: typeof r.ort === "string" && r.ort.trim() ? r.ort.trim().slice(0, 60) : null,
    km,
    kalender: r.kalender !== false,
    gemerkt: strings(r.gemerkt).slice(-100),
    uebernommen: r.uebernommen && typeof r.uebernommen === "object" ? Object.fromEntries(Object.entries(r.uebernommen).filter(([, v]) => typeof v === "string")) : {},
    jetztAus: typeof r.jetztAus === "string" ? r.jetztAus : null,
    umkreis: r.version === 2 && UMKREISE.includes(r.umkreis as Umkreis) ? (r.umkreis as Umkreis) : r.version === 1 ? umkreisAus(km) : STANDARD_UMKREIS,
    kategorienAus: strings(r.kategorienAus).filter((k): k is Kategorie => KATEGORIEN.includes(k as Kategorie)),
  };
}

const store = createLocalStore("wasgibts.regiontipps", migrateTipSettings);
const loadSettings = () => store.load() ?? DEFAULTS;
/** Einstellungen außerhalb von React (auch für „Was los?“) */
export const loadTipSettings = loadSettings;

export function changeTipSettings(change: (s: TipSettings) => TipSettings) {
  store.save(change(loadSettings()));
}

export function useTipSettings(): TipSettings {
  return useExternalStore(store.subscribe, loadSettings, () => DEFAULTS);
}

/** Ort für die Tipps: eigener Ort oder der Wetter-Ort */
export function useTipPlace(): string {
  const s = useTipSettings();
  const weather = usePlace();
  return s.ort ?? weather;
}

// --- Quelle (einmal je Seitenaufruf gefragt) -------------------------------------

let mode: TipsMode | undefined;
let modePromise: Promise<void> | null = null;
const modeListeners = new Set<() => void>();

function askMode() {
  if (modePromise) return;
  // Alte Tipps-Ebene versteckt (A-055): gar nicht erst fragen
  if (!ALTE_TIPPS) {
    mode = "off";
    modePromise = Promise.resolve().then(() => modeListeners.forEach((l) => l()));
    return;
  }
  modePromise = fetch("/api/tipps?nurquelle=1")
    .then((r) => r.json())
    .then((d: { source?: string }) => {
      mode = d.source === "demo" || d.source === "tldb" ? d.source : "off";
    })
    .catch(() => {
      mode = "off";
    })
    .finally(() => modeListeners.forEach((l) => l()));
}

/** off | demo | tldb – undefined, solange noch gefragt wird */
export function useTipsMode(): TipsMode | undefined {
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    modeListeners.add(l);
    askMode();
    return () => {
      modeListeners.delete(l);
    };
  }, []);
  return mode;
}

/** Quelle läuft UND Baustein an */
export function useTipsOn(): boolean {
  const m = useTipsMode();
  const on = useFeature("regiontipps");
  return Boolean(m && m !== "off" && on);
}

// --- Tipps laden ---------------------------------------------------------------------

export type TipsResult = { tips: TipView[]; ort: string | null; mode: TipsMode; failed?: boolean };

const results = new Map<string, TipsResult>();
const pending = new Set<string>();
const listeners = new Set<() => void>();

async function fetchTips(key: string, q: { ort: string; km: number; von: string; bis: string; today: string }) {
  if (pending.has(key)) return;
  pending.add(key);
  try {
    const params = new URLSearchParams({ ort: q.ort, km: String(q.km), von: q.von, bis: q.bis, heute: q.today });
    const res = await fetch(`/api/tipps?${params}`);
    const d = (await res.json()) as { source?: TipsMode; ort?: { name: string } | null; tips?: TipView[] };
    results.set(key, { tips: Array.isArray(d.tips) ? d.tips : [], ort: d.ort?.name ?? null, mode: d.source ?? "off", failed: !res.ok });
  } catch {
    results.set(key, { tips: [], ort: null, mode: mode ?? "off", failed: true });
  } finally {
    pending.delete(key);
    listeners.forEach((l) => l());
  }
}

/** Tipps im Umkreis von–bis; undefined solange geladen wird (nur wenn `enabled`) */
function useRegionTips(von: string, bis: string, today: string, enabled = true): TipsResult | undefined {
  const s = useTipSettings();
  const ort = useTipPlace();
  const key = `${ort}|${s.km}|${von}|${bis}|${today}`;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    if (!results.has(key)) void fetchTips(key, { ort, km: s.km, von, bis, today });
    return () => {
      listeners.delete(l);
    };
  }, [enabled, key, ort, s.km, von, bis, today]);
  return enabled ? results.get(key) : undefined;
}

const plusDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Ein Abruf für alle (Kachel, /tipps, Kalender, Jetzt-Karte): heute + 20 Tage */
export const useTipsWindow = (today: string, enabled = true) => useRegionTips(today, plusDays(today, 20), today, enabled);

/** Ohne Hook (Regeln im Gespräch): dasselbe Fenster wie useTipsWindow */
export async function loadTipsWindow(today: string): Promise<TipsResult> {
  const s = loadSettings();
  const ort = s.ort ?? loadPlace();
  const bis = plusDays(today, 20);
  const key = `${ort}|${s.km}|${today}|${bis}|${today}`;
  if (!results.has(key)) await fetchTips(key, { ort, km: s.km, von: today, bis, today });
  return results.get(key) ?? { tips: [], ort: null, mode: mode ?? "off", failed: true };
}

/** Tipps neu laden (z. B. nach Ändern von Ort/Umkreis) */
export function forgetTips() {
  results.clear();
  listeners.forEach((l) => l());
}

// --- Aktionen ------------------------------------------------------------------------

/** Übernommen und der Termin gibt es noch → im Kalender nicht mehr als Tipp */
export function takenIds(s: TipSettings, entries: CalendarEntry[] | undefined): Set<string> {
  const ids = new Set(entries?.map((e) => e.id) ?? []);
  return new Set(Object.entries(s.uebernommen).filter(([, entryId]) => ids.has(entryId)).map(([tipId]) => tipId));
}

/** „In unseren Kalender“/„Übernehmen“: ein normaler Familientermin (alle sehen ihn) */
export function takeTip(tip: TipView, who: string[] = []): string {
  const time = tipTime(tip);
  const end = tip.ende && !tip.ganztags ? tip.ende.slice(11, 16) : undefined;
  const entry = createEntry(
    "termin",
    {
      title: tip.titel,
      date: tipDate(tip),
      start: time ? tip.beginn.slice(11, 16) : "10:00",
      ...(end ? { end } : {}),
      place: [tip.adresse, tip.ort_name].filter(Boolean).join(", "),
      reminder: "60" as const,
      ...(who.length ? { who } : {}),
      note: "aus Tipps",
      ...(tip.url ? { link: tip.url } : {}),
    },
    { raum: "familie" },
  ) as CalendarEntry;
  changeEntries((list) => [...list, entry]);
  changeTipSettings((s) => ({ ...s, uebernommen: { ...s.uebernommen, [tip.id]: entry.id } }));
  if (!featureOn("regiontipps")) unlockFeature("regiontipps");
  pushUndo(`„${tip.titel}“ eintragen`, () => {
    changeEntries((list) => list.filter((e) => e.id !== entry.id));
    changeTipSettings((s) => {
      const rest = { ...s.uebernommen };
      delete rest[tip.id];
      return { ...s, uebernommen: rest };
    });
  });
  return entry.id;
}

/** „Pinnwand“: kurze Frage an die Familie */
export function pinTip(tip: TipView, me: string): boolean {
  const pin = createPin(pinboardText(tip), me);
  if (!pin) return false;
  const undo = changePins((list) => addPin(list, pin));
  pushUndo("Pinnwand-Nachricht", undo);
  return true;
}

export function toggleRemember(id: string) {
  changeTipSettings((s) => ({ ...s, gemerkt: s.gemerkt.includes(id) ? s.gemerkt.filter((x) => x !== id) : [...s.gemerkt, id] }));
}

export const hideJetztTipWeekend = (key: string) => changeTipSettings((s) => ({ ...s, jetztAus: key }));

/** Lotte nutzt die Tipps: Baustein + Kachel an; liefert den Satz, wo sie stehen (nur beim ersten Mal) */
export function unlockTips(): string | null {
  // Alte Tipps-Ebene versteckt (A-055): keine alte Kachel mehr freischalten
  if (!ALTE_TIPPS || featureOn("regiontipps") || !unlockFeature("regiontipps")) return null;
  unlockHomeTile("tipps");
  return TIPS_BAUSTEIN.where;
}

/** Quelle schon bekannt? (für die Regeln ohne KI; undefined = noch nicht gefragt) */
export const knownTipsMode = () => mode;

/** Für Lotte (Kontext): Ort und Umkreis */
export function tipContext(): { ort: string; km: number } {
  const s = loadSettings();
  return { ort: s.ort ?? loadPlace(), km: s.km };
}

/** Gibt es den Termin zum Tipp noch? */
export const isTaken = (tipId: string) => {
  const id = loadSettings().uebernommen[tipId];
  return Boolean(id && loadEntries().some((e) => e.id === id));
};
