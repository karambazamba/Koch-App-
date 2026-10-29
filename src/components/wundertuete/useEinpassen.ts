"use client";

// Nichts abgeschnitten (A-045) in der Wundertüte: Frage und Antwort stehen
// in einer festen Fläche (Raster, Tafel 118). Statt „…“ oder Abschneiden
// wird die Schrift Stufe für Stufe kleiner, bis der Text ganz hineinpasst.
// Der Kopf nimmt die Kurzform der Sorte, wenn der Name nicht in die Zeile
// passt, und zeigt nur das Symbol, wenn auch die nicht passt. Gemessen wird vor dem Zeichnen und wieder, wenn sich die Fläche
// ändert (Drehen, Schrift geladen).

import { useLayoutEffect, type RefObject } from "react";

const passt = (box: HTMLElement) => box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1;

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
 * Größte Schrift aus `stufen` (px), bei der der Inhalt von `box` ganz zu
 * sehen ist; passt keine, bleibt die kleinste. `text` = Auslöser fürs Neu-Messen.
 */
export function useSchriftEinpassen(box: RefObject<HTMLElement | null>, text: RefObject<HTMLElement | null>, stufen: readonly number[], key: string) {
  useLayoutEffect(() => {
    const b = box.current;
    const t = text.current;
    if (!b || !t) return;
    const seite = b.closest("section");
    return beobachten(b, () => {
      // Erst mit dem vollen Hinweis unten; passt die Frage selbst in der
      // kleinsten Stufe nicht, mit dem kurzen (`data-eng`, z. B. Schätz mal auf dem iPhone SE)
      for (const eng of [false, true]) {
        seite?.toggleAttribute("data-eng", eng);
        for (const px of stufen) {
          t.style.fontSize = `${px}px`;
          if (passt(b)) return;
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `stufen` ist je Größe fest, `key` deckt den Text ab
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
      if (passt(b)) return;
      voll.hidden = true;
      kurz.hidden = false;
      if (passt(b)) return;
      // Auch die Kurzform passt nicht (Rückseite mit Teilen auf ganz schmalen Handys): nur das Symbol
      kurz.hidden = true;
    });
  }, [box, key]);
}
