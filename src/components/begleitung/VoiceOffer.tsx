"use client";

// Stimme – weg vom Blech-Klang (Tafel 28), im Chat:
// - „liest vor …“ mit Lautsprecher, Tipp stoppt
// - nach dem ersten Vorlesen EINMAL (nur ohne gute Stimme): „Klinge ich
//   blechern? …“ mit „Schönere Stimme holen“ / „Passt so“
// - Anleitung (Schritte je Gerät/iOS-Version, „Zeig’s mir“, „Fertig geladen“)
// - danach grün „✓ Neue Stimme gefunden …“ + Probehören, sonst freundlich
//   „Hm, ich finde sie noch nicht …“. Beim Zurückkommen in die App wird
//   ebenfalls neu nachgeschaut.

import { useEffect, useState } from "react";
import { Check, Play, Volume2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { StepGuide, StepList } from "@/components/ui/StepGuide";
import { buttonClass } from "@/components/ui/styles";
import { BegleitungAvatar } from "@/components/begleitung/BegleitungAvatar";
import { hintSeen, markHintSeen } from "@/lib/core/hints";
import { iosMajor, micPlatform } from "@/lib/core/mic";
import { speak, stopSpeaking, unlockSpeech } from "@/lib/begleitung/speech";
import { goodVoice, voiceLabel, voiceOfferText, voiceSteps } from "@/lib/begleitung/voiceGuide";
import type { HelperVoice } from "@/lib/einstellungen/profile";

const voicesNow = () => (typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis.getVoices() : []);
const ua = () => (typeof navigator === "undefined" ? "" : navigator.userAgent);

/** Anleitung „Schönere Stimme holen“ – meldet die gefundene Stimme (oder null) */
export function VoiceGuideSheet({ onClose, onChecked }: { onClose: () => void; onChecked: (found: SpeechSynthesisVoice | null) => void }) {
  const steps = voiceSteps(micPlatform(ua()), iosMajor(ua()));
  const [guide, setGuide] = useState(false);
  const check = () => onChecked((goodVoice(voicesNow()) as SpeechSynthesisVoice | null) ?? null);
  if (guide) return <StepGuide steps={steps} onBack={() => setGuide(false)} onDone={check} onClose={onClose} lastLabel="Fertig geladen" />;
  return (
    <Sheet title="Schönere Stimme holen" onClose={onClose} layer="above">
      <div className="flex flex-col gap-3 pb-3">
        <p className="text-base font-semibold">So lädst du eine natürliche Stimme:</p>
        <StepList steps={steps} />
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setGuide(true)} className={buttonClass("secondary", "md")}>
            <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Zeig’s mir
          </button>
          <button type="button" onClick={check} className={buttonClass("primary", "md")}>
            Fertig geladen
          </button>
        </div>
        <button type="button" onClick={onClose} className="hit mx-auto min-h-11 text-[15px] font-semibold text-muted">
          Später
        </button>
      </div>
    </Sheet>
  );
}

type Stage = "still" | "angebot" | "anleitung" | { found: string } | "nicht";

/** Im Chat über der Eingabe: Vorlese-Anzeige und das Stimmen-Angebot */
export function VoiceOffer({ readCount, speaking, gender }: { readCount: number; speaking: boolean; gender: HelperVoice }) {
  const [stage, setStage] = useState<Stage>("still");
  // Nach dem ersten Vorlesen: nur ohne gute Stimme, nur einmal
  useEffect(() => {
    if (readCount < 1 || stage !== "still" || hintSeen("stimme-angeboten")) return;
    const t = setTimeout(() => {
      const voices = voicesNow();
      if (!voices.length || goodVoice(voices)) return;
      markHintSeen("stimme-angeboten");
      setStage("angebot");
    }, 1500);
    return () => clearTimeout(t);
  }, [readCount, stage]);
  // Zurück in der App (Stimme geladen?): neu nachschauen
  useEffect(() => {
    if (stage !== "anleitung" && stage !== "nicht") return;
    const look = () => {
      if (document.visibilityState !== "visible") return;
      const found = goodVoice(voicesNow());
      if (found) setStage({ found: found.name });
    };
    document.addEventListener("visibilitychange", look);
    return () => document.removeEventListener("visibilitychange", look);
  }, [stage]);

  const probe = () => {
    unlockSpeech();
    speak("Moin! So klinge ich.", { id: "probe-neu", gender, voice: "" });
  };

  return (
    <>
      {speaking && (
        <button type="button" onClick={stopSpeaking} className="hit flex min-h-9 items-center gap-1.5 self-start rounded-full bg-accent-soft px-3 text-[13px] font-semibold text-accent-strong" aria-label="Vorlesen stoppen">
          <Volume2 className="h-4 w-4 animate-pulse" strokeWidth={2.25} aria-hidden /> liest vor …
        </button>
      )}
      {stage === "angebot" && (
        <div className="flex flex-col gap-2.5 rounded-card bg-accent-soft p-3" role="status">
          <div className="flex items-start gap-2.5">
            <BegleitungAvatar size={32} groesse="klein" />
            <p className="text-[15px] leading-snug">{voiceOfferText(micPlatform(ua()))}</p>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setStage("anleitung")} className={buttonClass("primary", "sm")}>
              Schönere Stimme holen
            </button>
            <button type="button" onClick={() => setStage("still")} className={buttonClass("ghost", "sm")}>
              Passt so
            </button>
          </div>
        </div>
      )}
      {typeof stage === "object" && (
        <div className="flex items-center gap-2 rounded-card bg-good-soft p-3 text-good-ink" role="status">
          <Check className="h-5 w-5 shrink-0" strokeWidth={3} aria-hidden />
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug">Neue Stimme gefunden. Ab jetzt sprech ich mit „{voiceLabel({ name: stage.found })}“.</p>
          <button type="button" onClick={probe} className={`${buttonClass("secondary", "sm")} shrink-0`}>
            <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Probehören
          </button>
        </div>
      )}
      {stage === "nicht" && (
        <p className="rounded-card bg-surface p-3 text-[15px] leading-snug" role="status">
          Hm, ich finde sie noch nicht. Lädt sie vielleicht noch? Probier es gleich nochmal.
        </p>
      )}
      {stage === "anleitung" && <VoiceGuideSheet onClose={() => setStage("still")} onChecked={(found) => setStage(found ? { found: found.name } : "nicht")} />}
    </>
  );
}
