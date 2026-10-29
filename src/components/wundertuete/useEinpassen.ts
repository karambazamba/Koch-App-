"use client";

// Nichts abgeschnitten (A-045) in der Wundertüte: Frage und Antwort stehen
// in einer festen Fläche (Raster, Tafel 118). Statt „…“ oder Abschneiden
// wird die Schrift Stufe für Stufe kleiner, bis der Text ganz hineinpasst;
// die Frage vorn möglichst in höchstens 2 Zeilen (A-059).
// Der Kopf nimmt die Kurzform der Sorte, wenn der Name nicht in die Zeile
// passt, und zeigt nur das Symbol, wenn auch die nicht passt. Gemessen wird vor dem Zeichnen und wieder, wenn sich die Fläche
// ändert (Drehen, Schrift geladen).

import { useLayoutEffect, type RefObject } from "react";

/** Eine Zeile (Kopf): nichts ragt seitlich heraus */
const passtBreit = (box: HTMLElement) => box.scrollWidth <= box.clientWidth;

/** Ganz zu sehen: nichts ragt aus der Fläche (gerundete scroll-Werte reichen nicht, ein halbes Pixel schneidet schon an) */
const passt = (box: HTMLElement) => {
  if (box.scrollWidth > box.clientWidth) return false;
  const b = box.getBoundingClientRect();
  const inhalt = box.firstElementChild?.getBoundingClientRect();
  return !inhalt || (inhalt.bottom <= b.bottom && inhalt.right <= b.right + 0.5);
};

/** Messen bei jeder Änderung der Fläche und sobald die Schrift geladen ist */
function beobachten(box: HTMLElement, messen: () => void) {
  messen();
  const ro = new ResizeObserver(messen);
  ro.observe(box);
  let aus = false;
  document.fonts?.ready.then(() => !aus && messen()).catch(() => {});
  return () => {
    aus = true;
    ro.disconnect();
  };
}

/**
 * Ein Versuch beim Einpassen: vorher die Karte vorbereiten (z. B. kurzer Satz
 * unten, `data-eng`), und ob die Frage dabei höchstens `zeilen` Zeilen haben
 * darf (A-059: lieber kleiner als drei Zeilen).
 */
export type Versuch = { vorbereiten?: (karte: Element | null) => void; zeilen?: number };

/** Erst mit dem vollen Satz unten, dann mit der Kurzform (`data-eng`, z. B. auf dem iPhone SE) */
export const SATZ_KURZ: Versuch[] = [{ vorbereiten: (k) => k?.toggleAttribute("data-eng", false) }, { vorbereiten: (k) => k?.toggleAttribute("data-eng", true) }];

/** Zeilen eines Textes (Höhe durch Zeilenhöhe) */
function zeilenVon(el: HTMLElement | null): number {
  if (!el || !el.offsetParent) return 0;
  const lh = parseFloat(getComputedStyle(el).lineHeight);
  return lh > 0 ? Math.round(el.getBoundingClientRect().height / lh) : 0;
}

/**
 * Größte Schrift aus `stufen` (px), bei der der Inhalt von `box` ganz zu
 * sehen ist; Versuch für Versuch (`versuche`), passt keine, bleibt die
 * kleinste im letzten Versuch. `key` = Auslöser fürs Neu-Messen.
 */
export function useSchriftEinpassen(box: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, stufen: readonly number[], key: string, versuche: Versuch[] = SATZ_KURZ) {
  useLayoutEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    const karte = b.closest("section");
    return beobachten(b, () => {
      const frage = t.querySelector<HTMLElement>("[data-frage]");
      for (const v of versuche) {
        v.vorbereiten?.(karte);
        for (const px of stufen) {
          t.style.fontSize = `${px}px`;
          if (passt(b) && (!v.zeilen || zeilenVon(frage) <= v.zeilen)) return;
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stufen` und `versuche` sind je Seite fest, `key` deckt den Text ab
  }, [box, text, key]);
}

/**
 * Kopf: der volle Name, wenn er in die Zeile passt, sonst die Kurzform, sonst
 * keiner (das Symbol davor bleibt, VoiceOver hört die Sorte am Kärtchen). Beide
 * stehen im DOM (`data-name="voll" | "kurz"`), die nicht passende ist versteckt.
 */
export function useNameEinpassen(box: RefObject<HTMLElement | null>, key: string) {
  useLayoutEffect(() => {
    const b = box.current;
    if (!b) return;
    const voll = b.querySelector<HTMLElement>("[data-name=voll]");
    const kurz = b.querySelector<HTMLElement>("[data-name=kurz]");
    if (!voll || !kurz) return;
    return beobachten(b, () => {
      voll.hidden = false;
      kurz.hidden = true;
      if (passtBreit(b)) return;
      voll.hidden = true;
      kurz.hidden = false;
      if (passtBreit(b)) return;
      // Auch die Kurzform passt nicht (Rückseite mit Teilen auf ganz schmalen Handys): nur das Symbol
      kurz.hidden = true;
    });
  }, [box, key]);
}
