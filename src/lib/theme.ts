// Ansichten der App (Profil v15 `theme`). Die Farben selbst stehen als
// CSS-Variablen in globals.css; hier nur das Umschalten und die Farbe der
// Statusleiste (theme-color).

import type { AppTheme } from "./profile";

/** Hintergrundfarbe je Ansicht – für die Statusleiste und die Vorschau-Karten */
export const THEME_COLORS: Record<Exclude<AppTheme, "auto">, { background: string; surface: string; accent: string; ink: string; muted: string; line: string }> = {
  warm: { background: "#f8f4ee", surface: "#ffffff", accent: "#f26b21", ink: "#1f1b16", muted: "#6f675f", line: "#ece6de" },
  nacht: { background: "#17191c", surface: "#23262b", accent: "#ff8a4c", ink: "#f2eee9", muted: "#aaa49c", line: "#353a41" },
  frisch: { background: "#f3f6f2", surface: "#ffffff", accent: "#3f8f5b", ink: "#18211b", muted: "#5f6b62", line: "#dde6dc" },
};

/** Welche Ansicht gerade wirklich zu sehen ist ("auto" → Warm oder Nacht) */
export function resolvedTheme(theme: AppTheme): Exclude<AppTheme, "auto"> {
  if (theme !== "auto") return theme;
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches ? "nacht" : "warm";
}

export function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  const color = THEME_COLORS[resolvedTheme(theme)].background;
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute("content", color));
}

/**
 * Läuft vor dem ersten Zeichnen (Inline-Skript im <head>), damit die Seite
 * nicht kurz in der falschen Ansicht aufblitzt. Liest das Profil direkt.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem("familienkueche.haushaltsprofil")||"null");var t=p&&p.theme;if(t==="nacht"||t==="frisch"||t==="auto"||t==="warm")document.documentElement.dataset.theme=t;}catch(e){}})();`;
