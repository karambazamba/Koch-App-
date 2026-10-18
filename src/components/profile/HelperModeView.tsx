"use client";

import { tileClass } from "@/components/ui/styles";
import { HELPER_MODES, helperName } from "@/lib/profile";
import { InstantSettingsPage } from "./InstantSettingsPage";

/** /profil/modus: Wie oft sich Lotte von selbst meldet */
export function HelperModeView() {
  return (
    <InstantSettingsPage title="Modus" intro="Wie oft soll ich mich von selbst melden? Wichtiges für heute und morgen sage ich immer.">
      {(profile, set) => (
        <div className="flex flex-col gap-2" role="radiogroup" aria-label={`Modus von ${helperName(profile)}`}>
          {HELPER_MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              role="radio"
              aria-checked={profile.helperMode === m.value}
              onClick={() => set({ helperMode: m.value })}
              className={tileClass(profile.helperMode === m.value)}
            >
              <span className="flex flex-col self-stretch px-2 text-left">
                <span className="text-base font-bold">{m.label}</span>
                <span className="text-sm text-muted">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </InstantSettingsPage>
  );
}
