"use client";

import { useEffect } from "react";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { applyLook, applyTheme } from "@/lib/core/theme";

/**
 * Hält die Ansicht (data-theme am <html>), den Look der Startseite
 * (data-look: farbig/schlicht) und die Farbe der Statusleiste
 * passend zum Profil – auch beim Wechsel der Hell/Dunkel-Einstellung des Handys.
 */
export function ThemeSync() {
  const profile = useProfile();
  const theme = profile?.theme ?? "warm";
  const look = profile?.look ?? "farbig";
  useEffect(() => applyLook(look), [look]);
  useEffect(() => {
    applyTheme(theme);
    if (theme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);
  return null;
}

