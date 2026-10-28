"use client";

// Karte „Mia auf den Home-Bildschirm“ (A-027) oben auf der Startseite – im
// Stil der einmaligen Hinweise (`SeitenTipp`: warmer Verlauf, feiner oranger
// Rand, kleines Mia-Gesicht ohne Ring), außerhalb des Kachel-Rasters. Sie
// belegt den EINEN Hinweis-Platz unter der Jetzt-Karte. Regeln und Texte in
// `core/homeBildschirm.ts`; kein Badge, kein Druck.

import { useState } from "react";
import { MoreVertical, Share } from "lucide-react";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { HomeBildschirmAnleitung, MiniSkizze } from "@/components/heute/HomeBildschirmAnleitung";
import { buttonClass } from "@/components/ui/styles";
import { APP_NAME } from "@/lib/core/app";
import { showToast } from "@/lib/core/toast";
import { useExternalStore } from "@/lib/core/useExternalStore";
import { helperName } from "@/lib/einstellungen/profile";
import {
  HOME_KNOPF_INSTALLIEREN,
  HOME_TEXTE,
  erkennePlattform,
  homeKarteArt,
  homeKarteFaellig,
  homeKarteSpaeter,
  homeKarteZeigen,
  installieren,
  istStandalone,
  useHomeKarteState,
  useInstallAngebot,
  type HomeKarteArt,
  type Plattform,
} from "@/lib/core/homeBildschirm";

type Geraet = { plattform: Plattform; standalone: boolean };
let geraetCache: Geraet | null = null;
const geraetJetzt = (): Geraet => (geraetCache ??= { plattform: erkennePlattform(navigator.userAgent, navigator.maxTouchPoints), standalone: istStandalone() });
const keinAbo = () => () => {};

/** Gerät erst im Browser bestimmen (beim Server-Zeichnen null) */
export function useGeraet(): Geraet | null {
  return useExternalStore(keinAbo, geraetJetzt, () => null);
}

/** Welche Karte steht heute? null = keine */
export function useHomeBildschirmKarte(o: { today: string; vorschau: boolean }): HomeKarteArt | null {
  const geraet = useGeraet();
  const angebot = useInstallAngebot();
  const state = useHomeKarteState();
  if (!geraet || state === undefined) return null;
  const art = homeKarteArt(geraet.plattform, angebot);
  return homeKarteZeigen({ art, standalone: geraet.standalone, vorschau: o.vorschau, faellig: homeKarteFaellig(state, o.today) }) ? art : null;
}

const kopieren = async () => {
  try {
    await navigator.clipboard.writeText(window.location.origin);
    showToast({ text: "Link kopiert." });
  } catch {
    showToast({ text: window.location.origin });
  }
};

export function HomeBildschirmKarte({ art, today }: { art: HomeKarteArt; today: string }) {
  const [zeigen, setZeigen] = useState(false);
  const text = HOME_TEXTE[art];
  const weg = art === "ios-safari" ? "ios" : art === "android-menue" ? "android" : null;
  const Symbol = art === "ios-safari" ? Share : art === "android-menue" ? MoreVertical : null;
  return (
    <div role="note" aria-label={`${APP_NAME} als App`} data-seiten-tipp data-tipp="home-bildschirm" data-home-karte={art} className="relative flex gap-3 rounded-card border border-accent/35 bg-linear-to-br from-jetzt-from to-jetzt-to px-4 py-3">
      <BegleitungAvatar size={36} />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div>
          <p className="text-[12px] font-extrabold tracking-wider text-accent-strong uppercase">{helperName()}</p>
          <p className="text-[15px] font-semibold leading-snug">
            {text.vor}
            {Symbol && (
              <>
                {" "}
                <Symbol className="inline h-4 w-4 -translate-y-px align-middle text-accent-strong" strokeWidth={2.25} aria-label={art === "ios-safari" ? "Teilen-Symbol" : "Menü-Symbol"} />
              </>
            )}
            {text.nach && ` ${text.nach}`}
          </p>
        </div>
        {weg && <MiniSkizze weg={weg} />}
        <div className="flex flex-wrap gap-2">
          {weg && (
            <button type="button" onClick={() => setZeigen(true)} className={`${buttonClass("primary", "sm")} min-h-11`}>
              Zeig’s mir
            </button>
          )}
          {art === "android-angebot" && (
            <button type="button" onClick={() => void installieren()} className={`${buttonClass("primary", "sm")} min-h-11`}>
              {HOME_KNOPF_INSTALLIEREN}
            </button>
          )}
          {(art === "ios-anderer" || art === "android-anderer") && (
            <button type="button" onClick={() => void kopieren()} className={`${buttonClass("primary", "sm")} min-h-11`}>
              Link kopieren
            </button>
          )}
          <button type="button" onClick={() => homeKarteSpaeter(today)} className={`${buttonClass("secondary", "sm")} min-h-11`}>
            Später
          </button>
        </div>
      </div>
      {zeigen && weg && <HomeBildschirmAnleitung weg={weg} onClose={() => setZeigen(false)} />}
    </div>
  );
}
