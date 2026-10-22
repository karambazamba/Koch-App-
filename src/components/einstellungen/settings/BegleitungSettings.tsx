"use client";

// DARSTELLUNG (Automatisch · Hell · Dunkel) in den Einstellungen und die
// Farbwahl der Begleitung (auf deren Seite /profil/kuechenhelfer). Wirkt sofort.

import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { ColorDots } from "@/components/begleitung/BegleitungPicker";
import { useState } from "react";
import { CARD, NOTE } from "@/components/ui/styles";
import { iconFor } from "@/lib/core/app";
import { iconChangeHint } from "@/lib/core/homescreen";
import { APP_THEMES, type AvatarColor, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { saveProfile } from "@/lib/einstellungen/profileStore";

export function DarstellungGroup({ profile }: { profile: HouseholdProfile }) {
  return (
    <section className="flex flex-col gap-2" aria-label="Darstellung">
      <h2 className="px-1 text-[15px] font-extrabold text-ink">Darstellung</h2>
      <div className={`${CARD} flex gap-1 p-1.5`} role="radiogroup" aria-label="Hell oder dunkel">
        {APP_THEMES.map((t) => (
          <button
            key={t.value}
            type="button"
            role="radio"
            aria-checked={profile.theme === t.value}
            onClick={() => saveProfile({ ...profile, theme: t.value, themeSet: true })}
            className={`h-11 flex-1 rounded-field text-[15px] font-bold transition ${profile.theme === t.value ? "bg-accent text-on-accent" : "text-muted"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </section>
  );
}

/** Farbe wählen: Gesicht und App-Icon in derselben Farbe; nach einem Wechsel (iPhone-Homescreen-App) der Hinweis zum Icon */
export function FarbeChoice({ profile, onPick }: { profile: HouseholdProfile; onPick: (farbe: AvatarColor) => void }) {
  const [hint, setHint] = useState<string | null>(null);
  return (
    <>
      <div className={`${CARD} flex flex-col items-center gap-4 p-5`}>
        <div className="flex items-end gap-4">
          <BegleitungAvatar size={96} />
          {/* eslint-disable-next-line @next/next/no-img-element -- statisches App-Icon in der gewählten Farbe */}
          <img src={iconFor(profile.helper.farbe, "icon.svg")} alt="App-Icon" width={56} height={56} className="rounded-[22%] shadow-card" />
        </div>
        <ColorDots
          value={profile.helper.farbe}
          onChange={(farbe) => {
            onPick(farbe);
            setHint(iconChangeHint());
          }}
        />
      </div>
      {hint && (
        <p className={NOTE} role="status">
          {hint}
        </p>
      )}
      <p className="px-1 text-sm text-muted">Mein Gesicht und das App-Icon bekommen die Farbe – alle anderen App-Farben bleiben gleich.</p>
    </>
  );
}
