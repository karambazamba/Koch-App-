"use client";

import { Check, Volume2 } from "lucide-react";
import { helperName } from "@/lib/einstellungen/profile";
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
} from "@/lib/lotte/speech";
import { ChoiceCards, SettingsPage } from "./SettingsParts";

/** /profil/vorlesen: Vorlesen an/aus, Stimme (mit Probehören), Sprechtempo – gilt für dieses Gerät */
export function ReadingView() {
  const settings = useSpeechSettings();
  const voices = useVoices();
  const supported = speechSupported();
  return (
    <SettingsPage title="Vorlesen" question="Soll ich meine Antworten vorlesen?" note={false}>
      {(profile) => {
        const name = helperName(profile);
        const gender = profile.helper.voice;
        const german = germanVoices(voices);
        const auto = pickVoice(voices, gender);
        const sample = `Hallo, ich bin ${name}. Heute gibt’s Spaghetti – um 18:30 ist alles fertig.`;
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
        return (
          <>
            <ChoiceCards label="Vorlesen" value={settings.mode} onChange={(mode) => saveSpeechSettings({ mode })} options={READ_MODES} />

            <p className="mt-2 px-1 text-lg font-bold">Welche Stimme?</p>
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
            <p className="px-1 text-sm text-muted">
              Natürlichere Stimmen kannst du im iPhone unter Einstellungen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch laden.
            </p>

            <p className="mt-2 px-1 text-lg font-bold">Wie schnell?</p>
            <ChoiceCards label="Sprechtempo" value={settings.rate} onChange={(rate) => saveSpeechSettings({ rate })} options={SPEECH_RATES} />
            <p className="px-1 text-sm text-muted" role="status">
              Gilt sofort – nur auf diesem Gerät.
            </p>
          </>
        );
      }}
    </SettingsPage>
  );
}

/** Kennzeichen für Premium-/Enhanced-/Erweitert-Stimmen */
function NaturalTag() {
  return <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent-strong">natürlicher</span>;
}
