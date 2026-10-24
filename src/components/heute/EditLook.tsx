"use client";

// Im Bearbeiten-Modus unten im Board ein leiser Link „Aussehen“: kleines
// Fenster mit Farbig | Schlicht und Hell | Dunkel | Automatisch – wirkt sofort,
// das Bearbeiten bleibt offen. (Seit Launch 1.0 keine eigene Leiste mehr:
// „＋ Kachel“ und „Fertig“ stehen nur noch oben.)

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { LookChoice, ThemeChoice } from "@/components/einstellungen/aussehen/LookChoice";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import { useProfile } from "@/lib/einstellungen/useProfile";

export function EditLook() {
  const profile = useProfile();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hit self-center py-2 text-sm font-semibold text-muted underline" aria-haspopup="dialog">
        Aussehen
      </button>
      {open && profile && (
        <Sheet title="Aussehen" onClose={() => setOpen(false)}>
          <div className="flex flex-col gap-4 pb-2">
            <LookChoice value={profile.look} onChange={(next) => saveProfile({ ...profile, look: next })} />
            <ThemeChoice value={profile.theme} onChange={(theme) => saveProfile({ ...profile, theme, themeSet: true })} />
          </div>
        </Sheet>
      )}
    </>
  );
}
