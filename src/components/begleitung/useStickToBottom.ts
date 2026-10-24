"use client";

// Gespräch scrollt mit: Neue Nachrichten und die wachsende Live-Blase bleiben
// im Bild, solange man unten ist. Scrollt man selbst hoch, bleibt es dort –
// bis man wieder unten ist; bis dahin zeigt `neu` den kleinen Knopf „↓ Neu“.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** So nah am Ende zählt als „unten“ */
const NAH = 48;

export function useStickToBottom(ref: RefObject<HTMLElement | null>) {
  const unten = useRef(true);
  const [neu, setNeu] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ans_ende = () => {
      el.scrollTop = el.scrollHeight;
    };
    const onScroll = () => {
      unten.current = el.scrollHeight - el.scrollTop - el.clientHeight < NAH;
      if (unten.current) setNeu(false);
    };
    const changed = () => {
      if (unten.current) ans_ende();
      else setNeu(true);
    };
    ans_ende();
    el.addEventListener("scroll", onScroll, { passive: true });
    const mo = new MutationObserver(changed);
    mo.observe(el, { childList: true, subtree: true, characterData: true });
    const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(changed);
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      mo.disconnect();
      ro?.disconnect();
    };
  }, [ref]);
  const runter = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    unten.current = true;
    setNeu(false);
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [ref]);
  return { neu, runter };
}
