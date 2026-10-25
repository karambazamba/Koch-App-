"use client";

// Die Seite der Begleitung (/profil/kuechenhelfer): oben Mia groß und „Deine
// Assistentin“, darunter Stimme (mit Probehören) und Vorlesen, wie oft sie
// sich meldet (Selten | Normal | Gern) und Pause. Mia heißt fest Mia (seit
// v0.67) – kein Umbenennen mehr. Früher eigene Seiten (/profil/lotte,
// /vorlesen, /farbe) leiten hierher.

import { Hand, KeyRound, Mic, Palmtree, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { requestCodeScreen } from "@/lib/begleitung/codeAbfrage";
import { fetchStatus } from "@/lib/begleitung/zugang";
import { openMicHelp } from "@/lib/core/mic";
import { setKnopfLinks, useKnopfLinks } from "@/lib/mia/knopf";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { Segmented } from "@/components/ui/Segmented";
import { SECTION_TITLE } from "@/components/ui/styles";
import { useFeature } from "@/lib/core/features";
import { helperName, helperTitle, TIP_LEVELS, type HelperMode } from "@/lib/einstellungen/profile";
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
  const links = useKnopfLinks();
  const needsCode = useNeedsCode();
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

            <VoiceSettings profile={profile} />

            <Group title="">
              <Row onClick={openMicHelp} icon={Mic} title="Mikrofon prüfen">
                Ich sag dir, woran’s liegt
              </Row>
              {needsCode && (
                <Row onClick={() => requestCodeScreen(true)} icon={KeyRound} title="Testcode ändern">
                  Für Zuhören und Mitdenken
                </Row>
              )}
            </Group>

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
              <SwitchRow icon={Hand} title="Knopf links" hint="Für Linkshänder: der runde Knopf unten links." checked={links} onChange={setKnopfLinks} />
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

/** Braucht die KI einen Testcode? Nur dann steht „Testcode ändern“ da */
function useNeedsCode(): boolean {
  const [needs, setNeeds] = useState(false);
  useEffect(() => {
    let active = true;
    void fetchStatus().then((s) => active && setNeeds(Boolean(s.configured && s.needsCode)));
    return () => {
      active = false;
    };
  }, []);
  return needs;
}
