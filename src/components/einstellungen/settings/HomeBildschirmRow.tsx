"use client";

// Einstellungen → Daten & App: dauerhaft „Mia auf den Home-Bildschirm“
// (A-027) – auch nach „Später“ oder ohne Karte. Rechts der aktuelle Stand
// („Ist drauf“ als App). Antippen: iPhone/Safari und Android ohne Angebot →
// „Zeig’s mir“-Fenster; Android mit Angebot → installieren; anderer Browser
// auf dem iPhone → kurzer Satz „Öffne mich in Safari …“.

import { useState } from "react";
import { Smartphone } from "lucide-react";
import { Row } from "@/components/einstellungen/settings/SettingsParts";
import { HomeBildschirmAnleitung } from "@/components/heute/HomeBildschirmAnleitung";
import { useGeraet } from "@/components/heute/HomeBildschirmKarte";
import { CARD_LIST } from "@/components/ui/styles";
import { showToast } from "@/lib/core/toast";
import { HOME_TEXTE, HOME_TITEL, homeKarteArt, installieren, useInstallAngebot } from "@/lib/core/homeBildschirm";

export function HomeBildschirmRow() {
  const geraet = useGeraet();
  const angebot = useInstallAngebot();
  const [zeigen, setZeigen] = useState<"ios" | "android" | null>(null);
  if (!geraet) return null;
  const art = homeKarteArt(geraet.plattform, angebot);
  const tippen = () => {
    if (art === "ios-safari") return setZeigen("ios");
    if (art === "android-angebot") return void installieren();
    if (art === "ios-anderer" || art === "android-anderer") return showToast({ text: HOME_TEXTE[art].vor });
    // Android ohne Angebot und Computer: die Schritte übers Menü
    setZeigen("android");
  };
  return (
    <>
      <ul className={CARD_LIST}>
        <Row onClick={geraet.standalone ? undefined : tippen} icon={Smartphone} title={HOME_TITEL} value={geraet.standalone ? "Ist drauf" : undefined}>
          {geraet.standalone ? "Du nutzt mich schon als App" : "Dann bin ich da wie eine App"}
        </Row>
      </ul>
      {zeigen && <HomeBildschirmAnleitung weg={zeigen} onClose={() => setZeigen(null)} />}
    </>
  );
}
