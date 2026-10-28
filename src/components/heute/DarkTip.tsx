"use client";

// Einmal leise ab dem 3. Tag, nacheinander und nie beide zugleich:
// „Lieber schlicht?“ (Farbig · Schlicht, seit v0.94 statt der Look-Frage beim
// ersten Start), danach „Abends lieber dunkel?“ – Automatisch übernimmt
// Hell/Dunkel wie das Handy, „Alles klar“ lässt alles, wie es ist. Danach nie
// wieder; beides geht immer unter Einstellungen → Aussehen. Im Stil der
// Seiten-Tipps (`SeitenTipp`, Tafel 101) wie alle Hinweise der Startseite.

import { useEffect } from "react";
import { finishDarkTip, finishLookTip, noteDarkTipStart, showDarkTip, showLookTip, useDarkTip } from "@/lib/core/darkTip";
import { saveProfile } from "@/lib/einstellungen/profileStore";
import type { HouseholdProfile } from "@/lib/einstellungen/profile";
import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";

const LOOK_TIPP = "Lieber schlicht? Gleiche Farben, nur ruhigere Kacheln.";
const DUNKEL_TIPP = "Abends lieber dunkel? Dann richtet sich die App nach deinem Handy.";

/** `quiet`: gerade nicht zeigen (Beispiel-Tag, anderer Hinweis) – die Tage zählen trotzdem */
export function DarkTip({ profile, today, quiet = false }: { profile: HouseholdProfile; today: string; quiet?: boolean }) {
  const state = useDarkTip();
  useEffect(() => noteDarkTipStart(today), [today]);
  if (quiet) return null;
  if (showLookTip(state, today, profile.look)) {
    return (
      <SeitenTipp
        text={LOOK_TIPP}
        label="Lieber schlicht?"
        id="lieber-schlicht"
        onOk={finishLookTip}
        aktion={{ label: "Schlicht ansehen", onClick: () => saveProfile({ ...profile, look: "schlicht" }) }}
      />
    );
  }
  if (!showDarkTip(state, today, profile.themeSet) || (state && !state.look && profile.look === "farbig")) return null;
  return (
    <SeitenTipp
      text={DUNKEL_TIPP}
      label="Abends lieber dunkel?"
      id="abends-dunkel"
      onOk={finishDarkTip}
      aktion={{ label: "Automatisch", onClick: () => saveProfile({ ...profile, theme: "auto", themeSet: true }) }}
    />
  );
}
