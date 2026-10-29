// „Was los?“ in der App: Liste einmal je Seitenaufruf von /api/region holen
// (öffentlich, für alle gleich – es geht nichts Persönliches zum Server),
// Baustein an/aus (Standard an für Wohnorte in Ostholstein), Umkreis und
// Kategorien (Speicher `wasgibts.regiontipps` v2), Eintragen in den Kalender
// (Raum Familie) und Zettel an der Pinnwand. Für den Mini-Kreis auf der
// Startseite (Paket A): `useWasLosSichtbar()`.

import { useEffect, useState } from "react";
import { createEntry } from "@/lib/core/entries";
import { featureOn, setFeature, unlockFeature, useBausteine, useBausteineAus, featureAus, TIPS_BAUSTEIN, type Feature } from "@/lib/core/features";
import { berlinTime, todayIso, toIsoDate, useMinutes, useToday } from "@/lib/core/now";
import { pushUndo } from "@/lib/core/undo";
import { loadNotify } from "@/lib/heute/mitteilungen/einstellungen";
import { sanitizeEntry, upsertEntry, type CalendarEntry } from "@/lib/kalender/model";
import { changeEntries, loadEntries } from "@/lib/kalender/store";
import { changePins } from "@/lib/pinnwand/store";
import { addPin, createPin } from "@/lib/pinnwand/model";
import { loadPlace, usePlace } from "@/lib/wetter/client";
import { changeTipSettings, useTipSettings, loadTipSettings } from "@/lib/tipps/client";
import { imUmkreis, pinnwandZettel, sanitizeEvent, terminDaten, wasLosSichtbar, type RegionEvent, type RegionQuelle } from "@/lib/region/model";
import { inOstholstein, orteImUmkreis, type Umkreis } from "@/lib/region/orte";
import type { Kategorie } from "@/lib/region/kategorien";

export type WasLosDaten = { quelle: RegionQuelle; events: RegionEvent[]; status: { lauf: string; treffer: number; grund: string } | null; failed?: boolean };

// --- Laden (einmal je Seitenaufruf und Tag) ---------------------------------------

let daten: { tag: string; wert: WasLosDaten } | undefined;
let laeuft: Promise<WasLosDaten> | null = null;
const hoerer = new Set<() => void>();

/** Liste holen (für Hooks und Mias Regeln ohne KI) */
export function ladeWasLos(heute: string): Promise<WasLosDaten> {
  if (daten?.tag === heute) return Promise.resolve(daten.wert);
  if (laeuft) return laeuft;
  laeuft = fetch(`/api/region?heute=${heute}`)
    .then(async (r) => {
      const d = (await r.json()) as { quelle?: string; events?: unknown[]; status?: WasLosDaten["status"] };
      const quelle: RegionQuelle = d.quelle === "demo" || d.quelle === "kreisoh" ? d.quelle : "aus";
      return { quelle, events: (d.events ?? []).map(sanitizeEvent).filter((e): e is RegionEvent => e !== null), status: d.status ?? null, ...(r.ok ? {} : { failed: true }) };
    })
    .catch((): WasLosDaten => ({ quelle: "aus", events: [], status: null, failed: true }))
    .then((wert) => {
      daten = { tag: heute, wert };
      laeuft = null;
      hoerer.forEach((l) => l());
      return wert;
    });
  return laeuft;
}

/** Alle Veranstaltungen (ohne Umkreis); undefined solange geladen wird */
export function useWasLosDaten(): WasLosDaten | undefined {
  const day = useToday();
  const heute = day ? toIsoDate(day) : null;
  const [, tick] = useState(0);
  useEffect(() => {
    if (!heute) return;
    const l = () => tick((n) => n + 1);
    hoerer.add(l);
    void ladeWasLos(heute);
    return () => {
      hoerer.delete(l);
    };
  }, [heute]);
  return heute && daten?.tag === heute ? daten.wert : undefined;
}

// --- Baustein -----------------------------------------------------------------------

const KEY: Feature = "regiontipps";

/** An? Selbst an – oder Standard: Wohnort in Ostholstein und nicht selbst ausgeschaltet */
export const wasLosAn = (on: Feature[], aus: Feature[], wohnort: string | null | undefined) => on.includes(KEY) || (!aus.includes(KEY) && inOstholstein(wohnort));

/** Wohnort für „Was los?“: eigener Ort (alte Tipps-Einstellung) oder der Wetter-Ort */
export function useWasLosOrt(): string {
  const s = useTipSettings();
  const wetter = usePlace();
  return s.ort ?? wetter;
}
const ladeOrt = () => loadTipSettings().ort ?? loadPlace();

/** Baustein an? (`undefined` = lädt) */
export function useWasLosAn(): boolean | undefined {
  const on = useBausteine();
  const aus = useBausteineAus();
  const ort = useWasLosOrt();
  if (on === undefined || aus === undefined) return undefined;
  return wasLosAn(on, aus, ort);
}

