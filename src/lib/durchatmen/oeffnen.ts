// Durchatmen von überall öffnen (A-051): das Fenster (Kreis auf der
// Startseite, Jetzt-Karte, Einstellungen) oder gleich eine Übung (Mia, „Los“).
// Der Gastgeber `DurchatmenHost` (im Layout über den KitchenHelper) hört zu und
// lädt Fenster bzw. Vollbild erst bei Bedarf. Nur im Arbeitsspeicher.

import { useSyncExternalStore } from "react";
import { now } from "@/lib/core/now";
import { loadDurchatmen } from "@/lib/durchatmen/store";
import { uebungVon } from "@/lib/durchatmen/uebungen";
import { vorschlag } from "@/lib/durchatmen/vorschlag";

export type DurchatmenZustand = {
  /** Fenster „Durchatmen“ offen */
  fenster: boolean;
  /** Laufende Übung (Vollbild) */
  uebung: string | null;
  /** Zählt jeden Start (neue Übung = frischer Bildschirm, auch dieselbe nochmal) */
  start: number;
};

let zustand: DurchatmenZustand = { fenster: false, uebung: null, start: 0 };
const hoerer = new Set<() => void>();
const startHoerer = new Set<(id: string) => void>();

function setzen(neu: DurchatmenZustand) {
  zustand = neu;
  hoerer.forEach((h) => h());
}

/** Fenster „Durchatmen“ öffnen */
export function oeffneDurchatmen() {
  setzen({ ...zustand, fenster: true });
}

export function schliesseDurchatmen() {
  if (zustand.fenster) setzen({ ...zustand, fenster: false });
}

/** Übung starten („vorschlag“ = was gerade passt); liefert die ID */
export function starteDurchatmen(id: string): string {
  const u = id === "vorschlag" || !uebungVon(id) ? vorschlag(now(), loadDurchatmen().lieblinge).id : id;
  setzen({ fenster: false, uebung: u, start: zustand.start + 1 });
  startHoerer.forEach((h) => h(u));
  return u;
}

/** Übung zu (✕, Fertig) */
export function beendeDurchatmen() {
  if (zustand.uebung) setzen({ ...zustand, uebung: null });
}

/** Für die Bühne: eine Übung startet (Mia tritt zur Seite) */
export function onDurchatmenStart(h: (id: string) => void): () => void {
  startHoerer.add(h);
  return () => void startHoerer.delete(h);
}

export const durchatmenZustand = () => zustand;

const abo = (h: () => void) => {
  hoerer.add(h);
  return () => void hoerer.delete(h);
};

export function useDurchatmenZustand(): DurchatmenZustand {
  return useSyncExternalStore(abo, durchatmenZustand, durchatmenZustand);
}
