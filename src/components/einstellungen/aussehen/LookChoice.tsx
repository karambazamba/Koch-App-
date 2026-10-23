"use client";

// Zwei Looks der Startseite (Tafel 51): Mini-Vorschauen „Farbig“ und
// „Schlicht“ zum Antippen (oranger Rahmen + Haken), Hell/Dunkel/Automatisch
// und „Meine Farbe im Kalender“. Genutzt in den Einstellungen (Aussehen), im
// Bearbeiten-Modus der Startseite und beim ersten Start. Die Vorschau setzt
// ihre Farben selbst (inline), damit sie unabhängig vom aktuellen Look ist.

import type { CSSProperties } from "react";
import { Check } from "lucide-react";
import { ColorDots } from "@/components/begleitung/BegleitungPicker";
import { Segmented } from "@/components/ui/Segmented";
import { APP_LOOKS, APP_THEMES, type AppLook, type AppTheme, type AvatarColor } from "@/lib/einstellungen/profile";

type Tone = "pinnwand" | "wetter" | "termine" | "aufgaben" | "essen" | "einkauf";

/** Farben einer Mini-Kachel je Look (inline, unabhängig von data-look am <html>) */
function toneStyle(look: AppLook, tone: Tone): CSSProperties {
  return (
    look === "farbig"
      ? { background: `var(--app-tile-${tone})`, color: `var(--app-tile-${tone}-ac)` }
      : { background: "var(--app-surface)", color: `var(--app-tile-${tone}-ac)`, boxShadow: "inset 0 0 0 1px var(--app-line)" }
  ) as CSSProperties;
}

/** Kleine Startseite: Jetzt-Karte, zwei S-Kacheln, zwei breite Kacheln, ein Paar */
function LookPreview({ look, size = "klein" }: { look: AppLook; size?: "klein" | "gross" }) {
  const gap = size === "gross" ? "gap-1.5 p-2.5" : "gap-1 p-2";
  const bar = (tone: Tone) => <span className="block h-1 w-1/2 rounded-full bg-current opacity-80" style={toneStyle(look, tone)} />;
  const tile = (tone: Tone, cls: string) => (
    <span className={`flex flex-col gap-1 rounded-field p-1.5 ${cls}`} style={toneStyle(look, tone)}>
      <span className="block h-1 w-1/2 rounded-full bg-current opacity-80" />
      <span className="block h-2.5 w-full rounded-full" style={{ background: look === "farbig" ? "var(--app-tile-inner)" : "var(--app-schlicht-inner)" } as CSSProperties} />
    </span>
  );
  return (
    <span className={`grid grid-cols-2 rounded-card bg-background ${gap}`} aria-hidden>
      <span className="col-span-2 flex h-5 items-center gap-1 rounded-field px-1.5" style={{ background: "var(--app-jetzt-from)" } as CSSProperties}>
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        {bar("essen")}
      </span>
      {tile("pinnwand", "")}
      {tile("wetter", "")}
      {tile("termine", "col-span-2")}
      {tile("aufgaben", "col-span-2")}
      {tile("essen", "")}
      {tile("einkauf", "")}
    </span>
  );
}

/** Zwei große Mini-Vorschauen zum Antippen; wirkt sofort */
export function LookChoice({ value, onChange, size = "klein" }: { value: AppLook; onChange: (look: AppLook) => void; size?: "klein" | "gross" }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Look der Startseite">
      {APP_LOOKS.map((l) => {
        const on = value === l.value;
        return (
          <button
            key={l.value}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={`${l.label} – ${l.hint}`}
            onClick={() => onChange(l.value)}
            className={`relative flex flex-col gap-2 rounded-card border-2 bg-surface p-2 text-left shadow-card transition active:scale-[0.98] ${on ? "border-accent" : "border-line"}`}
          >
            <LookPreview look={l.value} size={size} />
            <span className="px-1 pb-1">
              <span className="block text-[16px] font-extrabold leading-tight">{l.label}</span>
              <span className="block text-[13px] leading-snug text-muted">{l.hint}</span>
            </span>
            {on && (
              <span className="absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden>
                <Check className="h-4 w-4" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Hell · Dunkel · Automatisch */
export function ThemeChoice({ value, onChange }: { value: AppTheme; onChange: (theme: AppTheme) => void }) {
  const order: AppTheme[] = ["warm", "nacht", "auto"];
  const options = order.map((v) => ({ value: v, label: APP_THEMES.find((t) => t.value === v)!.label }));
  return <Segmented label="Hell oder dunkel" value={value} options={options} onChange={onChange} />;
}

/** Meine Farbe im Kalender – die Begleitung und das App-Icon bleiben immer orange */
export function CalendarColorChoice({ value, onChange, name }: { value: AvatarColor; onChange: (color: AvatarColor) => void; name: string }) {
  return (
    <div className="flex flex-col gap-3">
      <ColorDots value={value} onChange={onChange} />
      <p className="text-sm text-muted">{name} und das App-Icon bleiben immer orange.</p>
    </div>
  );
}
