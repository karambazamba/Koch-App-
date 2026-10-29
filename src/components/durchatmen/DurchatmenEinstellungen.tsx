"use client";

// Einstellungen → Durchatmen (A-051): Übung starten, Art der Anleitung
// (Stimme + Klang · Nur Klang · Still, pro Gerät), leises Angebot in der
// Jetzt-Karte (höchstens 2× am Tag, nie als Mitteilung) und der Baustein
// selbst. Gespeichert wird nur Art, Lieblinge und dieser Schalter.

import { Blocks, Play, Sparkles } from "lucide-react";
import { CARD, buttonClass } from "@/components/ui/styles";
import { ChoiceCards, Group, SettingsPage, SwitchRow } from "@/components/einstellungen/settings/SettingsParts";
import { setFeature, useFeature } from "@/lib/core/features";
import { oeffneDurchatmen } from "@/lib/durchatmen/oeffnen";
import { ARTEN, setAngebot, setArt, useDurchatmen } from "@/lib/durchatmen/store";

export function DurchatmenEinstellungen() {
  const stand = useDurchatmen();
  const an = useFeature("durchatmen");
  return (
    <SettingsPage title="Durchatmen" question="Kurz raus, wieder bei dir.">
      {() =>
        !stand || an === undefined ? (
          <div className={`${CARD} h-40 animate-pulse`} />
        ) : (
          <>
            {an && (
              <button type="button" onClick={oeffneDurchatmen} className={`${buttonClass("primary", "lg")} gap-2`}>
                <Play className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                Übung aussuchen
              </button>
            )}
            {an && (
              <>
                <p className="mt-2 px-1 text-[15px] font-extrabold">Wie soll ich anleiten?</p>
                <ChoiceCards label="Anleitung" value={stand.art} options={ARTEN} onChange={setArt} />
              </>
            )}
            <Group title="Schalter">
              {an && <SwitchRow icon={Sparkles} title="Leises Angebot" hint="„Kurz durchatmen?“ in der Jetzt-Karte, höchstens 2× am Tag, nie als Mitteilung" checked={stand.angebot} onChange={setAngebot} />}
              <SwitchRow icon={Blocks} title="Durchatmen" hint="Aus heißt nur ausgeblendet, Lieblinge bleiben" checked={an} onChange={(on) => setFeature("durchatmen", on)} />
            </Group>
            <p className="px-1 text-sm text-muted">Nichts wird aufgenommen. Ich merk mir nur Lieblinge und wie ich anleiten soll, auf diesem Gerät.</p>
          </>
        )
      }
    </SettingsPage>
  );
}
