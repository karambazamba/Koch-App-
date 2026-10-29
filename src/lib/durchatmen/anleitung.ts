"use client";

// Mia leitet an (A-051, Tafel 139): Was bei welchem Ereignis zu hören bzw. zu
// spüren ist – je nach Art „Stimme + Klang“, „Nur Klang“ oder „Still“.
// Stimme: feste Ansagen über den einen Weg der Sprachausgabe (`speak` mit
// Datei, `ersatz: false`) – nur Mias Stimme, nie die Stimme des Handys (A-061).
// Atem-Wörter in den ersten beiden Runden, mit „Mia zählt mit“ immer.
// Klang: Atem-Ton, leises Klingen beim Wechsel, Gong am Ende. Vibration im
// Takt, wo es geht. Nichts wird aufgenommen.

import { speak, stopSpeaking } from "@/lib/begleitung/speech";
import { DATEI_LAUT, ansageText, ansageUrl } from "@/lib/durchatmen/ansagen";
import { atemPhase, gong, klingen, tonAus, vibrieren } from "@/lib/durchatmen/klang";
import type { Ereignis } from "@/lib/durchatmen/ablauf";
import type { Art } from "@/lib/durchatmen/store";
import type { Uebung } from "@/lib/durchatmen/uebungen";

/** Eine Ansage sprechen (`anhaengen` = nach dem, was gerade läuft) – NUR Mias Stimme; fehlt die Datei: still (es bleibt der Klang) */
export function sage(id: string, anhaengen = false) {
  const text = ansageText(id);
  const url = ansageUrl(id);
  if (!text || !url) return;
  speak(text, { id: "durchatmen", datei: url, ersatz: false, laut: DATEI_LAUT, anhaengen });
}

/** Die Ansagen einer Übung schon vorab holen (Service-Worker merkt sie sich; beim ersten Mal erzeugt der Server sie) */
export function ansagenVorholen(ids: readonly string[]) {
  for (const id of new Set(ids)) {
    const url = ansageUrl(id);
    if (url) void fetch(url).catch(() => {});
  }
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
