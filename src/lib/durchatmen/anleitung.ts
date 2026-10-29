"use client";

// Mia leitet an (A-051, Tafel 139): Was bei welchem Ereignis zu hören bzw. zu
// spüren ist – je nach Art „Stimme + Klang“, „Nur Klang“ oder „Still“.
// Stimme: feste Ansagen über den einen Weg der Sprachausgabe (`speak`, mit
// vorab erzeugter Datei, sonst die Stimme des Handys – langsamer, leiser).
// Atem-Wörter in den ersten beiden Runden, mit „Mia zählt mit“ immer.
// Klang: Atem-Ton, leises Klingen beim Wechsel, Gong am Ende. Vibration im
// Takt, wo es geht. Nichts wird aufgenommen.

import { speak, stopSpeaking } from "@/lib/begleitung/speech";
import { AUDIO_LISTE, DATEI_LAUT, HANDY_LAUT, HANDY_TEMPO, ansageText, liesAudioListe, stimmeWeg, type AudioListe } from "@/lib/durchatmen/ansagen";
import { atemPhase, gong, klingen, tonAus, vibrieren } from "@/lib/durchatmen/klang";
import type { Ereignis } from "@/lib/durchatmen/ablauf";
import type { Art } from "@/lib/durchatmen/store";
import type { Uebung } from "@/lib/durchatmen/uebungen";

let liste: AudioListe | null = null;
let geladen: Promise<void> | null = null;

/** Liste der erzeugten Ansagen einmal holen (fehlt sie: Handy-Stimme, kein Fehler) */
export function audioListeLaden(): Promise<void> {
  geladen ??= fetch(AUDIO_LISTE)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      liste = liesAudioListe(d);
    })
    .catch(() => {
      liste = null;
    });
  return geladen;
}

/** Eine Ansage sprechen (`anhaengen` = nach dem, was gerade läuft) */
export function sage(id: string, anhaengen = false) {
  const text = ansageText(id);
  if (!text) return;
  const weg = stimmeWeg(liste, id);
  speak(text, { id: "durchatmen", quelle: "handy", tempo: HANDY_TEMPO, laut: weg.art === "datei" ? DATEI_LAUT : HANDY_LAUT, anhaengen, ...(weg.art === "datei" ? { datei: weg.url } : {}) });
}

/** Ereignis der Übung → Stimme, Klang, Vibration */
export function anleiten(e: Ereignis, u: Uebung, o: { art: Art; zaehlen: boolean; erstes: boolean }) {
  const stimme = o.art === "stimme";
  const klang = o.art !== "still";
  if (e.art === "ende") {
    if (klang) gong();
    if (stimme) sage("ende", true);
    vibrieren(60);
    return;
  }
  vibrieren();
  if (e.art === "phase") {
    const takt = u.takt.find((t) => t.phase === e.phase);
    if (klang) {
      if (!o.erstes) klingen();
      atemPhase(e.phase, takt?.s ?? 4);
    }
    if (stimme && (o.zaehlen || e.runde < 2)) sage(e.phase, o.erstes);
    return;
  }
  if (klang && !o.erstes) klingen();
  if (stimme) sage(e.ansage, o.erstes);
}

/** Alles still (Pause, ✕) */
export function anleitungStill() {
  tonAus();
  stopSpeaking();
}
