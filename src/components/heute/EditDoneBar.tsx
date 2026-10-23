"use client";

// Im Bearbeiten-Modus (Tafel 24, Tafel 51): schwebende Leiste unten statt des
// Mia-Knopfs – „+ Kacheln · Aussehen · Fertig“ mit hellem Verlauf dahinter,
// damit nichts durchscheint. „Aussehen“ öffnet ein kleines Fenster mit
// Farbig | Schlicht und Hell | Dunkel | Automatisch – wirkt sofort.
// Danebentippen beendet weiterhin das Bearbeiten (useHomeEditing).

import { useState } from "react";
import { Palette, Plus } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { LookChoice, ThemeChoice } from "@/components/einstellungen/aussehen/LookChoice";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { saveProfile } from "@/lib/einstellungen/profileStore";

const SIDE = "flex h-12 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[15px] font-bold text-ink active:bg-fill";

export function EditDoneBar({ onDone, onAdd }: { onDone: () => void; onAdd: () => void }) {
  const profile = useProfile();
  const [look, setLook] = useState(false);
  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 bg-linear-to-t from-background via-background/95 to-transparent px-4 pt-8 pb-[max(0.75rem,env(safe-area-inset-bottom))]" data-keep-edit data-edit-leiste>
        <div className="pointer-events-auto mx-auto flex h-14 max-w-lg items-center gap-1 rounded-bar border border-line bg-surface pl-1.5 pr-1.5 shadow-bar">
          <button type="button" onClick={onAdd} className={SIDE}>
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
            Kacheln
          </button>
          <button type="button" onClick={() => setLook(true)} className={SIDE} aria-haspopup="dialog">
            <Palette className="h-4 w-4" strokeWidth={2.25} aria-hidden />
            Aussehen
          </button>
          <button type="button" onClick={onDone} className="ml-auto h-12 shrink-0 rounded-full bg-accent px-6 text-[17px] font-bold text-on-accent active:scale-95">
            Fertig
          </button>
        </div>
      </div>
      {look && profile && (
        <Sheet title="Aussehen" onClose={() => setLook(false)}>
          <div className="flex flex-col gap-4 pb-2">
            <LookChoice value={profile.look} onChange={(next) => saveProfile({ ...profile, look: next })} />
            <ThemeChoice value={profile.theme} onChange={(theme) => saveProfile({ ...profile, theme, themeSet: true })} />
          </div>
        </Sheet>
      )}
    </>
  );
}
