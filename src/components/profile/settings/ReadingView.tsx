"use client";

import { useState } from "react";
import { Check, ChevronDown, Volume2 } from "lucide-react";
import { helperName } from "@/lib/profile";
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
  voiceQuality,
  type VoiceQuality,
} from "@/lib/speech";
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
        const sample = `Hallo, ich bin ${name}. Heute gibt's Spaghetti – um 18:30 ist alles fertig.`;
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
            quality: auto ? voiceQuality(auto) : null,
          },
          ...german.map((v) => ({ uri: v.voiceURI, label: v.name, hint: v.lang.replace("_", "-"), quality: voiceQuality(v) as VoiceQuality | null })),
        ];
        // Klingt die beste Stimme nur "einfach"? Dann zeigen, wie man eine bessere lädt
        const best = german[0] ? voiceQuality(german[0]) : null;
        return (
          <>
            <ChoiceCards label="Vorlesen" value={settings.mode} onChange={(mode) => saveSpeechSettings({ mode })} options={READ_MODES} />

            <p className="mt-2 px-1 text-lg font-bold">Welche Stimme?</p>
            <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Stimme">
              {options.map((o) => {
                const chosen = settings.voice === o.uri || (o.uri === "" && !german.some((v) => v.voiceURI === settings.voice));
                return (
                  <li key={o.uri || "auto"} className={`flex min-h-14 items-center gap-2 rounded-xl border pl-4 pr-2 ${chosen ? "border-accent bg-accent-soft" : "border-line bg-surface"}`}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      onClick={() => saveSpeechSettings({ voice: o.uri })}
                      className="flex min-w-0 flex-1 flex-col py-3 text-left"
                    >
                      <span className={`truncate text-base font-bold ${chosen ? "text-accent-strong" : "text-ink"}`}>{o.label}</span>
                      <span className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
                        {o.quality && o.quality !== "effekt" && <QualityTag quality={o.quality} />}
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
            <BetterVoiceHelp open={best !== "natuerlich"} />

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

const QUALITY_LABEL: Record<Exclude<VoiceQuality, "effekt">, string> = { natuerlich: "Natürlich", gut: "Gut", einfach: "Einfach" };

function QualityTag({ quality }: { quality: Exclude<VoiceQuality, "effekt"> }) {
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${quality === "natuerlich" ? "bg-accent-soft text-accent-strong" : "bg-background text-muted"}`}>
      {QUALITY_LABEL[quality]}
    </span>
  );
}

type Platform = "iphone" | "android" | "mac" | "windows" | "andere";

function platform(): Platform {
  if (typeof navigator === "undefined") return "andere";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "iphone";
  if (/Android/.test(ua)) return "android";
  if (/Macintosh/.test(ua)) return "mac";
  if (/Windows/.test(ua)) return "windows";
  return "andere";
}

const HELP: Record<Platform, { title: string; steps: string[] }> = {
  iphone: {
    title: "iPhone / iPad",
    steps: [
      "Einstellungen öffnen → Bedienungshilfen → Gesprochene Inhalte → Stimmen → Deutsch.",
      "Eine Stimme mit „Premium“ oder „Erweitert“ laden, z. B. Anna oder Helena.",
      "App einmal ganz schließen und wieder öffnen – ich nehme dann automatisch die neue Stimme.",
    ],
  },
  android: {
    title: "Android",
    steps: [
      "Einstellungen öffnen → System → Sprache (& Eingabe) → Sprachausgabe.",
      "„Sprachausgabe von Google“ wählen und unter Sprachdaten „Deutsch“ installieren – am besten mit WLAN.",
      "Dort eine Stimme wählen, die dir gefällt, dann Chrome neu öffnen.",
    ],
  },
  mac: {
    title: "Mac",
    steps: [
      "Systemeinstellungen → Bedienungshilfen → Gesprochene Inhalte → Systemstimme → Stimmen verwalten.",
      "Unter Deutsch eine Stimme mit „Premium“ laden, z. B. Anna.",
      "Browser neu öffnen.",
    ],
  },
  windows: {
    title: "Windows",
    steps: ["Am natürlichsten klinge ich in Microsoft Edge – dort gibt es Online-Stimmen wie Katja oder Conrad (Natural)."],
  },
  andere: { title: "Dein Gerät", steps: ["In den Einstellungen des Geräts unter Sprachausgabe eine deutsche Stimme in hoher Qualität laden."] },
};

/** Anleitung: so klingt Lotte natürlicher (eigenes Gerät zuerst) */
function BetterVoiceHelp({ open: startOpen }: { open: boolean }) {
  // Folgt der (verzögert geladenen) Stimmenliste, bis selbst auf- oder zugeklappt wird
  const [toggled, setToggled] = useState<boolean | null>(null);
  const open = toggled ?? startOpen;
  const mine = platform();
  const help = HELP[mine];
  return (
    <section className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4 shadow-card" aria-label="Natürlichere Stimme">
      <button type="button" onClick={() => setToggled(!open)} aria-expanded={open} className="flex items-center justify-between gap-2 text-left">
        <span className="text-base font-bold">So klinge ich natürlicher</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} strokeWidth={2} aria-hidden />
      </button>
      {open && (
        <>
          <p className="text-sm text-muted">
            Ich nutze die Stimmen deines Geräts. Die vorinstallierten klingen oft etwas nach Computer – eine bessere Stimme ist kostenlos und schnell geladen.
          </p>
          <p className="text-sm font-bold">{help.title}</p>
          <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
            {help.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
