"use client";

import { useEffect, useState } from "react";

// Hilfen für die Bildschirmtastatur auf dem Handy (vor allem iOS Safari):
// - meldet, ob gerade ein Textfeld fokussiert ist (= Tastatur offen)
// - schließt die Tastatur, sobald man die Seite mit dem Finger scrollt
// - scrollt das fokussierte Feld in den sichtbaren Bereich (visualViewport),
//   unter Berücksichtigung der fixierten Kopfzeile

const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

export function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
}

/** Abstand, den das Feld zum Rand des sichtbaren Bereichs halten soll */
const MARGIN = 16;
/** Ab so vielen Pixeln Fingerbewegung gilt es als Scrollen */
const SCROLL_THRESHOLD = 10;

function stickyHeaderHeight(): number {
  const header = document.querySelector<HTMLElement>("[data-sticky-header]");
  return header ? header.offsetHeight : 0;
}

/** Scrollt so wenig wie nötig, damit `el` (samt Label) sichtbar ist. */
export function scrollIntoVisibleArea(el: HTMLElement) {
  const target = el.closest<HTMLElement>("label") ?? el;
  const vv = window.visualViewport;
  const offsetTop = vv?.offsetTop ?? 0;
  const height = vv?.height ?? window.innerHeight;
  const visibleTop = offsetTop + stickyHeaderHeight() + MARGIN;
  const visibleBottom = offsetTop + height - MARGIN;

  const rect = target.getBoundingClientRect();
  let delta = 0;
  if (rect.top < visibleTop) {
    delta = rect.top - visibleTop;
  } else if (rect.bottom > visibleBottom) {
    // Nach unten nur so weit, dass der obere Rand sichtbar bleibt.
    delta = Math.min(rect.bottom - visibleBottom, rect.top - visibleTop);
  }
  if (Math.abs(delta) > 1) window.scrollBy({ top: delta, behavior: "smooth" });
}

/**
 * Liefert `true`, solange auf einem Touch-Gerät ein Textfeld fokussiert ist –
 * also die Bildschirmtastatur offen ist.
 */
export function useMobileKeyboard(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (!isTouch) return;

    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    // Nach dem Öffnen der Tastatur (und dem eigenen Scrollen von iOS) einmal
    // sauber nachjustieren – gebündelt, damit nichts springt.
    const settle = () => {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        const active = document.activeElement;
        if (isTextField(active)) scrollIntoVisibleArea(active);
      }, 120);
    };

    const onFocusIn = (event: FocusEvent) => {
      if (!isTextField(event.target as Element)) return;
      setOpen(true);
      settle();
    };

    const onFocusOut = () => {
      // Beim Wechsel zwischen zwei Feldern nicht kurz "zu" melden.
      setTimeout(() => setOpen(isTextField(document.activeElement)), 0);
    };

    let touchStartY: number | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touchStartY = event.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (touchStartY === null) return;
      const active = document.activeElement;
      if (!isTextField(active)) return;
      // Nur senkrechte Bewegung zählt – Cursor im Feld seitlich verschieben bleibt möglich.
      const y = event.touches[0]?.clientY ?? touchStartY;
      if (Math.abs(y - touchStartY) > SCROLL_THRESHOLD) {
        active.blur();
        touchStartY = null;
      }
    };

    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: true });
    window.visualViewport?.addEventListener("resize", settle);

    return () => {
      clearTimeout(settleTimer);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      window.visualViewport?.removeEventListener("resize", settle);
    };
  }, []);

  return open;
}

/**
 * Enter in einem Feld der Kette `[data-enter-chain]`: zum nächsten Feld der
 * Kette springen, beim letzten die Tastatur schließen.
 */
export function focusNextInChain(current: HTMLElement) {
  const chain = Array.from(document.querySelectorAll<HTMLElement>("[data-enter-chain]"));
  const next = chain[chain.indexOf(current) + 1];
  if (next) next.focus();
  else current.blur();
}

/**
 * Nur melden, ob gerade ein Textfeld fokussiert ist (ohne Scroll-Hilfen) –
 * z. B. um schwebende Knöpfe über der Tastatur auszublenden.
 */
export function useTextFieldFocused(): boolean {
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    const update = () => setTimeout(() => setFocused(isTextField(document.activeElement)), 0);
    document.addEventListener("focusin", update);
    document.addEventListener("focusout", update);
    return () => {
      document.removeEventListener("focusin", update);
      document.removeEventListener("focusout", update);
    };
  }, []);
  return focused;
}

/**
 * Wie weit die Bildschirmtastatur unten in die Seite ragt (iOS verkleinert
 * nur den sichtbaren Bereich, fixierte Elemente unten würden verdeckt).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}
