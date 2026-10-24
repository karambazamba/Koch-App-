"use client";

import { useState } from "react";
import { Check, Play, Sparkles, Volume2 } from "lucide-react";
import { VoiceGuideSheet } from "@/components/begleitung/VoiceOffer";
import { goodVoice, voiceLabel } from "@/lib/begleitung/voiceGuide";
import { showToast } from "@/lib/core/toast";
import { helperName, type HouseholdProfile } from "@/lib/einstellungen/profile";
import { SECTION_TITLE, buttonClass } from "@/components/ui/styles";
import {
  READ_MODES,
  SPEECH_RATES,
  germanVoices,
  pickVoice,
  saveSpeechSettings,
  speak,
  speechSupported,
  unlockSpeech,
  useSpeechSettings,
  useVoices,
  isNaturalVoice,
} from "@/lib/begleitung/speech";
import { ChoiceCards } from "@/components/einstellungen/settings/SettingsParts";

/** Auf der Mia-Seite: Stimme (aktuelle oben rechts, Auswahl mit Probehören, „Schönere Stimme holen“), Sprechtempo, darunter Vorlesen – gilt für dieses Gerät */
export function VoiceSettings({ profile }: { profile: HouseholdProfile }) {
  const settings = useSpeechSettings();
  const voices = useVoices();
  const supported = speechSupported();
  const [guide, setGuide] = useState(false);
  return (
    <>
      {guide && <VoiceGuideSheet onClose={() => setGuide(false)} onChecked={(found) => (setGuide(false), (found && saveSpeechSettings({ voice: found.voiceURI }), showToast({ text: found ? `Neue Stimme gefunden. Ab jetzt „${voiceLabel(found)}“.` : "Hm, ich finde sie noch nicht. Lädt sie vielleicht noch?" })))} />}
      {(() => {
        const gender = profile.helper.voice;
        const german = germanVoices(voices);
        const auto = pickVoice(voices, gender);
        const sample = "Moin! Heute gibt’s Spaghetti. Um 18:30 ist alles fertig.";
        const listen = (voiceURI: string) => {
          unlockSpeech();
          speak(sample, { id: "probe", gender, voice: voiceURI });
        };
        if (!supported) {
          return <p className="px-1 text-base text-muted">Dieser Browser kann leider nicht vorlesen – alles andere funktioniert wie immer.</p>;
        }
        const options = [
          {
            uri: "",
            label: "Automatisch",
            hint: auto ? auto.name : "Die Standardstimme des Geräts",
            natural: auto ? isNaturalVoice(auto) : false,
          },
          // Natürlichere Stimmen stehen schon oben (germanVoices sortiert)
          ...german.map((v) => ({ uri: v.voiceURI, label: v.name, hint: v.lang.replace("_", "-"), natural: isNaturalVoice(v) })),
        ];
        const current = german.find((v) => v.voiceURI === settings.voice) ?? auto;
        return (
          <>
            <div className="mt-2 flex items-baseline justify-between gap-3 px-1">
              <h2 className={SECTION_TITLE}>Stimme</h2>
              {current && (
                <span className="min-w-0 truncate text-sm text-muted">
                  {voiceLabel(current)}
                  {isNaturalVoice(current) ? " (Premium)" : ""}
                </span>
              )}
            </div>
            <button type="button" onClick={() => listen(settings.voice)} className={`${buttonClass("secondary", "md")} w-full`}>
              <Play className="h-4 w-4" strokeWidth={2.5} aria-hidden /> Probe hören
            </button>
            {!goodVoice(voices) && voices.length > 0 && (
              <button type="button" onClick={() => setGuide(true)} className="flex items-center gap-3 rounded-card bg-accent-soft px-4 py-3 text-left" data-schoener-klingen>
                <Sparkles className="h-5 w-5 shrink-0 text-accent-strong" strokeWidth={2.25} aria-hidden />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-[15px] font-bold">{`${helperName(profile)} kann schöner klingen`}</span>
                  <span className="text-sm text-muted">Einmal eine bessere Stimme laden. Ich zeig dir, wie.</span>
                </span>
              </button>
            )}
            <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Stimme">
              {options.map((o) => {
                const chosen = settings.voice === o.uri || (o.uri === "" && !german.some((v) => v.voiceURI === settings.voice));
                return (
                  <li key={o.uri || "auto"} className={`flex min-h-14 items-center gap-2 rounded-field border pl-4 pr-2 ${chosen ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => saveSpeechSettings({ voice: o.uri })}
                      className="flex min-w-0 flex-1 flex-col py-3 text-left"
                    >
                      <span className={`truncate text-base font-bold ${chosen ? "text-accent-strong" : "text-ink"}`}>{o.label}</span>
                      <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                        {o.natural && <NaturalTag />}
                        <span className="truncate">{o.hint}</span>
                      </span>
                    </button>
                    {chosen && <Check className="h-5 w-5 shrink-0 text-accent" strokeWidth={2.5} aria-hidden />}
                    <button
                      type="button"
                      onClick={() => listen(o.uri)}
                      aria-label={`Probehören: ${o.label}`}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent-strong active:bg-accent-soft"
                    >
                      <Volume2 className="h-5 w-5" strokeWidth={2} aria-hidden />
                    </button>
                  </li>
                );
              })}
            </ul>
            {german.length === 0 && voices.length > 0 && (
              <p className="px-1 text-sm text-muted">Auf diesem Gerät finde ich keine deutsche Stimme – ich nehme die Standardstimme.</p>
            )}

            <h2 className={`mt-2 px-1 ${SECTION_TITLE}`}>Wie schnell?</h2>
            <ChoiceCards label="Sprechtempo" value={settings.rate} onChange={(rate) => saveSpeechSettings({ rate })} options={SPEECH_RATES} />
            <p className="px-1 text-sm text-muted" role="status">
              Stimme und Tempo gelten nur auf diesem Gerät.
            </p>

            <h2 className={`mt-2 px-1 ${SECTION_TITLE}`}>Vorlesen</h2>
            <ChoiceCards label="Vorlesen" value={settings.mode} onChange={(mode) => saveSpeechSettings({ mode })} options={READ_MODES} />
          </>
        );
      })()}
    </>
  );
}

/** Kennzeichen für Premium-/Enhanced-/Erweitert-Stimmen */
function NaturalTag() {
  return <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">natürlicher</span>;
}
