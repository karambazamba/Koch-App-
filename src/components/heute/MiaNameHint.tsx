"use client";

// Einmaliger, leiser Hinweis auf der Startseite (nur iPhone/iPad als Web-App,
// vor der Umbenennung installiert): „Ich heiße jetzt Mia …“ mit „Zeig mir
// wie“ (Schritte Bild für Bild) – Logik und Texte in lib/heute/miaName.ts.
// Im Stil der Seiten-Tipps (`SeitenTipp`); bleibt bis „Alles klar“.

import { useState, useSyncExternalStore } from "react";
import { StepGuide } from "@/components/ui/StepGuide";
import { SeitenTipp } from "@/components/begleitung/denktmit/SeitenTipp";
import { APP_NAME } from "@/lib/core/app";
import { markHintSeen, useHintSeen } from "@/lib/core/hints";
import { micPlatform } from "@/lib/core/mic";
import { MIA_HOME_HINT, miaHomeSteps, showMiaHomeHint } from "@/lib/heute/miaName";

const noSubscribe = () => () => undefined;
const standalone = () =>
  typeof window !== "undefined" && (window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
const onIosApp = () => micPlatform(navigator.userAgent) === "ios" && standalone();

/** Soll der Hinweis gerade stehen? (beim Server-Rendern nie) */
export function useMiaHomeHint(fromBefore: boolean): boolean {
  const ios = useSyncExternalStore(noSubscribe, onIosApp, () => false);
  const seen = useHintSeen("mia-name-neu");
  return showMiaHomeHint({ platform: ios ? "ios" : "andere", standalone: ios, fromBefore, seen: seen !== false });
}

export function MiaNameHint() {
  const [guide, setGuide] = useState(false);
  const close = () => markHintSeen("mia-name-neu");
  return (
    <>
      <SeitenTipp text={MIA_HOME_HINT(APP_NAME)} label="Neuer Name" id="mia-name-neu" onOk={close} aktion={{ label: "Zeig mir wie", onClick: () => setGuide(true), bleibt: true }} />
      {guide && (
        <StepGuide
          steps={miaHomeSteps(location.host, APP_NAME)}
          onBack={() => setGuide(false)}
          onDone={() => (setGuide(false), close())}
          onClose={() => setGuide(false)}
          lastLabel="Verstanden"
        />
      )}
    </>
  );
}
