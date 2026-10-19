"use client";

// Bildschirm anlassen (Kochen, Kochansicht) – nur wo der Browser das kann
// (Screen Wake Lock). Sonst still weiter, ohne Meldung.

import { useEffect } from "react";

export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return;
    type Sentinel = { release: () => Promise<void> };
    const nav = navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<Sentinel> } };
    let sentinel: Sentinel | null = null;
    let cancelled = false;
    const request = () =>
      nav.wakeLock
        ?.request("screen")
        .then((s) => {
          if (cancelled) void s.release();
          else sentinel = s;
        })
        .catch(() => {});
    void request();
    // Nach dem Zurückkehren in die App neu anfordern
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      void sentinel?.release().catch(() => {});
    };
  }, [active]);
}
