"use client";

// Einmaliger, leiser Hinweis auf der Startseite (nur iPhone/iPad als Web-App,
// vor der Umbenennung installiert): „Ich heiße jetzt Mia …“ mit „Zeig mir
// wie“ (Schritte Bild für Bild) – Logik und Texte in lib/heute/miaName.ts.

import { useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import { StepGuide } from "@/components/ui/StepGuide";
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
    <div className="flex items-start gap-3 rounded-card bg-accent-soft px-4 py-3" role="status">
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-[15px] leading-snug text-accent-strong">{MIA_HOME_HINT(APP_NAME)}</p>
        <button type="button" onClick={() => setGuide(true)} className="hit self-start text-sm font-bold text-accent-strong underline">
          Zeig mir wie
        </button>
      </div>
      <button type="button" onClick={close} aria-label="Hinweis schließen" className="-m-2 flex h-11 w-11 shrink-0 items-center justify-center text-accent-strong">
        <X className="h-5 w-5" strokeWidth={2.25} aria-hidden />
      </button>
      {guide && (
        <StepGuide
          steps={miaHomeSteps(location.host, APP_NAME)}
          onBack={() => setGuide(false)}
          onDone={() => (setGuide(false), close())}
          onClose={() => setGuide(false)}
          lastLabel="Verstanden"
        />
      )}
    </div>
  );
}
