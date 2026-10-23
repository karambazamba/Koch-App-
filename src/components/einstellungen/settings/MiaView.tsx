"use client";

// Die Seite der Begleitung (/profil/kuechenhelfer) bündelt alles über Mia:
// Name & Art (Mia, Theo oder eigener Name), Farbe (Gesicht + App-Icon),
// Vorlesen und Stimme, wie oft sie sich meldet (Selten | Normal | Gern) und
// Pause. Früher eigene Seiten (/profil/lotte, /vorlesen, /farbe) leiten hierher.

import { Palmtree, Sun } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { BegleitungPicker } from "@/components/begleitung/BegleitungPicker";
import { Segmented } from "@/components/ui/Segmented";
import { SECTION_TITLE } from "@/components/ui/styles";
import { useFeature } from "@/lib/core/features";
import { helperName, helperTitle, TIP_LEVELS, type HelperMode } from "@/lib/einstellungen/profile";
import { saveSpeechSettings } from "@/lib/begleitung/speech";
import { useProfile } from "@/lib/einstellungen/useProfile";
import { VoiceSettings } from "@/components/einstellungen/settings/ReadingView";
import { ChoiceCards, Group, Row, SettingsPage, SwitchRow } from "@/components/einstellungen/settings/SettingsParts";

const MODES: { value: HelperMode; label: string }[] = [
  { value: "locker", label: "Selten" },
  { value: "normal", label: "Normal" },
  { value: "dranbleiben", label: "Gern" },
];

export function MiaView() {
  const title = helperName(useProfile());
  const tipsOn = useFeature("tipps");
  const weekendOn = useFeature("wochenendIdeen");
  return (
    <SettingsPage title={title}>
      {(profile, set) => {
        const name = helperName(profile);
        return (
          <>
            <div className="flex flex-col items-center gap-1 py-2 text-center">
              <BegleitungAvatar size={88} />
              <p className="text-sm text-muted">{helperTitle(profile).replace(/^\w/, (c) => c.toUpperCase())}</p>
            </div>

            <h2 className={`px-1 ${SECTION_TITLE}`}>Name & Art</h2>
            <BegleitungPicker
              value={profile.helper}
              onChange={(helper) => {
                // Andere Art → passende Stimme statt der fest gewählten
                if (helper.art !== profile.helper.art) saveSpeechSettings({ voice: "" });
                set({ helper });
              }}
            />
            <p className="px-1 text-sm text-muted">Oder einfach sagen: „Ich nenn dich ab jetzt Frieda.“</p>

            <VoiceSettings profile={profile} />

            <h2 className={`mt-2 px-1 ${SECTION_TITLE}`}>Wie oft melde ich mich?</h2>
            <Segmented label={`Wie oft meldet sich ${name}?`} value={profile.helperMode} onChange={(helperMode) => set({ helperMode })} options={MODES} />
            {tipsOn && (
              <>
                <h2 className={`mt-2 px-1 ${SECTION_TITLE}`}>Tipps auf der Startseite</h2>
                <ChoiceCards label="Tipps" value={profile.tips} onChange={(tips) => set({ tips })} options={TIP_LEVELS} />
              </>
            )}
            <Group title="">
              {weekendOn && (
                <SwitchRow icon={Sun} title="Wochenend-Ideen" hint="Freitags bis sonntags ab und zu eine Idee fürs Wochenende." checked={profile.weekendIdeas} onChange={(weekendIdeas) => set({ weekendIdeas })} />
              )}
              <Row href="/profil/pause" icon={Palmtree} title="Pause" value={profile.pause ? "An" : "Aus"}>
                Im Urlaub halte ich mich raus
              </Row>
            </Group>
          </>
        );
      }}
    </SettingsPage>
  );
}
