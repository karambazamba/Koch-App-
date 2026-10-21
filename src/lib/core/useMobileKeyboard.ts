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

function isTextField(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  if (el instanceof HTMLTextAreaElement) return true;
  return el instanceof HTMLInputElement && !NON_TEXT_INPUTS.has(el.type);
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
