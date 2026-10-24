"use client";

// Nach der Rückkehr in die App (Tafel 86): Ist eine neue gute Stimme da
// (gerade geladen), fragt Mia einmal „Neue Stimme gefunden: Anna. Nehmen?“
// mit „Ja“ / „Nein“. Ja = ab jetzt diese Stimme (mit kurzer Probe).

import { useEffect, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { buttonClass } from "@/components/ui/styles";
import { goodVoiceIds, neueStimme, voiceLabel } from "@/lib/begleitung/voiceGuide";
import { bekannteStimmen, merkeStimmen } from "@/lib/begleitung/stimmenStore";
import { loadSpeechSettings, saveSpeechSettings, speak, unlockSpeech } from "@/lib/begleitung/speech";

/** Erst nachschauen, wenn Safari die Stimmen fertig geladen hat */
const RUHE_MS = 3000;

const voicesNow = () => (typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);

export function StimmenVorschlag() {
  const [vorschlag, setVorschlag] = useState<{ id: string; name: string } | null>(null);
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const look = () => {
      const voices = voicesNow();
      if (!voices.length) return;
      const good = goodVoiceIds(voices);
      const bekannt = bekannteStimmen();
      if (bekannt === null) return merkeStimmen(good);
      const id = neueStimme(good, bekannt, loadSpeechSettings().voice);
      const v = id ? voices.find((x) => x.voiceURI === id) : null;
      if (v) setVorschlag({ id: v.voiceURI, name: voiceLabel(v) });
    };
    const later = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(look, RUHE_MS);
    };
    later();
    document.addEventListener("visibilitychange", later);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", later);
    };
  }, []);
  if (!vorschlag) return null;
  const antwort = (ja: boolean) => {
    merkeStimmen([vorschlag.id]);
    if (ja) {
      saveSpeechSettings({ voice: vorschlag.id });
      unlockSpeech();
      speak("Moin! So klinge ich jetzt.", { id: "probe-neu", voice: vorschlag.id });
    }
    setVorschlag(null);
  };
  return (
    <Sheet title="Neue Stimme" onClose={() => antwort(false)} layer="above">
      <div className="flex flex-col gap-4 pb-3" data-stimmen-vorschlag>
        <p className="text-[17px] font-semibold leading-snug">Neue Stimme gefunden: {vorschlag.name}. Nehmen?</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => antwort(false)} className={buttonClass("secondary", "md")}>
            Nein
          </button>
          <button type="button" onClick={() => antwort(true)} className={buttonClass("primary", "md")}>
            Ja
          </button>
        </div>
      </div>
    </Sheet>
  );
}