/** Außerhalb von React */
export const wasLosAnJetzt = () => featureOn(KEY) || (!featureAus(KEY) && inOstholstein(ladeOrt()));

/** Schalten (Einstellungen, Mehr Funktionen); aus bleibt aus, auch in Ostholstein */
export function setWasLos(on: boolean): boolean {
  const vorher = wasLosAnJetzt();
  setFeature(KEY, on);
  return vorher !== on;
}

/** Mia nutzt „Was los?“, obwohl es aus ist: einschalten und sagen, wo es steht (nur beim ersten Mal) */
export function wasLosFreischalten(): string | null {
  if (wasLosAnJetzt()) return null;
  return unlockFeature(KEY) ? TIPS_BAUSTEIN.where : null;
}

// --- Einstellungen ------------------------------------------------------------------

export type WasLosEinstellungen = { umkreis: Umkreis; kategorienAus: Kategorie[] };

export function useWasLosEinstellungen(): WasLosEinstellungen {
  const s = useTipSettings();
  return { umkreis: s.umkreis, kategorienAus: s.kategorienAus };
}

export const setUmkreis = (umkreis: Umkreis) => changeTipSettings((s) => ({ ...s, umkreis }));
export const setKategorie = (k: Kategorie, an: boolean) => changeTipSettings((s) => ({ ...s, kategorienAus: an ? s.kategorienAus.filter((x) => x !== k) : [...new Set([...s.kategorienAus, k])] }));

/** Für Mia (Kontext an den Server): Wohnort, Umkreis, ausgeschaltete Kategorien */
export function wasLosKontext(): { ort: string; umkreis: Umkreis; kategorienAus: Kategorie[] } {
  const s = loadTipSettings();
  return { ort: ladeOrt(), umkreis: s.umkreis, kategorienAus: s.kategorienAus };
}

// --- Liste für das Fenster -------------------------------------------------------------

export type WasLosListe = WasLosDaten & { ort: string; umkreis: Umkreis; alle: RegionEvent[] };

/** Veranstaltungen im Umkreis des Wohnorts, ohne ausgeschaltete Kategorien */
export function useWasLosListe(): WasLosListe | undefined {
  const d = useWasLosDaten();
  const ort = useWasLosOrt();
  const e = useWasLosEinstellungen();
  if (!d) return undefined;
  return { ...d, ort, umkreis: e.umkreis, alle: d.events, events: imUmkreis(d.events, orteImUmkreis(ort, e.umkreis), e) };
}

/**
 * Für den Mini-Kreis „Was los?“ (Paket A, Tafel 143): Quelle an, Baustein an
 * und in den nächsten 14 Tagen etwas im Umkreis. Solange geladen wird: false.
 */
export function useWasLosSichtbar(): boolean {
  const liste = useWasLosListe();
  const an = useWasLosAn();
  if (!liste) return false;
  return wasLosSichtbar({ quelle: liste.quelle, baustein: Boolean(an) });
}

// --- Aktionen ----------------------------------------------------------------------------

/** Schon eingetragen (und der Termin gibt es noch)? */
export function istEingetragen(eventId: string, entries: CalendarEntry[] = loadEntries()): boolean {
  const id = loadTipSettings().uebernommen[eventId];
  return Boolean(id && entries.some((e) => e.id === id));
}

/** „In den Kalender“: sofort ein Familientermin mit Link zur Quelle; liefert Termin + Rückgängig */
export function inDenKalender(e: RegionEvent, tag = e.datum < todayIso() ? todayIso() : e.datum): { entry: CalendarEntry; undo: () => void } | null {
  const entry = sanitizeEntry(createEntry("termin", { ...terminDaten(e, tag), reminder: loadNotify().defaultReminder, repeat: null }, { raum: "familie" }) as CalendarEntry);
  if (!entry) return null;
  const zurueckTermin = changeEntries((list) => upsertEntry(list, entry));
  changeTipSettings((s) => ({ ...s, uebernommen: { ...s.uebernommen, [e.id]: entry.id } }));
  const undo = pushUndo(`${e.titel} eingetragen`, () => {
    zurueckTermin();
    changeTipSettings((s) => {
      const rest = { ...s.uebernommen };
      delete rest[e.id];
      return { ...s, uebernommen: rest };
    });
  });
  return { entry, undo };
}

/** „An die Pinnwand“: Zettel „Sa 17:00 Nachtwächter-Rundgang · Wer kommt mit?“ */
export function anDiePinnwand(e: RegionEvent, me: string, tag = e.datum < todayIso() ? todayIso() : e.datum): boolean {
  const pin = createPin(pinnwandZettel(e, tag), me || "Ich");
  if (!pin) return false;
  pushUndo("Zettel an der Pinnwand", changePins((list) => addPin(list, pin)));
  return true;
}

/** Minuten jetzt (Berlin) – für „heute schon vorbei“ außerhalb von React */
export const jetztMinuten = () => berlinTime().minutes;
