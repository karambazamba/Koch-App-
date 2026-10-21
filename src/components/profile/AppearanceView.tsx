"use client";

import { Check } from "lucide-react";
import { APP_THEMES, type AppTheme } from "@/lib/einstellungen/profile";
import { THEME_COLORS } from "@/lib/core/theme";
import { InstantSettingsPage } from "./InstantSettingsPage";

/** /profil/ansicht: Ansicht als Vorschau-Karten, darunter die Darstellung */
export function AppearanceView() {
  return (
    <InstantSettingsPage title="Ansicht" intro="So sieht die App aus – tipp eine Vorschau an, es ändert sich sofort.">
      {(profile, set) => (
        <>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Ansicht">
            {APP_THEMES.map((t) => {
              const selected = profile.theme === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={t.label}
                  onClick={() => set({ theme: t.value, themeSet: true })}
                  className={`flex flex-col gap-2 rounded-card border-2 p-2 text-left transition active:scale-[0.98] ${
                    selected ? "border-accent bg-accent-soft" : "border-line bg-surface"
                  }`}
                >
                  <ThemePreview theme={t.value} />
                  <span className="flex items-center gap-1.5 px-1">
                    <span className="flex-1">
                      <span className="block text-base font-bold leading-tight">{t.label}</span>
                      <span className="block text-xs leading-snug text-muted">{t.hint}</span>
                    </span>
                    {selected && <Check className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </InstantSettingsPage>
  );
}

/** Mini-Startseite in den Farben der Ansicht ("Automatisch": halb Warm, halb Nacht) */
function ThemePreview({ theme }: { theme: AppTheme }) {
  if (theme === "auto") {
    return (
      <span className="relative block overflow-hidden rounded-xl" aria-hidden>
        <MiniHome colors={THEME_COLORS.warm} />
        <span className="absolute inset-0" style={{ clipPath: "polygon(100% 0, 100% 100%, 0 100%)" }}>
          <MiniHome colors={THEME_COLORS.nacht} />
        </span>
      </span>
    );
  }
  return (
    <span className="block overflow-hidden rounded-xl" aria-hidden>
      <MiniHome colors={THEME_COLORS[theme]} />
    </span>
  );
}

function MiniHome({ colors }: { colors: (typeof THEME_COLORS)["warm"] }) {
  const box = { background: colors.surface, border: `1px solid ${colors.line}` };
  return (
    <span className="flex h-36 flex-col gap-1.5 p-2" style={{ background: colors.background }}>
      <span className="flex items-center gap-1">
        <span className="h-3 w-3 rounded" style={{ background: colors.accent }} />
        <span className="h-2 w-12 rounded-full" style={{ background: colors.accent }} />
      </span>
      <span className="flex flex-1 flex-col overflow-hidden rounded-lg" style={box}>
        <span className="h-7" style={{ background: `linear-gradient(135deg, ${colors.background}, ${colors.accent}66)` }} />
        <span className="m-1.5 h-2 w-16 rounded-full" style={{ background: colors.ink }} />
        <span className="mx-1.5 h-1.5 w-10 rounded-full" style={{ background: colors.muted }} />
      </span>
      <span className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-5 rounded-md" style={box} />
        ))}
      </span>
      <span className="flex h-4 items-center justify-end rounded-full px-1" style={box}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors.accent }} />
      </span>
    </span>
  );
}
